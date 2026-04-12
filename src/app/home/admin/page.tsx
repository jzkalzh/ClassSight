"use client";

import React, { useEffect, useState } from "react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import { BookOpen, Building, GraduationCap, Shield, Users } from "lucide-react";

type AdminDashboardData = {
  admin: {
    id: string;
    name: string;
    role: string;
  };
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalCourses: number;
    totalDepartments: number;
  };
  recentActivities: Array<{
    id: string;
    description: string;
    time: string;
  }>;
};

const AdminHomePage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "加载管理员首页失败");
        }

        setData(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载管理员首页失败");
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight 管理系统" />
      <StudentNavigation role={2} />

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <section className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
            <h2 className="mb-4 text-xl font-bold">管理员信息</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{data?.admin.name || "管理员"}</p>
                  <p className="text-sm text-slate-500">{data?.admin.id || "-"}</p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500">身份</p>
                <p className="mt-1 font-medium">{data?.admin.role || "系统管理员"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
            <h2 className="mb-6 text-xl font-bold">系统总览</h2>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="h-4 w-4" />
                  学生总数
                </div>
                <p className="text-3xl font-bold">{data?.stats.totalStudents ?? 0}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <GraduationCap className="h-4 w-4" />
                  教师总数
                </div>
                <p className="text-3xl font-bold">{data?.stats.totalTeachers ?? 0}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <BookOpen className="h-4 w-4" />
                  课程总数
                </div>
                <p className="text-3xl font-bold">{data?.stats.totalCourses ?? 0}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <div className="mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Building className="h-4 w-4" />
                  院系总数
                </div>
                <p className="text-3xl font-bold">{data?.stats.totalDepartments ?? 0}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold">近期活动</h3>
              <div className="space-y-3">
                {data?.recentActivities?.length ? (
                  data.recentActivities.map((activity) => (
                    <div key={activity.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{activity.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/60">
                    暂无活动记录
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default AdminHomePage;

