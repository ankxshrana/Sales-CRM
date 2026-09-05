import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi } from "../api/companies";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  Building2,
  ExternalLink,
  ArrowLeft,
  Archive,
  RotateCcw,
  Briefcase,
  Loader2,
} from "lucide-react";

export const CompanyDetailPage = () => {
  const { id } = useParams();
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["company", id],
    queryFn: () => companiesApi.getCompany(id),
  });

  const canArchive = isManager || (company && user && company.owner === user.id);

  const archiveMutation = useMutation({
    mutationFn: () => companiesApi.archiveCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company", id] }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => companiesApi.restoreCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company", id] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        Failed to load company details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/companies"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
        Back to Companies
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {company.name}
            </h1>
            {company.is_archived ? (
              <Badge variant="warning">Archived</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Industry: {company.industry || "Not specified"}</p>
        </div>

        {canArchive && (
          <div>
            {company.is_archived ? (
              <Button
                variant="secondary"
                onClick={() => restoreMutation.mutate()}
                isLoading={restoreMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Company
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => archiveMutation.mutate()}
                isLoading={archiveMutation.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Company
              </Button>
            )}
          </div>
        )}

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Company Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Website</span>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1 font-medium mt-0.5"
                >
                  <span>{company.website}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-500 mt-0.5 block">—</span>
              )}
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Owner Rep</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {company.owner_details?.full_name || company.owner_details?.email}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Created</span>
              <span className="text-slate-600 mt-0.5 block">{formatDate(company.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <span>Pipeline Deals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              This organization has <strong>{company.deals_count || 0}</strong> deals associated with it.
            </p>
            <div className="mt-4">
              <Link to={`/deals?company=${company.id}`}>
                <Button variant="secondary" size="sm">
                  View Deals for {company.name}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
