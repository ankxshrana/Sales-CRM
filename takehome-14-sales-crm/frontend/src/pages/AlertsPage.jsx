import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../api/alerts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  Bell,
  CheckCircle2,
  Calendar,
  Building2,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from "lucide-react";

export const AlertsPage = () => {
  const queryClient = useQueryClient();

  const { data: alertsData, isLoading, error } = useQuery({
    queryKey: ["alerts-list"],
    queryFn: alertsApi.getAlerts,
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => alertsApi.dismissAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-list"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-count"] });
    },
  });

  const alerts = alertsData?.results || (Array.isArray(alertsData) ? alertsData : []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-500" />
          <span>Actionable Sales Alerts</span>
        </h1>
        <p className="text-sm text-slate-500">
          Open deals with past-due expected close dates requiring immediate follow-up.
        </p>
      </div>

      <Alert
        type="info"
        title="Automated Alert Lifecycle"
        message="Dismissing an alert hides it from your inbox. If the deal's expected close date is updated to a future date and subsequently passes again without closing, the alert will automatically reactivate."
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : alerts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className="border-l-4 border-l-rose-500 hover:border-l-rose-600 transition-all"
            >
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <Link
                      to={`/deals/${alert.deal}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5"
                    >
                      <span>{alert.deal_title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                    <Badge variant={alert.deal_stage} className="text-xs">
                      {alert.deal_stage}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {alert.deal_company}
                    </span>
                    <span className="font-bold text-slate-900">
                      Value: {formatCurrency(alert.deal_value)}
                    </span>
                    <span className="flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                      <Calendar className="h-3.5 w-3.5" />
                      Past Due since: {formatDate(alert.expected_close_date)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Link to={`/deals/${alert.deal}`}>
                    <Button variant="secondary" size="sm">
                      Review Deal
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissMutation.mutate(alert.id)}
                    isLoading={dismissMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-2" />
            <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You have no past-due deals pending action right now. All deals are on track according
              to their scheduled close dates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
