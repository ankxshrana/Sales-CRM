import apiClient from "./client";

export const dealsApi = {
  getDeals: async (params = {}) => {
    const response = await apiClient.get("/deals/", { params });
    return response.data;
  },

  getDeal: async (id) => {
    const response = await apiClient.get(`/deals/${id}/`);
    return response.data;
  },

  createDeal: async (dealData) => {
    const response = await apiClient.post("/deals/", dealData);
    return response.data;
  },

  updateDeal: async (id, dealData) => {
    const response = await apiClient.patch(`/deals/${id}/`, dealData);
    return response.data;
  },

  deleteDeal: async (id) => {
    const response = await apiClient.delete(`/deals/${id}/`);
    return response.data;
  },

  changeStage: async (id, stageData) => {
    // stageData: { new_stage: string, reason?: string }
    const response = await apiClient.post(`/deals/${id}/stage/`, stageData);
    return response.data;
  },

  reopenDeal: async (id, reopenData = {}) => {
    // reopenData: { reason?: string }
    const response = await apiClient.post(`/deals/${id}/reopen/`, reopenData);
    return response.data;
  },

  getDealHistory: async (id) => {
    const response = await apiClient.get(`/deals/${id}/history/`);
    return response.data;
  },

  addCollaborator: async (id, collaboratorData) => {
    // collaboratorData: { user_id: number, role?: string }
    const response = await apiClient.post(`/deals/${id}/collaborators/`, collaboratorData);
    return response.data;
  },

  removeCollaborator: async (dealId, userId) => {
    const response = await apiClient.delete(`/deals/${dealId}/collaborators/${userId}/`);
    return response.data;
  },

  bulkAdvance: async (dealIds) => {
    const response = await apiClient.post("/deals/bulk-advance/", { deal_ids: dealIds });
    return response.data;
  },

  reassignDeal: async (id, newOwnerId) => {
    const response = await apiClient.post(`/deals/${id}/reassign/`, {
      new_owner_id: newOwnerId,
    });
    return response.data;
  },

  bulkReassign: async (dealIds, newOwnerId) => {
    const response = await apiClient.post("/deals/bulk-reassign/", {
      deal_ids: dealIds,
      new_owner_id: newOwnerId,
    });
    return response.data;
  },

  exportCsv: async (params = {}) => {
    const response = await apiClient.get("/deals/export/", {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};
