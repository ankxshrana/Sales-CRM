import apiClient from "./client";

export const companiesApi = {
  getCompanies: async (params = {}) => {
    const response = await apiClient.get("/companies/", { params });
    return response.data;
  },

  getCompany: async (id) => {
    const response = await apiClient.get(`/companies/${id}/`);
    return response.data;
  },

  createCompany: async (companyData) => {
    const response = await apiClient.post("/companies/", companyData);
    return response.data;
  },

  updateCompany: async (id, companyData) => {
    const response = await apiClient.patch(`/companies/${id}/`, companyData);
    return response.data;
  },

  archiveCompany: async (id) => {
    const response = await apiClient.post(`/companies/${id}/archive/`);
    return response.data;
  },

  restoreCompany: async (id) => {
    const response = await apiClient.post(`/companies/${id}/restore/`);
    return response.data;
  },
};
