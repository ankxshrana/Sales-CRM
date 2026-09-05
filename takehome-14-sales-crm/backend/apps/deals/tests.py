from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.companies.models import Company
from apps.deals.models import Deal, DealHistory, DealStage
from apps.deals.services import reopen_deal, transition_deal_stage

User = get_user_model()


@pytest.mark.django_db
class TestDealsServiceAndTransitions:
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
    def rep_user(self):
        return User.objects.create_user(
            email="rep@crm.local",
            password="password123",
            first_name="Bob",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def company(self, rep_user):
        return Company.objects.create(
            name="Acme Corp",
            industry="Software",
            website="https://acme.com",
            owner=rep_user,
        )

    @pytest.fixture
    def deal(self, company, rep_user):
        return Deal.objects.create(
            title="Enterprise Subscription",
            company=company,
            owner=rep_user,
            stage=DealStage.NEW,
            value=Decimal("75000.50"),
            expected_close_date=timezone.localdate() + timezone.timedelta(days=30),
        )

    def test_decimal_precision(self, deal):
        assert isinstance(deal.value, Decimal)
        assert deal.value == Decimal("75000.50")

    def test_forward_stage_transitions(self, deal, rep_user):
        # NEW -> QUALIFIED
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        assert deal.stage == DealStage.QUALIFIED
        assert deal.history.count() == 1

        # QUALIFIED -> PROPOSAL
        deal = transition_deal_stage(deal, DealStage.PROPOSAL, rep_user)
        assert deal.stage == DealStage.PROPOSAL
        assert deal.history.count() == 2

        # PROPOSAL -> NEGOTIATION
        deal = transition_deal_stage(deal, DealStage.NEGOTIATION, rep_user)
        assert deal.stage == DealStage.NEGOTIATION

        # NEGOTIATION -> WON
        deal = transition_deal_stage(deal, DealStage.WON, rep_user)
        assert deal.stage == DealStage.WON
        assert deal.is_closed is True
        assert deal.is_won is True
        assert deal.closed_at is not None

    def test_invalid_forward_jump_rejected(self, deal, rep_user):
        # NEW -> PROPOSAL should fail
        with pytest.raises(ValidationError):
            transition_deal_stage(deal, DealStage.PROPOSAL, rep_user)

    def test_backward_transition_requires_reason(self, deal, rep_user):
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        # QUALIFIED -> NEW without reason should fail
        with pytest.raises(ValidationError, match="reason is required"):
            transition_deal_stage(deal, DealStage.NEW, rep_user, reason="")

        # QUALIFIED -> NEW with reason should succeed
        deal = transition_deal_stage(deal, DealStage.NEW, rep_user, reason="Prospect disqualified budget")
        assert deal.stage == DealStage.NEW

    def test_backward_transition_more_than_one_stage_rejected(self, deal, rep_user):
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        deal = transition_deal_stage(deal, DealStage.PROPOSAL, rep_user)
        # PROPOSAL -> NEW should fail even with reason
        with pytest.raises(ValidationError):
            transition_deal_stage(deal, DealStage.NEW, rep_user, reason="Resetting deal")

    def test_closed_deal_cannot_change_stage_without_reopening(self, deal, rep_user):
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        deal = transition_deal_stage(deal, DealStage.PROPOSAL, rep_user)
        deal = transition_deal_stage(deal, DealStage.NEGOTIATION, rep_user)
        deal = transition_deal_stage(deal, DealStage.WON, rep_user)

        with pytest.raises(ValidationError, match="Closed deals cannot change stage"):
            transition_deal_stage(deal, DealStage.NEGOTIATION, rep_user)

    def test_reopen_deal_permissions(self, deal, rep_user, manager_user):
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        deal = transition_deal_stage(deal, DealStage.PROPOSAL, rep_user)
        deal = transition_deal_stage(deal, DealStage.NEGOTIATION, rep_user)
        deal = transition_deal_stage(deal, DealStage.LOST, rep_user)

        # Rep should be forbidden from reopening
        with pytest.raises(PermissionDenied):
            reopen_deal(deal, rep_user, reason="Rep wanting to reopen")

        # Manager should succeed in reopening
        deal = reopen_deal(deal, manager_user, reason="Customer renewed interest")
        assert deal.stage == DealStage.NEGOTIATION
        assert deal.closed_at is None
        assert deal.is_closed is False

    def test_deal_history_is_immutable(self, deal, rep_user):
        deal = transition_deal_stage(deal, DealStage.QUALIFIED, rep_user)
        history_entry = deal.history.first()

        # Attempting to edit history record must raise ValueError
        with pytest.raises(ValueError, match="DealHistory records are immutable"):
            history_entry.notes = "Altered note"
            history_entry.save()

        # Attempting to delete history record must raise ValueError
        with pytest.raises(ValueError, match="DealHistory records are immutable"):
            history_entry.delete()


@pytest.mark.django_db
class TestDealsRolesAndPermissions:
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
    def company(self, rep_user_1):
        return Company.objects.create(
            name="Acme Global",
            industry="Technology",
            owner=rep_user_1,
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

    def test_rep_create_deal_defaults_to_rep(self, client_rep1, company, rep_user_1):
        res = client_rep1.post(
            "/api/v1/deals/",
            {
                "title": "Cloud Migration",
                "company": company.id,
                "stage": DealStage.NEW,
                "value": "45000.00",
                "expected_close_date": "2026-10-15",
            },
            format="json",
        )
        assert res.status_code == 201
        assert res.data["owner"] == rep_user_1.id

    def test_rep_cannot_assign_deal_to_another_owner(self, client_rep1, company, rep_user_2):
        res = client_rep1.post(
            "/api/v1/deals/",
            {
                "title": "Unauthorized Deal",
                "company": company.id,
                "owner": rep_user_2.id,
                "stage": DealStage.NEW,
                "value": "45000.00",
                "expected_close_date": "2026-10-15",
            },
            format="json",
        )
        assert res.status_code == 400
        assert "owner" in res.data

    def test_rep_can_only_see_owned_or_collaborated_deals(
        self, client_rep1, company, rep_user_1, rep_user_2
    ):
        deal1 = Deal.objects.create(
            title="Deal 1",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value="10000.00",
            expected_close_date="2026-10-15",
        )
        deal2 = Deal.objects.create(
            title="Deal 2",
            company=company,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value="20000.00",
            expected_close_date="2026-10-15",
        )

        # Rep 1 only sees deal1
        res = client_rep1.get("/api/v1/deals/")
        assert res.status_code == 200
        ids = [d["id"] for d in res.data.get("results", res.data)]
        assert deal1.id in ids
        assert deal2.id not in ids

        # Rep 1 direct GET to deal2 is 404
        assert client_rep1.get(f"/api/v1/deals/{deal2.id}/").status_code == 404

        # Add Rep 1 as collaborator to deal2
        deal2.collaborators.add(rep_user_1)

        # Rep 1 can now see deal2
        res_after = client_rep1.get("/api/v1/deals/")
        ids_after = [d["id"] for d in res_after.data.get("results", res_after.data)]
        assert deal2.id in ids_after
        assert client_rep1.get(f"/api/v1/deals/{deal2.id}/").status_code == 200

    def test_rep_can_act_on_collaborated_deal(
        self, client_rep1, company, rep_user_1, rep_user_2
    ):
        deal2 = Deal.objects.create(
            title="Deal 2",
            company=company,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value="20000.00",
            expected_close_date="2026-10-15",
        )
        deal2.collaborators.add(rep_user_1)

        # Rep 1 transitions stage forward
        res = client_rep1.post(
            f"/api/v1/deals/{deal2.id}/stage/",
            {"new_stage": DealStage.QUALIFIED},
            format="json",
        )
        assert res.status_code == 200
        deal2.refresh_from_db()
        assert deal2.stage == DealStage.QUALIFIED

    def test_rep_cannot_reassign_deal_owner(
        self, client_rep1, company, rep_user_1, rep_user_2
    ):
        deal = Deal.objects.create(
            title="Deal 1",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value="10000.00",
            expected_close_date="2026-10-15",
        )

        # 1. Rep cannot reassign via PATCH
        res_patch = client_rep1.patch(
            f"/api/v1/deals/{deal.id}/",
            {"owner": rep_user_2.id},
            format="json",
        )
        assert res_patch.status_code == 400
        assert "owner" in res_patch.data

        # 2. Rep cannot reassign via single reassign endpoint
        res_reassign = client_rep1.post(
            f"/api/v1/deals/{deal.id}/reassign/",
            {"new_owner_id": rep_user_2.id},
            format="json",
        )
        assert res_reassign.status_code == 403

        # 3. Rep cannot reassign via bulk reassign endpoint
        res_bulk = client_rep1.post(
            "/api/v1/deals/bulk-reassign/",
            {"deal_ids": [deal.id], "new_owner_id": rep_user_2.id},
            format="json",
        )
        assert res_bulk.status_code == 403

    def test_rep_cannot_reopen_closed_deal(
        self, client_rep1, company, rep_user_1
    ):
        deal = Deal.objects.create(
            title="Closed Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.WON,
            previous_stage=DealStage.NEGOTIATION,
            value="10000.00",
            expected_close_date="2026-10-15",
            closed_at=timezone.now(),
        )

        # 1. Rep cannot call reopen endpoint
        res_reopen = client_rep1.post(
            f"/api/v1/deals/{deal.id}/reopen/",
            {"reason": "Customer changed mind"},
            format="json",
        )
        assert res_reopen.status_code == 403

        # 2. Rep cannot move stage of closed deal via change_stage
        res_stage = client_rep1.post(
            f"/api/v1/deals/{deal.id}/stage/",
            {"new_stage": DealStage.NEGOTIATION},
            format="json",
        )
        assert res_stage.status_code == 400

        # 3. Rep cannot move stage of closed deal via PATCH
        res_patch = client_rep1.patch(
            f"/api/v1/deals/{deal.id}/",
            {"stage": DealStage.NEGOTIATION},
            format="json",
        )
        assert res_patch.status_code == 400

    def test_manager_can_see_and_act_on_all_deals_and_reassign_and_reopen(
        self, client_manager, company, rep_user_1, rep_user_2
    ):
        deal = Deal.objects.create(
            title="Rep 1 Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.WON,
            previous_stage=DealStage.NEGOTIATION,
            value="90000.00",
            expected_close_date="2026-10-15",
            closed_at=timezone.now(),
        )

        # Manager can view deal
        res_get = client_manager.get(f"/api/v1/deals/{deal.id}/")
        assert res_get.status_code == 200

        # Manager reopens deal
        res_reopen = client_manager.post(
            f"/api/v1/deals/{deal.id}/reopen/",
            {"reason": "Manager approved reopening"},
            format="json",
        )
        assert res_reopen.status_code == 200
        deal.refresh_from_db()
        assert deal.is_closed is False
        assert deal.stage == DealStage.NEGOTIATION
        assert deal.history.filter(action="REOPENED").exists()

        # Manager reassigns deal to Rep 2
        res_reassign = client_manager.post(
            f"/api/v1/deals/{deal.id}/reassign/",
            {"new_owner_id": rep_user_2.id},
            format="json",
        )
        assert res_reassign.status_code == 200
        deal.refresh_from_db()
        assert deal.owner == rep_user_2
        assert deal.history.filter(action="OWNER_REASSIGNED").exists()

    def test_deal_value_and_expected_close_date_editable(
        self, client_rep1, client_rep2, client_manager, company, rep_user_1, rep_user_2
    ):
        deal = Deal.objects.create(
            title="Initial Title",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )

        # Rep 1 (owner) updates value and expected_close_date
        res_rep = client_rep1.patch(
            f"/api/v1/deals/{deal.id}/",
            {"value": "15000.00", "expected_close_date": "2026-11-01"},
            format="json",
        )
        assert res_rep.status_code == 200
        deal.refresh_from_db()
        assert deal.value == Decimal("15000.00")
        assert str(deal.expected_close_date) == "2026-11-01"

        # Rep 2 (non-owner, non-collab) cannot edit
        res_rep2_fail = client_rep2.patch(
            f"/api/v1/deals/{deal.id}/",
            {"value": "99999.00"},
            format="json",
        )
        assert res_rep2_fail.status_code in [403, 404]

        # Add Rep 2 as collaborator
        deal.collaborators.add(rep_user_2)
        res_rep2_ok = client_rep2.patch(
            f"/api/v1/deals/{deal.id}/",
            {"value": "20000.00"},
            format="json",
        )
        assert res_rep2_ok.status_code == 200
        deal.refresh_from_db()
        assert deal.value == Decimal("20000.00")

        # Manager can edit
        res_mgr = client_manager.patch(
            f"/api/v1/deals/{deal.id}/",
            {"value": "25000.00", "title": "Updated Title"},
            format="json",
        )
        assert res_mgr.status_code == 200
        deal.refresh_from_db()
        assert deal.value == Decimal("25000.00")
        assert deal.title == "Updated Title"

    def test_deal_delete_permissions(
        self, client_rep1, client_rep2, client_manager, company, rep_user_1, rep_user_2
    ):
        deal1 = Deal.objects.create(
            title="Deal 1",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        deal2 = Deal.objects.create(
            title="Deal 2",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value=Decimal("20000.00"),
            expected_close_date="2026-10-15",
        )

        # Rep 2 (non-owner) cannot delete deal1
        res_rep2_del = client_rep2.delete(f"/api/v1/deals/{deal1.id}/")
        assert res_rep2_del.status_code in [403, 404]
        assert Deal.objects.filter(id=deal1.id).exists()

        # Rep 1 (owner) can delete deal1
        res_rep1_del = client_rep1.delete(f"/api/v1/deals/{deal1.id}/")
        assert res_rep1_del.status_code == 204
        assert not Deal.objects.filter(id=deal1.id).exists()

        # Manager can delete deal2
        res_mgr_del = client_manager.delete(f"/api/v1/deals/{deal2.id}/")
        assert res_mgr_del.status_code == 204
        assert not Deal.objects.filter(id=deal2.id).exists()


@pytest.mark.django_db
class TestDealsFilteringSearchingSortingPagination:
    @pytest.fixture
    def manager_user(self):
        return User.objects.create_user(
            email="mgr_search@crm.local",
            password="password123",
            first_name="Max",
            last_name="Manager",
            role=UserRole.MANAGER,
        )

    @pytest.fixture
    def rep_user(self):
        return User.objects.create_user(
            email="rep_search@crm.local",
            password="password123",
            first_name="Rita",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def client_manager(self, manager_user):
        client = APIClient()
        client.force_authenticate(user=manager_user)
        return client

    def test_search_over_deal_title_and_company_name(
        self, client_manager, manager_user, rep_user
    ):
        comp_google = Company.objects.create(name="Google LLC", owner=manager_user)
        comp_stripe = Company.objects.create(name="Stripe Inc", owner=rep_user)

        deal1 = Deal.objects.create(
            title="Search Engine Infrastructure",
            company=comp_google,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        deal2 = Deal.objects.create(
            title="Payment Gateway Integration",
            company=comp_stripe,
            owner=rep_user,
            stage=DealStage.QUALIFIED,
            value=Decimal("50000.00"),
            expected_close_date="2026-11-01",
        )

        # 1. Search by deal title: "Payment"
        res_title = client_manager.get("/api/v1/deals/?search=Payment")
        assert res_title.status_code == 200
        assert res_title.data["count"] == 1
        assert res_title.data["results"][0]["id"] == deal2.id

        # 2. Search by company name: "Google"
        res_comp = client_manager.get("/api/v1/deals/?search=Google")
        assert res_comp.status_code == 200
        assert res_comp.data["count"] == 1
        assert res_comp.data["results"][0]["id"] == deal1.id

    def test_filters_for_company_stage_and_owner(
        self, client_manager, manager_user, rep_user
    ):
        comp1 = Company.objects.create(name="Company A", owner=manager_user)
        comp2 = Company.objects.create(name="Company B", owner=rep_user)

        d1 = Deal.objects.create(
            title="Deal 1",
            company=comp1,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        d2 = Deal.objects.create(
            title="Deal 2",
            company=comp1,
            owner=rep_user,
            stage=DealStage.PROPOSAL,
            value=Decimal("20000.00"),
            expected_close_date="2026-11-15",
        )
        d3 = Deal.objects.create(
            title="Deal 3",
            company=comp2,
            owner=rep_user,
            stage=DealStage.WON,
            value=Decimal("30000.00"),
            expected_close_date="2026-12-15",
        )

        # Filter by company
        res_c = client_manager.get(f"/api/v1/deals/?company={comp1.id}")
        assert res_c.status_code == 200
        ids_c = [d["id"] for d in res_c.data["results"]]
        assert sorted(ids_c) == sorted([d1.id, d2.id])

        # Filter by stage
        res_s = client_manager.get("/api/v1/deals/?stage=PROPOSAL")
        assert res_s.status_code == 200
        assert res_s.data["count"] == 1
        assert res_s.data["results"][0]["id"] == d2.id

        # Filter by owner
        res_o = client_manager.get(f"/api/v1/deals/?owner={rep_user.id}")
        assert res_o.status_code == 200
        ids_o = [d["id"] for d in res_o.data["results"]]
        assert sorted(ids_o) == sorted([d2.id, d3.id])

        # Combined filter: company=comp1 & owner=rep_user
        res_comb = client_manager.get(f"/api/v1/deals/?company={comp1.id}&owner={rep_user.id}")
        assert res_comb.status_code == 200
        assert res_comb.data["count"] == 1
        assert res_comb.data["results"][0]["id"] == d2.id

    def test_sorting_by_value_close_date_and_last_update(
        self, client_manager, manager_user
    ):
        comp = Company.objects.create(name="Sort Co", owner=manager_user)
        d1 = Deal.objects.create(
            title="Low Value Early Close",
            company=comp,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("1000.00"),
            expected_close_date="2026-09-10",
        )
        d2 = Deal.objects.create(
            title="High Value Late Close",
            company=comp,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("90000.00"),
            expected_close_date="2026-12-31",
        )

        # Update d1 to have a more recent updated_at
        d1.title = "Low Value Early Close Updated"
        d1.save()

        # Sort by value ascending
        res_val_asc = client_manager.get("/api/v1/deals/?ordering=value")
        assert res_val_asc.status_code == 200
        assert res_val_asc.data["results"][0]["id"] == d1.id
        assert res_val_asc.data["results"][1]["id"] == d2.id

        # Sort by value descending
        res_val_desc = client_manager.get("/api/v1/deals/?ordering=-value")
        assert res_val_desc.status_code == 200
        assert res_val_desc.data["results"][0]["id"] == d2.id
        assert res_val_desc.data["results"][1]["id"] == d1.id

        # Sort by expected_close_date ascending
        res_date_asc = client_manager.get("/api/v1/deals/?ordering=expected_close_date")
        assert res_date_asc.status_code == 200
        assert res_date_asc.data["results"][0]["id"] == d1.id

        # Sort by expected_close_date descending
        res_date_desc = client_manager.get("/api/v1/deals/?ordering=-expected_close_date")
        assert res_date_desc.status_code == 200
        assert res_date_desc.data["results"][0]["id"] == d2.id

        # Sort by updated_at descending
        res_upd_desc = client_manager.get("/api/v1/deals/?ordering=-updated_at")
        assert res_upd_desc.status_code == 200
        assert res_upd_desc.data["results"][0]["id"] == d1.id

    def test_server_side_pagination_and_total_matches_count(
        self, client_manager, manager_user
    ):
        comp = Company.objects.create(name="Pagination Co", owner=manager_user)
        for i in range(15):
            Deal.objects.create(
                title=f"Bulk Deal {i:02d}",
                company=comp,
                owner=manager_user,
                stage=DealStage.NEW,
                value=Decimal(f"{(i+1)*1000}.00"),
                expected_close_date="2026-11-20",
            )

        # Request page 1 with page_size=5
        res_p1 = client_manager.get("/api/v1/deals/?page=1&page_size=5")
        assert res_p1.status_code == 200
        assert res_p1.data["count"] == 15
        assert len(res_p1.data["results"]) == 5
        assert res_p1.data["next"] is not None
        assert res_p1.data["previous"] is None

        # Request page 2 with page_size=5
        res_p2 = client_manager.get("/api/v1/deals/?page=2&page_size=5")
        assert res_p2.status_code == 200
        assert res_p2.data["count"] == 15
        assert len(res_p2.data["results"]) == 5
        assert res_p2.data["next"] is not None
        assert res_p2.data["previous"] is not None

        # Request page 3 with page_size=5
        res_p3 = client_manager.get("/api/v1/deals/?page=3&page_size=5")
        assert res_p3.status_code == 200
        assert res_p3.data["count"] == 15
        assert len(res_p3.data["results"]) == 5
        assert res_p3.data["next"] is None
        assert res_p3.data["previous"] is not None


@pytest.mark.django_db
class TestBulkActionsAndPipelineExport:
    @pytest.fixture
    def manager_user(self):
        return User.objects.create_user(
            email="mgr_bulk@crm.local",
            password="password123",
            first_name="Morgan",
            last_name="Manager",
            role=UserRole.MANAGER,
        )

    @pytest.fixture
    def rep_user_1(self):
        return User.objects.create_user(
            email="rep_bulk1@crm.local",
            password="password123",
            first_name="Sam",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def rep_user_2(self):
        return User.objects.create_user(
            email="rep_bulk2@crm.local",
            password="password123",
            first_name="Taylor",
            last_name="Rep",
            role=UserRole.REP,
        )

    @pytest.fixture
    def company(self, manager_user):
        return Company.objects.create(name="Enterprise Global", owner=manager_user)

    @pytest.fixture
    def client_manager(self, manager_user):
        client = APIClient()
        client.force_authenticate(user=manager_user)
        return client

    @pytest.fixture
    def client_rep(self, rep_user_1):
        client = APIClient()
        client.force_authenticate(user=rep_user_1)
        return client

    def test_manager_bulk_advance_with_partial_eligibility(
        self, client_manager, company, manager_user
    ):
        d1 = Deal.objects.create(
            title="Eligible Deal 1",
            company=company,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        d2 = Deal.objects.create(
            title="Eligible Deal 2",
            company=company,
            owner=manager_user,
            stage=DealStage.QUALIFIED,
            value=Decimal("20000.00"),
            expected_close_date="2026-10-15",
        )
        d3 = Deal.objects.create(
            title="Closed Won Deal",
            company=company,
            owner=manager_user,
            stage=DealStage.WON,
            value=Decimal("30000.00"),
            expected_close_date="2026-10-15",
            closed_at=timezone.now(),
        )
        d4 = Deal.objects.create(
            title="Negotiation Deal",
            company=company,
            owner=manager_user,
            stage=DealStage.NEGOTIATION,
            value=Decimal("40000.00"),
            expected_close_date="2026-10-15",
        )

        payload = {"deal_ids": [d1.id, d2.id, d3.id, d4.id, 99999]}
        res = client_manager.post("/api/v1/deals/bulk-advance/", payload, format="json")
        assert res.status_code == 200
        data = res.data
        assert data["total_selected"] == 5
        assert data["succeeded_count"] == 2
        assert data["failed_count"] == 3

        results_by_id = {r["deal_id"]: r for r in data["results"]}
        # Deal 1 succeeded
        assert results_by_id[d1.id]["status"] == "SUCCESS"
        assert results_by_id[d1.id]["to_stage"] == DealStage.QUALIFIED
        d1.refresh_from_db()
        assert d1.stage == DealStage.QUALIFIED

        # Deal 2 succeeded
        assert results_by_id[d2.id]["status"] == "SUCCESS"
        assert results_by_id[d2.id]["to_stage"] == DealStage.PROPOSAL
        d2.refresh_from_db()
        assert d2.stage == DealStage.PROPOSAL

        # Deal 3 rejected (closed)
        assert results_by_id[d3.id]["status"] == "REJECTED"
        assert "closed" in results_by_id[d3.id]["reason"].lower()
        d3.refresh_from_db()
        assert d3.stage == DealStage.WON

        # Deal 4 rejected (negotiation)
        assert results_by_id[d4.id]["status"] == "REJECTED"
        d4.refresh_from_db()
        assert d4.stage == DealStage.NEGOTIATION

        # Deal 99999 rejected (not found)
        assert results_by_id[99999]["status"] == "REJECTED"

    def test_rep_cannot_bulk_advance_or_bulk_reassign(
        self, client_rep, company, rep_user_1, rep_user_2
    ):
        d1 = Deal.objects.create(
            title="Rep Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )

        # Rep cannot bulk advance
        res_adv = client_rep.post(
            "/api/v1/deals/bulk-advance/",
            {"deal_ids": [d1.id]},
            format="json",
        )
        assert res_adv.status_code == 403

        # Rep cannot bulk reassign
        res_reas = client_rep.post(
            "/api/v1/deals/bulk-reassign/",
            {"deal_ids": [d1.id], "new_owner_id": rep_user_2.id},
            format="json",
        )
        assert res_reas.status_code == 403

    def test_manager_bulk_reassign_reports_per_deal(
        self, client_manager, company, rep_user_1, rep_user_2
    ):
        d1 = Deal.objects.create(
            title="Deal A",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        d2 = Deal.objects.create(
            title="Deal B",
            company=company,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value=Decimal("20000.00"),
            expected_close_date="2026-10-15",
        )

        # Bulk reassign both to rep_user_2
        res = client_manager.post(
            "/api/v1/deals/bulk-reassign/",
            {"deal_ids": [d1.id, d2.id, 88888], "new_owner_id": rep_user_2.id},
            format="json",
        )
        assert res.status_code == 200
        data = res.data
        assert data["total_selected"] == 3
        assert data["succeeded_count"] == 2
        assert data["failed_count"] == 1

        results_by_id = {r["deal_id"]: r for r in data["results"]}
        # d1 reassigned
        assert results_by_id[d1.id]["status"] == "SUCCESS"
        d1.refresh_from_db()
        assert d1.owner == rep_user_2

        # d2 already owned by rep_user_2
        assert results_by_id[d2.id]["status"] == "SKIPPED"

        # 88888 not found
        assert results_by_id[88888]["status"] == "REJECTED"

    def test_export_pipeline_csv_contains_stage_weighted_values_and_open_deals(
        self, client_manager, company, manager_user
    ):
        # Open deals
        d_new = Deal.objects.create(
            title="New Deal",
            company=company,
            owner=manager_user,
            stage=DealStage.NEW,
            value=Decimal("10000.00"),
            expected_close_date="2026-10-15",
        )
        d_prop = Deal.objects.create(
            title="Proposal Deal",
            company=company,
            owner=manager_user,
            stage=DealStage.PROPOSAL,
            value=Decimal("50000.00"),
            expected_close_date="2026-11-15",
        )
        # Closed deal
        d_won = Deal.objects.create(
            title="Won Deal",
            company=company,
            owner=manager_user,
            stage=DealStage.WON,
            value=Decimal("100000.00"),
            expected_close_date="2026-08-15",
            closed_at=timezone.now(),
        )

        res = client_manager.get("/api/v1/deals/export/")
        assert res.status_code == 200
        assert "text/csv" in res["Content-Type"]

        content = res.content.decode("utf-8")
        lines = [line for line in content.splitlines() if line.strip()]
        header = lines[0]
        assert "Deal ID" in header
        assert "Stage-Weighted Value (USD)" in header
        assert "Stage Weight" in header

        body = content
        assert "New Deal" in body
        assert "Proposal Deal" in body
        # Won Deal is closed, excluded from open pipeline export by default
        assert "Won Deal" not in body

        # Verify weighted values:
        # NEW is 10% of 10000 = 1000.00
        # PROPOSAL is 60% of 50000 = 30000.00
        assert "1000.00" in body
        assert "30000.00" in body




