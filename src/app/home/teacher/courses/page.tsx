"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarRange,
  Eye,
  Layers3,
  Users,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";

interface TeacherCoursesResponse {
  teacher: {
    id: string;
    name: string;
    departmentName: string;
  };
  stats: {
    totalCourses: number;
    activeCourses: number;
    monitoredCourses: number;
    totalStudents: number;
  };
  courses: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    description: string;
    departmentName: string;
    teacherName: string;
    scheduleLabel: string;
    location: string;
    studentCount: number;
    status: "pending" | "completed" | "in-progress";
    statusLabel: string;
    accent: string;
    avgAttendance: number | null;
    avgFocusLevel: number | null;
    avgLookUpRate: number | null;
    latestSessionAt: string | null;
  }>;
}

function formatMetric(value: number | null) {
  if (value == null) {
    return "--";
  }
  return `${value.toFixed(1)}%`;
}

const TeacherCoursesPage: React.FC = () => {
  const [data, setData] = useState<TeacherCoursesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/teacher/courses", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "加载教师课程失败");
        }

        setData(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载教师课程失败");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const spotlightCourse = useMemo(() => {
    if (!data?.courses.length) {
      return null;
    }

    return (
      data.courses.find((course) => course.status === "in-progress") ??
      data.courses.find((course) => course.status === "completed") ??
      data.courses[0]
    );
  }, [data]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight" />
      <StudentNavigation role={1} />

      <main className="container mx-auto px-4 py-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.18),_transparent_38%),linear-gradient(135deg,_#0f172a,_#1e293b)] px-6 py-8 text-white">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-200">Course Studio</p>
                <h1 className="mt-2 text-3xl font-semibold">教师课程控制台</h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-200">
                  把你的课程、采集状态、学生规模和课堂识别指标整合在一个页面里，方便你快速切换到需要关注的课堂。
                </p>
                {data ? (
                  <p className="mt-4 text-sm text-sky-100">
                    {data.teacher.name} · {data.teacher.departmentName}
                  </p>
                ) : null}
              </div>

              {spotlightCourse ? (
                <Link
                  href={`/home/performance/course/${spotlightCourse.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  进入焦点课程
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">课程总数</span>
                  <Layers3 className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{data?.stats.totalCourses ?? "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">进行中课程</span>
                  <CalendarRange className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{data?.stats.activeCourses ?? "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">已接入采集</span>
                  <Eye className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{data?.stats.monitoredCourses ?? "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">覆盖学生</span>
                  <Users className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{data?.stats.totalStudents ?? "--"}</p>
              </div>
            </div>
          </div>

          {spotlightCourse ? (
            <div className="grid gap-5 border-b border-slate-200 bg-slate-50/80 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={`rounded-3xl bg-gradient-to-br ${spotlightCourse.accent} p-[1px]`}>
                <div className="h-full rounded-[calc(1.5rem-1px)] bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">当前推荐关注</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{spotlightCourse.name}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {spotlightCourse.code} · {spotlightCourse.type}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      {spotlightCourse.statusLabel}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{spotlightCourse.description}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">排课时间</p>
                      <p className="mt-2 font-semibold text-slate-900">{spotlightCourse.scheduleLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">上课地点</p>
                      <p className="mt-2 font-semibold text-slate-900">{spotlightCourse.location}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">学生人数</p>
                      <p className="mt-2 font-semibold text-slate-900">{spotlightCourse.studentCount} 人</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">平均出勤</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {formatMetric(spotlightCourse.avgAttendance)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">平均抬头率</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {formatMetric(spotlightCourse.avgLookUpRate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">平均专注度</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {formatMetric(spotlightCourse.avgFocusLevel)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">课程矩阵</p>
                <h2 className="text-2xl font-semibold text-slate-900">我的课程</h2>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data?.courses.map((course) => (
                  <div
                    key={course.id}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                  >
                    <div className={`bg-gradient-to-r ${course.accent} p-5 text-white`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/80">{course.code}</p>
                          <h3 className="mt-2 text-xl font-semibold">{course.name}</h3>
                        </div>
                        <BookOpen className="h-6 w-6 text-white/80" />
                      </div>
                      <p className="mt-4 line-clamp-2 text-sm text-white/90">{course.description}</p>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {course.type}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                          {course.statusLabel}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        <p>{course.teacherName} · {course.departmentName}</p>
                        <p>{course.scheduleLabel} · {course.location}</p>
                        <p>{course.studentCount} 名学生</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-slate-50 p-3 text-center">
                          <p className="text-[11px] text-slate-500">出勤</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatMetric(course.avgAttendance)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 text-center">
                          <p className="text-[11px] text-slate-500">抬头</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatMetric(course.avgLookUpRate)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 text-center">
                          <p className="text-[11px] text-slate-500">专注</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatMetric(course.avgFocusLevel)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          最近会话：{course.latestSessionAt ? new Date(course.latestSessionAt).toLocaleString("zh-CN") : "暂无"}
                        </p>
                        <Link
                          href={`/home/performance/course/${course.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 transition group-hover:text-sky-900"
                        >
                          查看表现
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
};

export default TeacherCoursesPage;
