import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, TrendingUp } from "lucide-react";

export const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-500/30 mb-4">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Sales CRM</h1>
          <p className="text-sm text-indigo-200/80 mt-1">Enterprise Deal Pipeline & Client Intelligence</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <Outlet />
        </div>

        <div className="mt-8 text-center text-xs text-indigo-300/60 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          <span>Django & JWT Secured Enterprise Application</span>
        </div>
      </div>
    </div>
  );
};
