import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.companies.models import Company
from apps.deals.models import Deal, DealCollaborator, DealStage

User = get_user_model()


@pytest.mark.django_db
class TestCompaniesRolesAndPermissions:
    @pytest.fixture
    def manager_user(self):
        return User.objects.create_user(
            email="manager@crm.local",
            password="password123",
            first_name="Alice",
            last_name="Manager",
            role=UserRole.MANAGER,
        )

    @pytest.fixture
    def rep_user_1(self):
        return User.objects.create_user(
            email="rep1@crm.local",
            password="password123",
            first_name="Bob",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def rep_user_2(self):
        return User.objects.create_user(
            email="rep2@crm.local",
            password="password123",
            first_name="Charlie",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def client_manager(self, manager_user):
        client = APIClient()
        client.force_authenticate(user=manager_user)
        return client

    @pytest.fixture
    def client_rep1(self, rep_user_1):
        client = APIClient()
        client.force_authenticate(user=rep_user_1)
        return client

    @pytest.fixture
    def client_rep2(self, rep_user_2):
        client = APIClient()
        client.force_authenticate(user=rep_user_2)
        return client

    def test_rep_create_company_defaults_to_rep(self, client_rep1, rep_user_1):
        response = client_rep1.post(
            "/api/v1/companies/",
            {"name": "Rep 1 Corp", "industry": "Technology"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["owner"] == rep_user_1.id
        assert response.data["is_archived"] is False

    def test_rep_cannot_assign_company_to_other_owner(self, client_rep1, rep_user_2):
        response = client_rep1.post(
            "/api/v1/companies/",
            {
                "name": "Spoofed Company",
                "industry": "Finance",
                "owner": rep_user_2.id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "owner" in response.data

    def test_rep_can_only_see_owned_or_collaborated_companies(
        self, client_rep1, client_rep2, rep_user_1, rep_user_2
    ):
        comp1 = Company.objects.create(name="Company One", owner=rep_user_1)
        comp2 = Company.objects.create(name="Company Two", owner=rep_user_2)

        # Rep 1 list should only contain comp1
        res1 = client_rep1.get("/api/v1/companies/")
        assert res1.status_code == status.HTTP_200_OK
        ids1 = [c["id"] for c in res1.data.get("results", res1.data)]
        assert comp1.id in ids1
        assert comp2.id not in ids1

        # Rep 1 direct GET to comp2 must be 404
        res_comp2 = client_rep1.get(f"/api/v1/companies/{comp2.id}/")
        assert res_comp2.status_code == status.HTTP_404_NOT_FOUND

        # When Rep 1 is added as collaborator to a deal belonging to comp2:
        deal2 = Deal.objects.create(
            title="Deal 2",
            company=comp2,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value="50000.00",
            expected_close_date="2026-10-15",
        )
        DealCollaborator.objects.create(deal=deal2, user=rep_user_1, role="CONTRIBUTOR")

        # Rep 1 now can see comp2
        res1_after = client_rep1.get("/api/v1/companies/")
        ids1_after = [c["id"] for c in res1_after.data.get("results", res1_after.data)]
        assert comp1.id in ids1_after
        assert comp2.id in ids1_after

        res_comp2_after = client_rep1.get(f"/api/v1/companies/{comp2.id}/")
        assert res_comp2_after.status_code == status.HTTP_200_OK

    def test_rep_can_archive_and_restore_owned_company(self, client_rep1, rep_user_1):
        comp = Company.objects.create(name="Rep Company", owner=rep_user_1)

        # Rep can archive own company via action endpoint
        res_archive = client_rep1.post(f"/api/v1/companies/{comp.id}/archive/")
        assert res_archive.status_code == status.HTTP_200_OK
        comp.refresh_from_db()
        assert comp.is_archived is True

        # Rep can restore own company via action endpoint
        res_restore = client_rep1.post(f"/api/v1/companies/{comp.id}/restore/")
        assert res_restore.status_code == status.HTTP_200_OK
        comp.refresh_from_db()
        assert comp.is_archived is False

    def test_rep_cannot_archive_or_restore_other_rep_company(
        self, client_rep1, rep_user_2
    ):
        comp = Company.objects.create(name="Other Rep Company", owner=rep_user_2)

        # Rep 1 cannot archive Rep 2's company (returns 404 since Rep 1 cannot access it)
        res_archive = client_rep1.post(f"/api/v1/companies/{comp.id}/archive/")
        assert res_archive.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_companies_list_excludes_archived_by_default(
        self, client_manager, client_rep1, rep_user_1, rep_user_2
    ):
        active_comp = Company.objects.create(name="Active Co", owner=rep_user_1)
        archived_comp = Company.objects.create(
            name="Archived Co", owner=rep_user_1, is_archived=True
        )

        # Rep 1 GET /api/v1/companies/ does NOT show archived by default
        res_rep = client_rep1.get("/api/v1/companies/")
        assert res_rep.status_code == status.HTTP_200_OK
        ids_rep = [c["id"] for c in res_rep.data.get("results", res_rep.data)]
        assert active_comp.id in ids_rep
        assert archived_comp.id not in ids_rep

        # Rep 1 with ?include_archived=true sees both
        res_rep_arch = client_rep1.get("/api/v1/companies/?include_archived=true")
        assert res_rep_arch.status_code == status.HTTP_200_OK
        ids_rep_arch = [c["id"] for c in res_rep_arch.data.get("results", res_rep_arch.data)]
        assert active_comp.id in ids_rep_arch
        assert archived_comp.id in ids_rep_arch

        # Manager GET /api/v1/companies/ does NOT show archived by default either
        res_mgr = client_manager.get("/api/v1/companies/")
        assert res_mgr.status_code == status.HTTP_200_OK
        ids_mgr = [c["id"] for c in res_mgr.data.get("results", res_mgr.data)]
        assert active_comp.id in ids_mgr
        assert archived_comp.id not in ids_mgr

        # Manager with ?include_archived=true sees both
        res_mgr_arch = client_manager.get("/api/v1/companies/?include_archived=true")
        assert res_mgr_arch.status_code == status.HTTP_200_OK
        ids_mgr_arch = [c["id"] for c in res_mgr_arch.data.get("results", res_mgr_arch.data)]
        assert active_comp.id in ids_mgr_arch
        assert archived_comp.id in ids_mgr_arch

    def test_manager_can_see_and_archive_restore_all_companies(
        self, client_manager, rep_user_1, rep_user_2
    ):
        comp1 = Company.objects.create(name="Alpha Co", owner=rep_user_1)
        comp2 = Company.objects.create(name="Beta Co", owner=rep_user_2)

        # Manager sees all companies
        res = client_manager.get("/api/v1/companies/")
        assert res.status_code == status.HTTP_200_OK
        ids = [c["id"] for c in res.data.get("results", res.data)]
        assert comp1.id in ids
        assert comp2.id in ids

        # Manager archives comp1
        res_arch = client_manager.post(f"/api/v1/companies/{comp1.id}/archive/")
        assert res_arch.status_code == status.HTTP_200_OK
        comp1.refresh_from_db()
        assert comp1.is_archived is True

        # Manager restores comp1
        res_rest = client_manager.post(f"/api/v1/companies/{comp1.id}/restore/")
        assert res_rest.status_code == status.HTTP_200_OK
        comp1.refresh_from_db()
        assert comp1.is_archived is False
