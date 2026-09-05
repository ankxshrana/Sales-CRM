from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.alerts.models import AlertType, DealAlert
from apps.companies.models import Company
from apps.deals.models import Deal, DealHistory, DealHistoryAction, DealStage


class Command(BaseCommand):
    help = "Seeds demonstration data including users, companies, deals, history, and alerts."

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo CRM data...")

        # 1. Create Users
        manager, _ = User.objects.get_or_create(
            email="manager@example.com",
            defaults={
                "first_name": "Marcus",
                "last_name": "Vance",
                "role": UserRole.MANAGER,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        manager.set_password("password123")
        manager.save()

        rep1, _ = User.objects.get_or_create(
            email="rep@example.com",
            defaults={
                "first_name": "Jordan",
                "last_name": "Hayes",
                "role": UserRole.REP,
            },
        )
        rep1.set_password("password123")
        rep1.save()

        rep2, _ = User.objects.get_or_create(
            email="sarah@example.com",
            defaults={
                "first_name": "Sarah",
                "last_name": "Connor",
                "role": UserRole.REP,
            },
        )
        rep2.set_password("password123")
        rep2.save()

        self.stdout.write(self.style.SUCCESS("Created demo users: manager@example.com and rep@example.com (password: password123)"))

        # 2. Create Companies
        comp_acme, _ = Company.objects.get_or_create(
            name="Acme Corporation",
            defaults={
                "industry": "Manufacturing & Logistics",
                "website": "https://acme-logistics.example.com",
                "owner": rep1,
            },
        )

        comp_apex, _ = Company.objects.get_or_create(
            name="Apex Technologies",
            defaults={
                "industry": "Enterprise Cloud SaaS",
                "website": "https://apexcloud.example.com",
                "owner": rep1,
            },
        )

        comp_solaria, _ = Company.objects.get_or_create(
            name="Solaria Health Systems",
            defaults={
                "industry": "Healthcare & Biotech",
                "website": "https://solariahealth.example.com",
                "owner": rep2,
            },
        )

        comp_fin, _ = Company.objects.get_or_create(
            name="Vanguard Global Capital",
            defaults={
                "industry": "Investment & FinTech",
                "website": "https://vanguardglobal.example.com",
                "owner": rep2,
            },
        )

        self.stdout.write(self.style.SUCCESS("Created demo companies."))

        # 3. Create Deals
        today = timezone.localdate()
        now = timezone.now()

        deals_data = [
            {
                "title": "Cloud Infrastructure Migration",
                "company": comp_apex,
                "owner": rep1,
                "stage": DealStage.PROPOSAL,
                "value": Decimal("125000.00"),
                "expected_close_date": today + timedelta(days=25),
            },
            {
                "title": "Enterprise Fleet Monitoring ERP",
                "company": comp_acme,
                "owner": rep1,
                "stage": DealStage.NEGOTIATION,
                "value": Decimal("85000.50"),
                "expected_close_date": today + timedelta(days=12),
            },
            {
                "title": "Hospital Patient Portal System",
                "company": comp_solaria,
                "owner": rep2,
                "stage": DealStage.QUALIFIED,
                "value": Decimal("64000.00"),
                "expected_close_date": today + timedelta(days=45),
            },
            {
                "title": "AI Algorithmic Compliance Engine",
                "company": comp_fin,
                "owner": rep2,
                "stage": DealStage.NEW,
                "value": Decimal("180000.00"),
                "expected_close_date": today + timedelta(days=60),
            },
            {
                "title": "Telehealth API Integration",
                "company": comp_solaria,
                "owner": rep2,
                "stage": DealStage.WON,
                "value": Decimal("92000.00"),
                "expected_close_date": today - timedelta(days=10),
                "closed_at": now - timedelta(days=10),
            },
            {
                "title": "Legacy Database Archival Project",
                "company": comp_acme,
                "owner": rep1,
                "stage": DealStage.LOST,
                "value": Decimal("35000.00"),
                "expected_close_date": today - timedelta(days=15),
                "closed_at": now - timedelta(days=15),
            },
            {
                "title": "Past-Due Security Hardening Retainer",
                "company": comp_apex,
                "owner": rep1,
                "stage": DealStage.NEGOTIATION,
                "value": Decimal("48500.00"),
                "expected_close_date": today - timedelta(days=5),  # Past due!
            },
        ]

        for d_data in deals_data:
            deal, created = Deal.objects.get_or_create(
                title=d_data["title"],
                company=d_data["company"],
                defaults={
                    "owner": d_data["owner"],
                    "stage": d_data["stage"],
                    "value": d_data["value"],
                    "expected_close_date": d_data["expected_close_date"],
                    "closed_at": d_data.get("closed_at"),
                },
            )
            if created:
                DealHistory.objects.create(
                    deal=deal,
                    user=d_data["owner"],
                    action=DealHistoryAction.CREATED,
                    to_stage=deal.stage,
                    notes="Initial creation via demo data seeder",
                )

        # 4. Generate Past-Due Alert
        past_due_deal = Deal.objects.filter(expected_close_date__lt=today, stage=DealStage.NEGOTIATION).first()
        if past_due_deal:
            DealAlert.objects.get_or_create(
                deal=past_due_deal,
                user=past_due_deal.owner,
                alert_type=AlertType.PAST_DUE,
                defaults={
                    "is_dismissed": False,
                    "last_expected_close_date": past_due_deal.expected_close_date,
                },
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded demo CRM database."))
