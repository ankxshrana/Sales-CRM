import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsApi } from "../api/deals";
import { companiesApi } from "../api/companies";
import { authApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import {
  Briefcase,
  Plus,
  Search,
  Download,
  Filter,
  ArrowRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  User,
  RotateCcw,
  FastForward,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export const DealsPage = () => {
  const queryClient = useQueryClient();
  const { user, isManager } = useAuth();

  // Server-side filter, search, sort, and pagination states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk action selection & modals
  const [selectedDealIds, setSelectedDealIds] = useState([]);
  const [isBulkReassignOpen, setIsBulkReassignOpen] = useState(false);
  const [bulkReassignOwnerId, setBulkReassignOwnerId] = useState("");
  const [bulkResults, setBulkResults] = useState(null);
  const [isBulkResultsOpen, setIsBulkResultsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modal & deal creation states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newDeal, setNewDeal] = useState({
    title: "",
    company: "",
    value: "",
    stage: "NEW",
    expected_close_date: "",
  });

  // Debounce search input by 350ms to prevent spamming server requests while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear selections when filters or pagination change
  useEffect(() => {
    setSelectedDealIds([]);
  }, [debouncedSearch, stageFilter, companyFilter, ownerFilter, ordering, page, pageSize]);

  // Server-side Query: deals are filtered, searched, sorted, and paginated entirely on the backend
  const { data: dealsData, isLoading, isFetching } = useQuery({
    queryKey: [
      "deals",
      {
        search: debouncedSearch,
        stage: stageFilter,
        company: companyFilter,
        owner: ownerFilter,
        ordering,
        page,
        page_size: pageSize,
      },
    ],
    queryFn: () =>
      dealsApi.getDeals({
        search: debouncedSearch || undefined,
        stage: stageFilter || undefined,
        company: companyFilter || undefined,
        owner: ownerFilter || undefined,
        ordering: ordering || undefined,
        page,
        page_size: pageSize,
      }),
    keepPreviousData: true,
  });

  // Fetch companies accessible to viewer for the company filter dropdown
  const { data: companiesData } = useQuery({
    queryKey: ["companies-filter-list"],
    queryFn: () => companiesApi.getCompanies({ page_size: 100 }),
  });

  // Fetch users for the owner filter dropdown and bulk reassign modal
  const { data: usersData } = useQuery({
    queryKey: ["users-filter-list"],
    queryFn: () => authApi.getUsers(),
  });

  const dealsList = dealsData?.results || (Array.isArray(dealsData) ? dealsData : []);
  const totalMatches = dealsData?.count ?? dealsList.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / pageSize));
  const startItem = totalMatches === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalMatches);

  const companiesList = companiesData?.results || (Array.isArray(companiesData) ? companiesData : []);
  const usersList = usersData?.results || (Array.isArray(usersData) ? usersData : []);

  const hasActiveFilters = Boolean(
    searchInput || stageFilter || companyFilter || ownerFilter || ordering !== "-updated_at"
  );

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStageFilter("");
    setCompanyFilter("");
    setOwnerFilter("");
    setOrdering("-updated_at");
    setPage(1);
  };

  const handleSortColumn = (field) => {
    setPage(1);
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      // Default to descending for values/dates, ascending for titles
      if (field === "value" || field === "updated_at" || field === "expected_close_date") {
        setOrdering(`-${field}`);
      } else {
        setOrdering(field);
      }
    }
  };

  const renderSortIndicator = (field) => {
    if (ordering === field) {
      return <ArrowUp className="h-3.5 w-3.5 text-indigo-600 inline ml-1" />;
    }
    if (ordering === `-${field}`) {
      return <ArrowDown className="h-3.5 w-3.5 text-indigo-600 inline ml-1" />;
    }
    return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 inline ml-1" />;
  };

  // Selection handlers
  const handleToggleDeal = (dealId) => {
    setSelectedDealIds((prev) =>
      prev.includes(dealId) ? prev.filter((id) => id !== dealId) : [...prev, dealId]
    );
  };

  const isAllCurrentPageSelected =
    dealsList.length > 0 && dealsList.every((deal) => selectedDealIds.includes(deal.id));
  const isSomeCurrentPageSelected =
    dealsList.some((deal) => selectedDealIds.includes(deal.id)) && !isAllCurrentPageSelected;

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const currentPageIds = new Set(dealsList.map((d) => d.id));
      setSelectedDealIds((prev) => prev.filter((id) => !currentPageIds.has(id)));
    } else {
      const currentPageIds = dealsList.map((d) => d.id);
      setSelectedDealIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Bulk Advance Mutation
  const bulkAdvanceMutation = useMutation({
    mutationFn: () => dealsApi.bulkAdvance(selectedDealIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setBulkResults({ ...data, actionType: "advance" });
      setIsBulkResultsOpen(true);
      setSelectedDealIds([]);
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
        "Bulk advance failed.";
      alert(errorMsg);
    },
  });

  // Bulk Reassign Mutation
  const bulkReassignMutation = useMutation({
    mutationFn: () => dealsApi.bulkReassign(selectedDealIds, parseInt(bulkReassignOwnerId)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setIsBulkReassignOpen(false);
      setBulkReassignOwnerId("");
      setBulkResults({ ...data, actionType: "reassign" });
      setIsBulkResultsOpen(true);
      setSelectedDealIds([]);
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
        "Bulk reassign failed.";
      alert(errorMsg);
    },
  });

  const createDealMutation = useMutation({
    mutationFn: dealsApi.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setIsCreateOpen(false);
      setCreateError("");
      setNewDeal({
        title: "",
        company: "",
        value: "",
        stage: "NEW",
        expected_close_date: "",
      });
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
        "Failed to create deal opportunity.";
      setCreateError(errorMsg);
    },
  });

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await dealsApi.exportCsv({
        search: debouncedSearch || undefined,
        stage: stageFilter || undefined,
        company: companyFilter || undefined,
        owner: ownerFilter || undefined,
        ordering: ordering || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pipeline_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export pipeline CSV:", err);
      alert("Failed to export pipeline CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateDeal = (e) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.company || !newDeal.value || !newDeal.expected_close_date) return;
    createDealMutation.mutate({
      ...newDeal,
      company: parseInt(newDeal.company),
      value: parseFloat(newDeal.value).toFixed(2),
    });
  };

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deals Pipeline</h1>
            <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Server-side filtered pipeline across all accessible companies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={isExporting}
            title="Export open pipeline deals with stage weights as CSV"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            )}
            <span>{isExporting ? "Exporting..." : "Export Pipeline CSV"}</span>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Stage Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setStageFilter("");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            stageFilter === ""
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Stages
        </button>
        {STAGES.map((stg) => (
          <button
            key={stg}
            onClick={() => {
              setStageFilter(stg === stageFilter ? "" : stg);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              stageFilter === stg
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {stg}
          </button>
        ))}
      </div>

      {/* Comprehensive Filter & Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input: Title & Company Name */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search title or company..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Company Filter Dropdown */}
            <div>
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="">All Companies</option>
                {companiesList.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Owner Filter Dropdown */}
            <div>
              <select
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="">All Owners</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Server-side Sort Selector */}
            <div>
              <select
                value={ordering}
                onChange={(e) => {
                  setOrdering(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="-updated_at">Last Updated (Newest)</option>
                <option value="updated_at">Last Updated (Oldest)</option>
                <option value="-value">Value: High to Low</option>
                <option value="value">Value: Low to High</option>
                <option value="expected_close_date">Close Date: Earliest</option>
                <option value="-expected_close_date">Close Date: Latest</option>
                <option value="title">Deal Title (A–Z)</option>
                <option value="-title">Deal Title (Z–A)</option>
                <option value="company">Company Name (A–Z)</option>
                <option value="-company">Company Name (Z–A)</option>
                <option value="owner">Owner Name (A–Z)</option>
                <option value="-owner">Owner Name (Z–A)</option>
                <option value="-created_at">Recently Created</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Reset Action */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-medium">Active filters:</span>
                {debouncedSearch && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>Search: "{debouncedSearch}"</span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSearchInput("")}
                    />
                  </Badge>
                )}
                {stageFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>Stage: {stageFilter}</span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setStageFilter("")}
                    />
                  </Badge>
                )}
                {companyFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>
                      Company: {companiesList.find((c) => String(c.id) === companyFilter)?.name || companyFilter}
                    </span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setCompanyFilter("")}
                    />
                  </Badge>
                )}
                {ownerFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>
                      Owner: {usersList.find((u) => String(u.id) === ownerFilter)?.full_name || ownerFilter}
                    </span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setOwnerFilter("")}
                    />
                  </Badge>
                )}
                {ordering !== "-updated_at" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>Sort: {ordering}</span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setOrdering("-updated_at")}
                    />
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : dealsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    {/* Manager Checkbox Column for Bulk Selection */}
                    {isManager && (
                      <th className="px-4 py-3.5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeCurrentPageSelected;
                          }}
                          onChange={handleToggleSelectAllCurrentPage}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Select / deselect all deals on this page"
                        />
                      </th>
                    )}
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("title")}
                    >
                      <div className="flex items-center">
                        <span>Deal Opportunity</span>
                        {renderSortIndicator("title")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("company")}
                    >
                      <div className="flex items-center">
                        <span>Company</span>
                        {renderSortIndicator("company")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("stage")}
                    >
                      <div className="flex items-center">
                        <span>Stage</span>
                        {renderSortIndicator("stage")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("owner")}
                    >
                      <div className="flex items-center">
                        <span>Owner</span>
                        {renderSortIndicator("owner")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("expected_close_date")}
                    >
                      <div className="flex items-center">
                        <span>Expected Close</span>
                        {renderSortIndicator("expected_close_date")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("updated_at")}
                    >
                      <div className="flex items-center">
                        <span>Last Update</span>
                        {renderSortIndicator("updated_at")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3.5 text-right cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                      onClick={() => handleSortColumn("value")}
                    >
                      <div className="flex items-center justify-end">
                        <span>Value (USD)</span>
                        {renderSortIndicator("value")}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealsList.map((deal) => {
                    const isSelected = selectedDealIds.includes(deal.id);
                    return (
                      <tr
                        key={deal.id}
                        className={cn(
                          "transition-colors",
                          isSelected ? "bg-indigo-50/60 hover:bg-indigo-50/80" : "hover:bg-slate-50/80"
                        )}
                      >
                        {/* Manager Checkbox */}
                        {isManager && (
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDeal(deal.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <Link
                            to={`/deals/${deal.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-2"
                          >
                            <Briefcase className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[220px]">{deal.title}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          {deal.company ? (
                            <Link
                              to={`/companies/${deal.company}`}
                              className="hover:text-indigo-600 hover:underline"
                            >
                              {deal.company_name || deal.company_details?.name || "Company"}
                            </Link>
                          ) : (
                            deal.company_name || deal.company_details?.name || "—"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={deal.stage}>{deal.stage}</Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {deal.owner_details?.full_name || deal.owner_details?.email}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {formatDate(deal.expected_close_date)}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatDate(deal.updated_at)}
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-slate-900">
                          {formatCurrency(deal.value)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/deals/${deal.id}`}>
                            <Button variant="ghost" size="sm">
                              <span>Manage</span>
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
            <div className="py-16 text-center text-slate-500">
              <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="font-semibold text-base text-slate-800">No deals match your search criteria</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search keywords, clearing company or stage filters, or add a new deal opportunity.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear All Filters
                </Button>
              )}
            </div>
          )}

          {/* Server-Side Pagination & Matches Count Footer */}
          {totalMatches > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                <span>
                  Showing <strong className="text-slate-800">{startItem}</strong> to{" "}
                  <strong className="text-slate-800">{endItem}</strong> of{" "}
                  <strong className="text-slate-800">{totalMatches}</strong> matches
                </span>

                {isFetching && (
                  <span className="inline-flex items-center text-indigo-600 gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Updating...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Select */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2.5"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous</span>
                  </Button>

                  <span className="px-2 text-xs font-semibold text-slate-700">
                    Page {page} of {totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2.5"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager Floating Bulk Actions Dock */}
      {isManager && selectedDealIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white border border-slate-700 shadow-2xl rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-4 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white font-bold text-xs">
              {selectedDealIds.length}
            </span>
            <span className="text-sm font-semibold text-slate-100">
              {selectedDealIds.length === 1 ? "1 deal selected" : `${selectedDealIds.length} deals selected`}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm h-8"
              onClick={() => bulkAdvanceMutation.mutate()}
              isLoading={bulkAdvanceMutation.isPending}
            >
              <FastForward className="mr-1.5 h-3.5 w-3.5" />
              Bulk Advance Stage
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-semibold text-xs h-8"
              onClick={() => setIsBulkReassignOpen(true)}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Bulk Reassign Owner
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 text-xs h-8"
              onClick={() => setSelectedDealIds([])}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal */}
      <Modal
        isOpen={isBulkReassignOpen}
        onClose={() => {
          setIsBulkReassignOpen(false);
          setBulkReassignOwnerId("");
        }}
        title="Bulk Reassign Deals Owner"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Reassign the <strong className="text-slate-900">{selectedDealIds.length}</strong> selected deal
            {selectedDealIds.length === 1 ? "" : "s"} to a new sales representative or manager.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Owner *
            </label>
            <select
              value={bulkReassignOwnerId}
              onChange={(e) => setBulkReassignOwnerId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="">Choose an owner...</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => {
                setIsBulkReassignOpen(false);
                setBulkReassignOwnerId("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!bulkReassignOwnerId || bulkReassignMutation.isPending}
              isLoading={bulkReassignMutation.isPending}
              onClick={() => bulkReassignMutation.mutate()}
            >
              Reassign Deals
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Action Results Modal (Detailed per-deal outcome and reason reporting) */}
      <Modal
        isOpen={isBulkResultsOpen}
        onClose={() => setIsBulkResultsOpen(false)}
        title={
          bulkResults?.actionType === "advance"
            ? "Bulk Stage Advance Results"
            : "Bulk Reassign Owner Results"
        }
        className="max-w-2xl"
      >
        {bulkResults && (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  {bulkResults.total_selected}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Succeeded
                </span>
                <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                  {bulkResults.succeeded_count}
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="block text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Rejected / Ineligible
                </span>
                <span className="text-xl font-bold text-rose-800 mt-0.5 block">
                  {bulkResults.failed_count}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Per-deal audit summary: Ineligible deals were rejected individually with clear reasons, while eligible deals were successfully processed.
            </p>

            {/* List of individual deal results */}
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {bulkResults.results?.map((res, idx) => (
                <div key={idx} className="pt-2.5 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {res.title || `Deal #${res.deal_id}`}
                      </span>
                      {res.from_stage && res.to_stage && (
                        <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {res.from_stage} &rarr; {res.to_stage}
                        </span>
                      )}
                    </div>
                    {res.status === "SUCCESS" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : res.status === "SKIPPED" ? (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Skipped
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 shrink-0">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-md border border-slate-100">
                    {res.reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button onClick={() => setIsBulkResultsOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Deal Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError("");
        }}
        title="Create New Deal Opportunity"
      >
        {createError && (
          <Alert type="error" title="Validation Error" message={createError} className="mb-4" />
        )}
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deal Title *
            </label>
            <Input
              required
              placeholder="Q3 Enterprise Platform License"
              value={newDeal.title}
              onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company *
            </label>
            <select
              required
              value={newDeal.company}
              onChange={(e) => setNewDeal({ ...newDeal, company: e.target.value })}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a Company...</option>
              {companiesList.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Value ($ USD) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="50000.00"
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stage
              </label>
              <select
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STAGES.map((stg) => (
                  <option key={stg} value={stg}>
                    {stg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Close Date *
            </label>
            <Input
              type="date"
              required
              value={newDeal.expected_close_date}
              onChange={(e) => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createDealMutation.isPending}>
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
