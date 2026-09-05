import django_filters
from apps.deals.models import Deal, DealStage


class DealFilter(django_filters.FilterSet):
    stage = django_filters.ChoiceFilter(choices=DealStage.choices)
    owner = django_filters.NumberFilter(field_name="owner_id")
    company = django_filters.NumberFilter(field_name="company_id")
    min_value = django_filters.NumberFilter(field_name="value", lookup_expr="gte")
    max_value = django_filters.NumberFilter(field_name="value", lookup_expr="lte")
    expected_close_after = django_filters.DateFilter(
        field_name="expected_close_date", lookup_expr="gte"
    )
    expected_close_before = django_filters.DateFilter(
        field_name="expected_close_date", lookup_expr="lte"
    )
    is_closed = django_filters.BooleanFilter(method="filter_is_closed")

    class Meta:
        model = Deal
        fields = [
            "stage",
            "owner",
            "company",
            "min_value",
            "max_value",
            "expected_close_after",
            "expected_close_before",
            "is_closed",
        ]

    def filter_is_closed(self, queryset, name, value):
        if value is True:
            return queryset.filter(stage__in=[DealStage.WON, DealStage.LOST])
        elif value is False:
            return queryset.exclude(stage__in=[DealStage.WON, DealStage.LOST])
        return queryset
