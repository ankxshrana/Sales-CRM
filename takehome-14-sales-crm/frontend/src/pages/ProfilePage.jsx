import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { formatDate } from "../lib/utils";
import { User, Shield, Key, Mail, Calendar, CheckCircle2 } from "lucide-react";

export const ProfilePage = () => {
  const { user, isManager, isRep } = useAuth();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Profile</h1>
        <p className="text-sm text-slate-500">
          Account credentials, role assignment, and security privileges.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg mb-4">
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {user?.full_name || "Sales User"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <div className="mt-3">
              <Badge variant={user?.role} className="px-3 py-1 text-xs uppercase font-bold">
                {user?.role === "MANAGER" ? "Sales Manager" : "Sales Representative"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              <span>Security & Roles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                  Authentication Type
                </span>
                <span className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-indigo-500" />
                  JWT Bearer Token
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                  Account Status
                </span>
                <span className="font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Active & Verified
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                  Member Since
                </span>
                <span className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDate(user?.date_joined)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                  Manager Permissions
                </span>
                <span className="font-semibold text-slate-800 mt-1">
                  {isManager ? "Reopen deals, bulk reassign, all accounts" : "Standard sales pipeline"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
