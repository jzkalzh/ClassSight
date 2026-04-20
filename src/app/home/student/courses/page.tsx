"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock3,
  Filter,
  GraduationCap,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import PageFooter from "@/components/PageFooter";
import PageHeader from "@/components/PageHeader";
import StudentNavigation from "@/components/StudentNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type StudentCourse = {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  scheduleLabel: string;
  location: string;
  status: "pending" | "completed" | "in-progress";
  metrics: {
    attendanceRate: number;
    focusLevel: number;
    lookUpRate: number;
    score: number;
  } | null;
};

type StudentDashboardData = {
  student: {
    name: string;
    departmentName: string;
  };
  overview: {
    courseCount: number;
  };
  courses: StudentCourse[];
};

function formatPercent(value?: number | null) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function getStatusMeta(status: StudentCourse["status"]) {
  if (status === "completed") {
    return {
      label: "已采集",
      className: "bg-sky-100 text-sky-700",
    };
  }

  if (status === "in-progress") {
    return {
      label: "进行中",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "待接入",
    className: "bg-amber-100 text-amber-700",
  };
}

const filterOptions = [
  { key: "all", label: "全部课程" },
  { key: "in-progress", label: "进行中" },
  { key: "completed", label: "已采集" },
  { key: "pending", label: "待接入" },
] as const;

const CoursesPage: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof filterOptions)[number]["key"]>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/student/dashboard", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "加载学生课程失败");
        }

        setData(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载学生课程失败");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const courses = useMemo(() => data?.courses ?? [], [data]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === "all") return courses;
    return courses.filter((course) => course.status === activeFilter);
  }, [activeFilter, courses]);

  const summary = useMemo(() => {
    const completed = courses.filter((course) => course.status === "completed").length;
    const inProgress = courses.filter((course) => course.status === "in-progress").length;
    const withMetrics = courses.filter((course) => course.metrics);
    const bestCourse = [...withMetrics].sort(
      (left, right) => (right.metrics?.score ?? 0) - (left.metrics?.score ?? 0),
    )[0];

    return {
      completed,
      inProgress,
      bestCourse,
    };
  }, [courses]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_36%,#f8fafc_100%)] text-gray-900">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Course Studio</p>
                <h1 className="mt-3 text-3xl font-semibold">我的课程</h1>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  这里汇总了你的课程日程、接入状态和课堂表现分数，方便你快速找到当前最稳的课程，以及仍然需要重点补强的课程。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">课程总数</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {data?.overview.courseCount ?? courses.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">已采集</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{summary.completed}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">进行中</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{summary.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <div className="mb-3 flex items-center gap-2 text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-medium">课程信号</p>
                </div>
                <p className="text-lg font-semibold text-white">
                  {summary.bestCourse?.name || "等待更多课堂数据"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {summary.bestCourse
                    ? `当前表现最稳的是 ${summary.bestCourse.name}，综合分 ${summary.bestCourse.metrics?.score.toFixed(1)}，可以把这门课的学习节奏当作参考模板。`
                    : "当课程采集数据更完整后，这里会自动告诉你哪门课目前最稳。"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <div className="mb-3 flex items-center gap-2 text-sky-100">
                  <GraduationCap className="h-4 w-4" />
                  <p className="text-sm font-medium">院系归属</p>
                </div>
                <p className="text-lg font-semibold text-white">
                  {data?.student.name || "学生"} / {data?.student.departmentName || "未设置院系"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  你可以在这里按课程状态筛选，快速进入某门课查看更详细的课程页。
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">课程列表</p>
            <h2 className="text-2xl font-semibold text-slate-900">按状态快速查看课程</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
              <Filter className="h-4 w-4" />
              状态筛选
            </div>
            <div className="rounded-full bg-white p-1 shadow-sm">
              {filterOptions.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant={activeFilter === option.key ? "secondary" : "ghost"}
                  className="rounded-full"
                  onClick={() => setActiveFilter(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : filteredCourses.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredCourses.map((course) => {
              const statusMeta = getStatusMeta(course.status);

              return (
                <Link key={course.id} href={`/home/student/courses/${course.id}`} className="block">
                  <Card className="h-full border-0 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] p-3 text-white">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-slate-900">{course.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {course.teacherName} · {course.code}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${statusMeta.className} rounded-full hover:${statusMeta.className}`}>
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
                          <Clock3 className="h-4 w-4 text-sky-600" />
                          <span>{course.scheduleLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          <span>{course.location}</span>
                        </div>
                      </div>

                      {course.metrics ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 p-3 text-center">
                            <p className="text-xs text-slate-500">出勤</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {formatPercent(course.metrics.attendanceRate)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3 text-center">
                            <p className="text-xs text-slate-500">专注</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {formatPercent(course.metrics.focusLevel)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3 text-center">
                            <p className="text-xs text-slate-500">抬头</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {formatPercent(course.metrics.lookUpRate)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3 text-center">
                            <p className="text-xs text-slate-500">综合分</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {course.metrics.score.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          这门课还没有生成课堂表现指标，等采集完成后会在这里展示。
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-slate-500">点击查看课程详情</span>
                        <div className="flex items-center gap-1 text-sky-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>进入课程页</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
            当前筛选条件下还没有课程数据。
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  );
};

export default CoursesPage;
