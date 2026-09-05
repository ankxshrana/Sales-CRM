import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsApi } from "../api/deals";
import { authApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  Briefcase,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  User,
  Users,
  History,
  RotateCcw,
  ArrowRight,
  Trash2,
  Plus,
  Loader2,
  Pencil,
} from "lucide-react";

const ALL_STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export const DealDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isManager } = useAuth();

  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isAddCollabOpen, setIsAddCollabOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [targetStage, setTargetStage] = useState("");
  const [stageReason, setStageReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [transitionError, setTransitionError] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => dealsApi.getDeal(id),
  });

  const { data: history } = useQuery({
    queryKey: ["deal-history", id],
    queryFn: () => dealsApi.getDealHistory(id),
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => authApi.getUsers(),
  });

  const usersList = Array.isArray(allUsers) ? allUsers : (allUsers?.results || []);
  const historyList = Array.isArray(history) ? history : (history?.results || []);
  const canManageCollabs = isManager || (deal && user && deal.owner === user.id);
  const canEditDeal = isManager || (deal && user && (deal.owner === user.id || (deal.collaborators_list || []).some((c) => c.id === user.id)));
  const canDeleteDeal = isManager || (deal && user && deal.owner === user.id);

  const editMutation = useMutation({
    mutationFn: (data) => dealsApi.updateDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditModalOpen(false);
      setEditError("");
    },
    onError: (err) => {
      setEditError(
        err.response?.data?.detail ||
        (typeof err.response?.data === "object"
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" | ")
          : null) ||
        err.message ||
        "Failed to update deal."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => dealsApi.deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      navigate("/deals");
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.detail || err.message || "Failed to delete deal.");
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (newOwnerId) => dealsApi.reassignDeal(id, newOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
      setIsReassignModalOpen(false);
      setReassignUserId("");
      setReassignError("");
    },
    onError: (err) => {
      setReassignError(err.response?.data?.error || err.message || "Failed to reassign deal");
    },
  });


  const stageMutation = useMutation({
    mutationFn: (data) => dealsApi.changeStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
      setIsStageModalOpen(false);
      setStageReason("");
      setTransitionError("");
    },
    onError: (err) => {
      setTransitionError(err.response?.data?.error || err.message || "Failed to update stage");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (data) => dealsApi.reopenDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
      setIsReopenModalOpen(false);
      setReopenReason("");
    },
    onError: (err) => {
      setTransitionError(err.response?.data?.error || err.message || "Failed to reopen deal");
    },
  });

  const addCollabMutation = useMutation({
    mutationFn: (data) => dealsApi.addCollaborator(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
      setIsAddCollabOpen(false);
      setSelectedUserId("");
    },
  });

  const removeCollabMutation = useMutation({
    mutationFn: (userId) => dealsApi.removeCollaborator(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-history", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        Failed to load deal information.
      </div>
    );
  }

  const handleStageChangeSubmit = (e) => {
    e.preventDefault();
    if (!targetStage) return;
    setTransitionError("");
    stageMutation.mutate({ new_stage: targetStage, reason: stageReason });
  };

  const handleReopenSubmit = (e) => {
    e.preventDefault();
    setTransitionError("");
    reopenMutation.mutate({ reason: reopenReason });
  };

  const handleAddCollabSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    addCollabMutation.mutate({ user_id: parseInt(selectedUserId), role: "CONTRIBUTOR" });
  };

  const handleOpenEdit = () => {
    setEditTitle(deal.title || "");
    setEditValue(deal.value != null ? String(deal.value) : "");
    const dateVal = deal.expected_close_date ? deal.expected_close_date.split("T")[0] : "";
    setEditCloseDate(dateVal);
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required.");
      return;
    }
    const valNum = parseFloat(editValue);
    if (isNaN(valNum) || valNum < 0) {
      setEditError("Valid deal value is required.");
      return;
    }
    editMutation.mutate({
      title: editTitle.trim(),
      value: valNum,
      expected_close_date: editCloseDate || null,
    });
  };

  return (
    <div className="space-y-6">
      <Link
        to="/deals"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
        Back to Deals Pipeline
      </Link>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {deal.title}
            </h1>
            <Badge variant={deal.stage} className="text-sm px-3 py-1">
              {deal.stage}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Link
              to={`/companies/${deal.company}`}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {deal.company_name || "Company"}
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditDeal && (
            <Button
              variant="secondary"
              onClick={handleOpenEdit}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Deal
            </Button>
          )}

          {canDeleteDeal && (
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteError("");
                setIsDeleteModalOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Deal
            </Button>
          )}

          {deal.is_closed ? (
            isManager && (
              <Button
                variant="secondary"
                onClick={() => {
                  setTransitionError("");
                  setIsReopenModalOpen(true);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen Deal
              </Button>
            )
          ) : (
            <Button
              onClick={() => {
                setTransitionError("");
                setIsStageModalOpen(true);
              }}
            >
              <span>Update Stage</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Deal Overview</CardTitle>
              {canEditDeal && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Deal Value
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(deal.value)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">
                    Assigned Owner
                  </span>
                  {isManager && (
                    <button
                      onClick={() => {
                        setReassignError("");
                        setIsReassignModalOpen(true);
                      }}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Reassign
                    </button>
                  )}
                </div>
                <span className="font-semibold text-slate-800">
                  {deal.owner_details?.full_name || deal.owner_details?.email}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Expected Close Date
                </span>
                <span className="font-semibold text-slate-800">
                  {formatDate(deal.expected_close_date)}
                </span>
              </div>

              {deal.previous_stage && (
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">
                    Previous Stage
                  </span>
                  <Badge variant={deal.previous_stage}>{deal.previous_stage}</Badge>
                </div>
              )}

              {deal.closed_at && (
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">
                    Closed At
                  </span>
                  <span className="text-slate-600">{formatDate(deal.closed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborators Box */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Collaborators</span>
              </CardTitle>
              {canManageCollabs && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsAddCollabOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(deal.collaborators_list || []).length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {(deal.collaborators_list || []).map((collab) => (
                    <li
                      key={collab.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {collab.full_name || collab.email}
                        </span>
                        <span className="text-slate-400 text-[11px]">{collab.email}</span>
                      </div>
                      {canManageCollabs && (
                        <button
                          onClick={() => removeCollabMutation.mutate(collab.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove Collaborator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 py-2">No collaborators assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit History Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Append-Only Audit History Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyList && historyList.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyList.map((entry) => (
                    <div key={entry.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[1.85rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-900">
                            {entry.user?.full_name || entry.user?.email || "System"}
                          </span>
                          <span className="text-slate-400">{formatDate(entry.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                            {entry.action}
                          </span>
                          {entry.from_stage && entry.to_stage && (
                            <div className="flex items-center gap-1 text-xs">
                              <Badge variant={entry.from_stage} className="text-[10px]">
                                {entry.from_stage}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <Badge variant={entry.to_stage} className="text-[10px]">
                                {entry.to_stage}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="mt-2 text-xs text-slate-600 bg-white border border-slate-100 rounded-lg p-2 italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No historical entries recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stage Transition Modal */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title="Transition Deal Stage"
      >
        {transitionError && (
          <Alert type="error" title="Validation Error" message={transitionError} className="mb-4" />
        )}
        <form onSubmit={handleStageChangeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Stage: <span className="font-bold text-indigo-600">{deal.stage}</span>
            </label>
            <select
              required
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Target Stage...</option>
              {ALL_STAGES.filter((s) => s !== deal.stage).map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Transition Notes (Required for backward stage moves)
            </label>
            <textarea
              rows={3}
              placeholder="Provide reason for moving backwards or closing..."
              value={stageReason}
              onChange={(e) => setStageReason(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsStageModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={stageMutation.isPending}>
              Update Stage
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reopen Modal */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="Reopen Closed Deal"
      >
        {transitionError && (
          <Alert type="error" title="Error" message={transitionError} className="mb-4" />
        )}
        <form onSubmit={handleReopenSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Reopening this deal will return it to stage:{" "}
            <strong>{deal.previous_stage || "NEGOTIATION"}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reopening Justification *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Client budget re-approved for Q4..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReopenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={reopenMutation.isPending}>
              Confirm Reopen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Collaborator Modal */}
      <Modal
        isOpen={isAddCollabOpen}
        onClose={() => setIsAddCollabOpen(false)}
        title="Add Deal Collaborator"
      >
        <form onSubmit={handleAddCollabSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Team Member *
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a user...</option>
              {usersList
                .filter(
                  (u) =>
                    u.id !== deal.owner &&
                    !(deal.collaborators_list || []).some((c) => c.id === u.id)
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddCollabOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={addCollabMutation.isPending}>
              Add Collaborator
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Deal Owner"
      >
        {reassignError && (
          <Alert type="error" title="Error" message={reassignError} className="mb-4" />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reassignUserId) return;
            reassignMutation.mutate(parseInt(reassignUserId));
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Owner (Sales Rep / Manager) *
            </label>
            <select
              required
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a user...</option>
              {usersList
                .filter((u) => u.id !== deal.owner)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReassignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={reassignMutation.isPending}>
              Reassign Owner
            </Button>
          </div>
        </form>
      </Modal>
      {/* Edit Deal Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Deal Details"
      >
        {editError && (
          <Alert type="error" title="Error" message={editError} className="mb-4" />
        )}
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deal Title *
            </label>
            <Input
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Enterprise License Expansion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deal Value ($) *
            </label>
            <Input
              required
              type="number"
              step="0.01"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Close Date
            </label>
            <Input
              type="date"
              value={editCloseDate}
              onChange={(e) => setEditCloseDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={editMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Deal Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Deal"
      >
        {deleteError && (
          <Alert type="error" title="Error" message={deleteError} className="mb-4" />
        )}
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete <strong>{deal.title}</strong>? This action cannot be undone and will remove all associated stage history and collaborators.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Deal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

