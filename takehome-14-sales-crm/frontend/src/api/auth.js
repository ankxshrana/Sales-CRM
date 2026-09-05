import apiClient from "./client";

export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post("/auth/login/", credentials);
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post("/auth/refresh/", { refresh: refreshToken });
    return response.data;
  },

  logout: async (refreshToken) => {
    const response = await apiClient.post("/auth/logout/", { refresh: refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/me/");
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get("/auth/users/");
    return response.data;
  },
};
