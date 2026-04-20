"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building,
  CalendarDays,
  GraduationCap,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import PageFooter from "@/components/PageFooter";
import PageHeader from "@/components/PageHeader";
import StudentNavigation from "@/components/StudentNavigation";
import { Card } from "@/components/ui/card";

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

function getActivityTone(id: string) {
  if (id.startsWith("student-")) {
    return {
      icon: Users,
      className: "bg-sky-100 text-sky-700",
    };
  }

  if (id.startsWith("teacher-")) {
    return {
      icon: GraduationCap,
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    icon: BookOpen,
    className: "bg-violet-100 text-violet-700",
  };
}

const quickLinks = [
  {
    href: "/home/admin/student",
    title: "学生管理",
    description: "查看、维护学生档案与账号",
    icon: Users,
    tone: "from-sky-500 to-cyan-400",
  },
  {
    href: "/home/admin/teacher",
    title: "教师管理",
    description: "维护教师信息与任课关系",
    icon: GraduationCap,
    tone: "from-emerald-500 to-lime-400",
  },
  {
    href: "/home/admin/courses",
    title: "课程管理",
    description: "调整课程、成员与排课信息",
    icon: BookOpen,
    tone: "from-violet-500 to-fuchsia-400",
  },
  {
    href: "/home/admin/department",
    title: "院系管理",
    description: "维护学院与组织结构",
    icon: Building,
    tone: "from-amber-500 to-orange-400",
  },
];

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

  const overview = useMemo(() => {
    const stats = data?.stats;
    if (!stats) {
      return {
        teacherCoverage: 0,
        courseLoad: 0,
        departmentLoad: 0,
        maxMetric: 1,
      };
    }

    return {
      teacherCoverage:
        stats.totalTeachers > 0 ? Number((stats.totalStudents / stats.totalTeachers).toFixed(1)) : 0,
      courseLoad:
        stats.totalTeachers > 0 ? Number((stats.totalCourses / stats.totalTeachers).toFixed(1)) : 0,
      departmentLoad:
        stats.totalDepartments > 0
          ? Number(((stats.totalCourses + stats.totalTeachers) / stats.totalDepartments).toFixed(1))
          : 0,
      maxMetric: Math.max(
        stats.totalStudents,
        stats.totalTeachers,
        stats.totalCourses,
        stats.totalDepartments,
        1,
      ),
    };
  }, [data]);

  const statCards = [
    {
      label: "学生总数",
      value: data?.stats.totalStudents ?? 0,
      icon: Users,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "教师总数",
      value: data?.stats.totalTeachers ?? 0,
      icon: GraduationCap,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "课程总数",
      value: data?.stats.totalCourses ?? 0,
      icon: BookOpen,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "院系总数",
      value: data?.stats.totalDepartments ?? 0,
      icon: Building,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  const systemPulse = [
    {
      title: "师生比",
      value: overview.teacherCoverage,
      unit: "人/师",
      description: "帮助管理员判断教师覆盖能力",
    },
    {
      title: "人均课程负载",
      value: overview.courseLoad,
      unit: "门/师",
      description: "观察课程分配是否均衡",
    },
    {
      title: "院系统筹指数",
      value: overview.departmentLoad,
      unit: "项/院",
      description: "反映院系统筹管理压力",
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_36%,#f8fafc_100%)] text-gray-900">
      <PageHeader title="ClassSight 管理系统" />
      <StudentNavigation role={2} />

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Admin Control Deck</p>
                <h1 className="mt-3 text-3xl font-semibold">
                  欢迎，{data?.admin.name || "管理员"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  这里整合了平台当前的学生、教师、课程与院系规模，并把最近新增的关键对象按时间线集中展示，方便你快速掌握系统整体状态。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">管理员账号</p>
                  <p className="mt-1 font-semibold text-white">{data?.admin.id || "-"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">角色身份</p>
                  <p className="mt-1 font-semibold text-white">{data?.admin.role || "系统管理员"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <div className="flex items-center justify-between text-sky-100">
                      <span className="text-sm">{item.label}</span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-5">
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">管理快捷入口</p>
                    <h2 className="text-xl font-semibold text-slate-900">今天最常用的模块</h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-slate-400" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {quickLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link key={item.href} href={item.href} className="block">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                          <div className={`inline-flex rounded-2xl bg-gradient-to-br ${item.tone} p-3 text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-lg font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-600">
                            进入模块
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">系统脉冲</p>
                    <h2 className="text-xl font-semibold text-slate-900">平台运行观察</h2>
                  </div>
                  <Activity className="h-5 w-5 text-slate-400" />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {systemPulse.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">{item.title}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">
                        {item.value}
                        <span className="ml-1 text-sm font-medium text-slate-500">{item.unit}</span>
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-4">
                  {statCards.map((item) => {
                    const width = Math.max((item.value / overview.maxMetric) * 100, item.value ? 12 : 0);

                    return (
                      <div key={`ratio-${item.label}`}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-medium text-slate-900">{item.value}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                            style={{ width: `${Math.min(width, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">近期活动</p>
                    <h2 className="text-xl font-semibold text-slate-900">系统新增时间线</h2>
                  </div>
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-3">
                  {data?.recentActivities?.length ? (
                    data.recentActivities.map((activity) => {
                      const meta = getActivityTone(activity.id);
                      const Icon = meta.icon;

                      return (
                        <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-2xl p-3 ${meta.className}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{activity.description}</p>
                              <p className="mt-1 text-xs text-slate-500">{activity.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">暂无活动记录</div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">治理提醒</p>
                    <h2 className="text-xl font-semibold text-slate-900">管理员观察建议</h2>
                  </div>
                  <Shield className="h-5 w-5 text-slate-400" />
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">优先检查课程覆盖</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      当前共有 {data?.stats.totalCourses ?? 0} 门课程、{data?.stats.totalTeachers ?? 0} 名教师，
                      建议确认是否有课程未分配教师或分配过于集中。
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">关注组织结构完整度</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      当前院系总数为 {data?.stats.totalDepartments ?? 0}，如果后续继续扩充课程与教师数据，
                      建议同步维护院系归属，避免统计视图出现空挂载。
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default AdminHomePage;
