import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Lock, Mail, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid work email address"),
  password: z.string().min(1, "Password is required"),
});

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Invalid email or password. Please verify your credentials.";
      setServerError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (email, pass) => {
    setValue("email", email);
    setValue("password", pass);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your deal pipeline, account metrics, and sales alerts.
        </p>
      </div>

      {serverError && (
        <Alert type="error" title="Authentication Failed" message={serverError} className="mb-4" />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Input
              type="email"
              placeholder="rep@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          <span>Sign In</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Demo Accounts / Quick Fill
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDemoCredentials("manager@example.com", "password123")}
            className="text-left p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors text-xs"
          >
            <span className="font-bold text-indigo-700 block">Sales Manager</span>
            <span className="text-[10px] text-slate-500 block truncate">manager@example.com</span>
          </button>
          <button
            type="button"
            onClick={() => setDemoCredentials("rep@example.com", "password123")}
            className="text-left p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors text-xs"
          >
            <span className="font-bold text-indigo-700 block">Sales Rep</span>
            <span className="text-[10px] text-slate-500 block truncate">rep@example.com</span>
          </button>
        </div>
      </div>
    </div>
  );
};
