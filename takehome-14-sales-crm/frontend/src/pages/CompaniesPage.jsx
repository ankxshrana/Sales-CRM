import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi } from "../api/companies";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Archive,
  RotateCcw,
  Loader2,
} from "lucide-react";

export const CompaniesPage = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newCompany, setNewCompany] = useState({ name: "", industry: "", website: "" });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies", { search, includeArchived }],
    queryFn: () =>
      companiesApi.getCompanies({
        search: search || undefined,
        include_archived: includeArchived,
      }),
  });

  const createMutation = useMutation({
    mutationFn: companiesApi.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      setIsCreateOpen(false);
      setCreateError("");
      setNewCompany({ name: "", industry: "", website: "" });
    },
    onError: (err) => {
      const errorMsg =
        err.response?.data?.detail ||
        (typeof err.response?.data === "object"
          ? Object.entries(err.response.data)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
              .join(" | ")
          : null) ||
        err.message ||
        "Failed to create company.";
      setCreateError(errorMsg);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: companiesApi.archiveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: companiesApi.restoreCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateError("");
    if (!newCompany.name.trim()) {
      setCreateError("Company name is required.");
      return;
    }
    createMutation.mutate(newCompany);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-500">Manage client organizations and key accounts.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Show Archived Companies
          </label>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : companies?.results?.length > 0 || (Array.isArray(companies) && companies.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Company</th>
                    <th className="px-6 py-3.5">Industry</th>
                    <th className="px-6 py-3.5">Owner</th>
                    <th className="px-6 py-3.5">Active Deals</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(companies.results || companies).map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/companies/${company.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          <span>{company.name}</span>
                        </Link>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-0.5"
                          >
                            <span>{company.website}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {company.industry || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-800">
                          {company.owner_details?.full_name || company.owner_details?.email || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {company.deals_count || 0} deals
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {company.is_archived ? (
                          <Badge variant="warning">Archived</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {company.is_archived ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => restoreMutation.mutate(company.id)}
                            isLoading={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-rose-600"
                            onClick={() => archiveMutation.mutate(company.id)}
                            isLoading={archiveMutation.isPending}
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            Archive
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Building2 className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold">No companies found.</p>
              <p className="text-xs text-slate-400 mt-1">
                Add your first company or adjust search filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Company Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError("");
        }}
        title="Create New Company"
      >
        {createError && (
          <Alert type="error" title="Validation Error" message={createError} className="mb-4" />
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name *
            </label>
            <Input
              required
              placeholder="Acme Corporation"
              value={newCompany.name}
              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Industry
            </label>
            <Input
              placeholder="Enterprise Software, Healthcare, FinTech..."
              value={newCompany.industry}
              onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website URL
            </label>
            <Input
              type="url"
              placeholder="https://acme.com"
              value={newCompany.website}
              onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Company
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
