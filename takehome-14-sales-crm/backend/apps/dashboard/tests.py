import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.companies.models import Company
from apps.deals.models import Deal, DealCollaborator, DealStage

User = get_user_model()


@pytest.mark.django_db
class TestDashboardScoping:
    @pytest.fixture
    def manager_user(self):
        return User.objects.create_user(
            email="manager@crm.local",
            password="password123",
            role=UserRole.MANAGER,
        )

    @pytest.fixture
    def rep_user_1(self):
        return User.objects.create_user(
            email="rep1@crm.local",
            password="password123",
            role=UserRole.REP,
        )

    @pytest.fixture
    def rep_user_2(self):
        return User.objects.create_user(
            email="rep2@crm.local",
            password="password123",
            role=UserRole.REP,
        )

    @pytest.fixture
    def company(self, rep_user_1):
        return Company.objects.create(name="Nexus Ltd", owner=rep_user_1)

    def test_dashboard_metrics_scoped_by_role(
        self, manager_user, rep_user_1, rep_user_2, company
    ):
        # Deal owned by Rep 1
        d1 = Deal.objects.create(
            title="Deal 1",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value="10000.00",
            expected_close_date="2026-10-15",
        )
        # Deal owned by Rep 2
        d2 = Deal.objects.create(
            title="Deal 2",
            company=company,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value="20000.00",
            expected_close_date="2026-10-15",
        )
        # Deal owned by Rep 2 with Rep 1 as collaborator
        d3 = Deal.objects.create(
            title="Deal 3",
            company=company,
            owner=rep_user_2,
            stage=DealStage.NEW,
            value="30000.00",
            expected_close_date="2026-10-15",
        )
        DealCollaborator.objects.create(deal=d3, user=rep_user_1)

        # Rep 1 client
        client_rep1 = APIClient()
        client_rep1.force_authenticate(user=rep_user_1)
        res_rep1 = client_rep1.get("/api/v1/dashboard/metrics/")
        assert res_rep1.status_code == status.HTTP_200_OK
        # Rep 1 should see d1 (owned) and d3 (collaborated) = 2 deals, total = 40000.00
        assert res_rep1.data["open_deal_count"] == 2
        assert float(res_rep1.data["total_pipeline_value"]) == 40000.00

        # Manager client
        client_manager = APIClient()
        client_manager.force_authenticate(user=manager_user)
        res_mgr = client_manager.get("/api/v1/dashboard/metrics/")
        assert res_mgr.status_code == status.HTTP_200_OK
        # Manager should see all 3 deals = 60000.00
        assert res_mgr.data["open_deal_count"] == 3
        assert float(res_mgr.data["total_pipeline_value"]) == 60000.00

    def test_dashboard_metrics_headline_stage_owner_and_eight_weeks_trend(
        self, manager_user, rep_user_1, company
    ):
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()
        # Open deals across different stages
        # NEW (10%): $10,000 -> weighted $1,000
        Deal.objects.create(
            title="New Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEW,
            value="10000.00",
            expected_close_date="2026-10-15",
        )
        # QUALIFIED (30%): $20,000 -> weighted $6,000
        Deal.objects.create(
            title="Qualified Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.QUALIFIED,
            value="20000.00",
            expected_close_date="2026-10-20",
        )
        # PROPOSAL (60%): $30,000 -> weighted $18,000
        Deal.objects.create(
            title="Proposal Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.PROPOSAL,
            value="30000.00",
            expected_close_date="2026-11-01",
        )
        # NEGOTIATION (80%): $40,000 -> weighted $32,000
        Deal.objects.create(
            title="Negotiation Deal",
            company=company,
            owner=rep_user_1,
            stage=DealStage.NEGOTIATION,
            value="40000.00",
            expected_close_date="2026-11-15",
        )
        # WON this month (effective closed_at is now)
        Deal.objects.create(
            title="Won Deal This Month",
            company=company,
            owner=rep_user_1,
            stage=DealStage.WON,
            value="50000.00",
            expected_close_date="2026-09-01",
            closed_at=now,
        )
        # LOST this month
        Deal.objects.create(
            title="Lost Deal This Month",
            company=company,
            owner=rep_user_1,
            stage=DealStage.LOST,
            value="15000.00",
            expected_close_date="2026-09-01",
            closed_at=now,
        )
        # WON 3 weeks ago (within 8 weeks)
        three_weeks_ago = now - timedelta(weeks=3)
        Deal.objects.create(
            title="Won Deal 3 Weeks Ago",
            company=company,
            owner=rep_user_1,
            stage=DealStage.WON,
            value="25000.00",
            expected_close_date="2026-08-15",
            closed_at=three_weeks_ago,
        )

        client = APIClient()
        client.force_authenticate(user=manager_user)
        res = client.get("/api/v1/dashboard/metrics/")
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        # 1. Headline numbers
        assert data["open_deal_count"] == 4
        # Total unweighted value = 10k + 20k + 30k + 40k = 100,000.00
        assert float(data["total_pipeline_value"]) == 100000.00
        # Weighted pipeline value = 1k + 6k + 18k + 32k = 57,000.00
        assert float(data["weighted_pipeline_value"]) == 57000.00
        # Won this month: 1 deal ($50,000)
        assert data["deals_won_this_month"]["count"] == 1
        assert float(data["deals_won_this_month"]["total_value"]) == 50000.00
        # Lost this month: 1 deal ($15,000)
        assert data["deals_lost_this_month"]["count"] == 1
        assert float(data["deals_lost_this_month"]["total_value"]) == 15000.00

        # 2. Open deals breakdown by stage
        stages = {s["stage"]: s for s in data["open_deals_by_stage"]}
        assert set(stages.keys()) == {"NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION"}
        assert stages["NEW"]["count"] == 1
        assert float(stages["NEW"]["total_value"]) == 10000.00
        assert float(stages["NEW"]["weighted_value"]) == 1000.00
        assert stages["QUALIFIED"]["count"] == 1
        assert float(stages["QUALIFIED"]["weighted_value"]) == 6000.00
        assert stages["PROPOSAL"]["count"] == 1
        assert float(stages["PROPOSAL"]["weighted_value"]) == 18000.00
        assert stages["NEGOTIATION"]["count"] == 1
        assert float(stages["NEGOTIATION"]["weighted_value"]) == 32000.00

        # 3. Open deals breakdown by owner
        assert len(data["open_deals_by_owner"]) >= 1
        owner_stat = next(o for o in data["open_deals_by_owner"] if o["owner_id"] == rep_user_1.id)
        assert owner_stat["count"] == 4
        assert float(owner_stat["total_value"]) == 100000.00
        assert float(owner_stat["weighted_value"]) == 57000.00

        # 4. Deals won per week over the last eight weeks
        won_weeks = data["deals_won_per_week"]
        assert len(won_weeks) == 8
        total_won_in_8_weeks = sum(w["count"] for w in won_weeks)
        # We had 1 won today + 1 won 3 weeks ago = 2
        assert total_won_in_8_weeks == 2
