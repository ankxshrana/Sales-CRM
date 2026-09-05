import apiClient from "./client";

export const alertsApi = {
  getAlerts: async () => {
    const response = await apiClient.get("/alerts/");
    return response.data;
  },

  dismissAlert: async (id) => {
    const response = await apiClient.post(`/alerts/${id}/dismiss/`);
    return response.data;
  },
};
