import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication state on app mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        localStorage.setItem("user_profile", JSON.stringify(userData));
      } catch (err) {
        console.error("Failed to verify current user:", err);
        // Token might have expired and refresh handled in interceptor; if interceptor failed:
        if (!localStorage.getItem("access_token")) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_profile");
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);
    verifyAuth();

    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem("user_profile", JSON.stringify(data.user));
    }
    return data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        console.warn("Logout request failed on server, clearing client state:", err);
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_profile");
    setUser(null);
  };

  const isManager = user?.role === "MANAGER" || user?.is_manager;
  const isRep = user?.role === "REP" || user?.is_rep;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isManager,
        isRep,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
