import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { formatCurrency, cn } from "../lib/utils";
import {
  Briefcase,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Users,
  Loader2,
  ArrowRight,
  BarChart3,
  Layers,
  Calendar,
  DollarSign,
  Percent,
  Sparkles,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const STAGE_COLORS = {
  NEW: "#0ea5e9", // sky-500
  QUALIFIED: "#6366f1", // indigo-500
  PROPOSAL: "#8b5cf6", // violet-500
  NEGOTIATION: "#f59e0b", // amber-500
};

export const DashboardPage = () => {
  const [winChartMetric, setWinChartMetric] = useState("count"); // "count" | "revenue"

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: dashboardApi.getMetrics,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        Failed to load dashboard metrics: {error.message}
      </div>
    );
  }

  const openDealsCount = data?.open_deal_count ?? 0;
  const totalPipelineVal = parseFloat(data?.total_pipeline_value || 0);
  const weightedPipelineVal = parseFloat(data?.weighted_pipeline_value || 0);

  const wonThisMonthCount = data?.deals_won_this_month?.count ?? 0;
  const wonThisMonthVal = parseFloat(data?.deals_won_this_month?.total_value || 0);

  const lostThisMonthCount = data?.deals_lost_this_month?.count ?? 0;
  const lostThisMonthVal = parseFloat(data?.deals_lost_this_month?.total_value || 0);

  const stageBreakdown = data?.open_deals_by_stage || [];
  const ownerBreakdown = data?.open_deals_by_owner || [];
  const wonPerWeek = data?.deals_won_per_week || [];

  const totalWon8WeeksCount = wonPerWeek.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const totalWon8WeeksVal = wonPerWeek.reduce((acc, curr) => acc + parseFloat(curr.total_value || 0), 0);

  // Headline KPI Cards
  const headlineKpis = [
    {
      id: "open-deals",
      title: "Open Deals",
      value: openDealsCount,
      subtext: `Unweighted: ${formatCurrency(totalPipelineVal)}`,
      badge: `${stageBreakdown.length} active stages`,
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-100",
      accent: "bg-blue-500",
    },
    {
      id: "weighted-pipeline",
      title: "Weighted Pipeline",
      value: formatCurrency(weightedPipelineVal),
      subtext: `Probability-adjusted (${totalPipelineVal > 0 ? Math.round((weightedPipelineVal / totalPipelineVal) * 100) : 0}% of unweighted)`,
      badge: "Stage weighted",
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
      accent: "bg-indigo-500",
    },
    {
      id: "won-this-month",
      title: "Deals Won This Month",
      value: wonThisMonthCount,
      subtext: `${formatCurrency(wonThisMonthVal)} closed revenue`,
      badge: "Current Month",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
      accent: "bg-emerald-500",
    },
    {
      id: "lost-this-month",
      title: "Deals Lost This Month",
      value: lostThisMonthCount,
      subtext: `${formatCurrency(lostThisMonthVal)} missed revenue`,
      badge: "Current Month",
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50 border-rose-100",
      accent: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              Live Pipeline Overview
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time headline metrics, stage-weighted revenue forecasts, and 8-week win velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/deals">
            <Button variant="secondary" size="sm">
              <span>View Deals Table</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Headline Numbers: 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {headlineKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.id} className="relative overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.accent}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {kpi.title}
                    </span>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.bg}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">{kpi.subtext}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 ml-1">
                    {kpi.badge}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2. Charts Section: Stage Breakdown & 8-Week Win Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Deals Broken Down by Stage */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Open Deals by Stage</span>
              </CardTitle>
              <Badge variant="primary" className="text-xs font-semibold">
                {openDealsCount} Open Deals
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown across active pipeline stages with probability-weighted valuations.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Stage Bar Chart */}
            <div className="h-56">
              {stageBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageBreakdown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(lbl, idx) => {
                        const item = stageBreakdown[idx];
                        return `${lbl} (${item?.weight_pct || ""})`;
                      }}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl space-y-1">
                              <p className="font-bold text-sm text-indigo-300">
                                {item.label} Stage ({item.weight_pct} weight)
                              </p>
                              <p className="text-slate-300">
                                Deals: <strong className="text-white">{item.count}</strong>
                              </p>
                              <p className="text-slate-300">
                                Value: <strong className="text-white">{formatCurrency(item.total_value)}</strong>
                              </p>
                              <p className="text-slate-300">
                                Weighted Value:{" "}
                                <strong className="text-emerald-400">{formatCurrency(item.weighted_value)}</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stageBreakdown.map((entry) => (
                        <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No open deals currently in the pipeline.
                </div>
              )}
            </div>

            {/* Stage Itemized Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {stageBreakdown.map((stg) => {
                const pctOfPipeline =
                  totalPipelineVal > 0 ? Math.round((parseFloat(stg.total_value) / totalPipelineVal) * 100) : 0;
                return (
                  <Link
                    key={stg.stage}
                    to={`/deals?stage=${stg.stage}`}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60 block group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                        {stg.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {stg.weight_pct}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-sm font-extrabold text-slate-900">{stg.count} deals</span>
                      <span className="text-[11px] text-slate-500">{pctOfPipeline}%</span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5 truncate">
                      {formatCurrency(stg.weighted_value)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 8-Week Deals Won Trend Chart */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Deals Won (Last 8 Weeks)</span>
              </CardTitle>
              {/* Metric Toggle */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setWinChartMetric("count")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors",
                    winChartMetric === "count"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Count ({totalWon8WeeksCount})
                </button>
                <button
                  onClick={() => setWinChartMetric("revenue")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors",
                    winChartMetric === "revenue"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Revenue (${Math.round(totalWon8WeeksVal / 1000)}k)
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly closed-won performance over the previous eight consecutive weeks.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="h-56">
              {wonPerWeek.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wonPerWeek} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                      tickFormatter={(val) => (winChartMetric === "revenue" ? `$${val >= 1000 ? `${Math.round(val / 1000)}k` : val}` : val)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl space-y-1">
                              <p className="font-bold text-sm text-emerald-400">Week of {item.label}</p>
                              <p className="text-slate-300">
                                Deals Won: <strong className="text-white">{item.count}</strong>
                              </p>
                              <p className="text-slate-300">
                                Revenue Won: <strong className="text-white">{formatCurrency(item.total_value)}</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={winChartMetric === "count" ? "count" : (item) => parseFloat(item.total_value || 0)}
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No deal activity in the last 8 weeks.
                </div>
              )}
            </div>

            {/* 8-Week Summary Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>8-Week Total Closed Won:</span>
              </span>
              <span className="font-extrabold text-emerald-900">
                {totalWon8WeeksCount} deals &bull; {formatCurrency(totalWon8WeeksVal)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Open Deals Broken Down by Owner */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Open Deals by Sales Owner</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribution of open deal opportunities and stage-weighted pipeline value across representatives.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {ownerBreakdown.length} {ownerBreakdown.length === 1 ? "Owner" : "Owners"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {ownerBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Sales Owner</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3 text-center">Open Deals</th>
                    <th className="px-6 py-3 text-right">Unweighted Value</th>
                    <th className="px-6 py-3 text-right">Weighted Value</th>
                    <th className="px-6 py-3 w-32">Share</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownerBreakdown.map((rep) => {
                    const sharePct =
                      totalPipelineVal > 0
                        ? Math.round((parseFloat(rep.total_value) / totalPipelineVal) * 100)
                        : 0;
                    return (
                      <tr key={rep.owner_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {rep.name ? rep.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="truncate">{rep.name}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{rep.email}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="bg-slate-100 font-bold text-slate-800">
                            {rep.count} deals
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(rep.total_value)}
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-indigo-600">
                          {formatCurrency(rep.weighted_value)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 font-medium">{sharePct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/deals?owner=${rep.owner_id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <span>Deals</span>
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              No open deals currently assigned to sales owners.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
