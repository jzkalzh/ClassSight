"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Brain, ChevronRight, Radar, Users } from "lucide-react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import TeacherProfileCard from "@/components/TeacherProfileCard";

interface TeacherDashboardData {
  teacher: {
    id: string;
    name: string;
    departmentName: string;
    rank: string;
    courseCount: number;
  };
  overview: {
    courseCount: number;
    monitoredCourseCount: number;
    averageScore: number;
    averageAttendance: number;
    averageFocusLevel: number;
    averageParticipationCount: number;
  };
  courses: Array<{
    id: string;
    name: string;
    code: string;
    scheduleLabel: string;
    location: string;
    studentCount: number;
    sessionCount: number;
    latestSessionAt: string | null;
    latestSessionStatus: string | null;
    status: "completed" | "pending" | "in-progress";
    statusLabel: string;
    metrics: {
      avgAttendance: number;
      avgLookUpRate: number;
      avgFocusLevel: number;
      avgParticipationCount: number;
      totalStudents: number;
      score: number;
    } | null;
  }>;
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无课时数据";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无课时数据";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TeacherHomePage: React.FC = () => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/teacher/dashboard", {
          credentials: "include",
        });

        if (!response.ok) {
          setData(null);
          return;
        }

        const result = await response.json();
        setData(result.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const rankedCourses = useMemo(() => {
    return [...(data?.courses || [])].sort((left, right) => {
      const leftScore = left.metrics?.score ?? -1;
      const rightScore = right.metrics?.score ?? -1;
      return rightScore - leftScore;
    });
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader />
      <StudentNavigation role={1} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
          <TeacherProfileCard
            teacherName={data?.teacher.name || "教师"}
            teacherId={data?.teacher.id || ""}
            collegeName={data?.teacher.departmentName || "未设置院系"}
            rank={data?.teacher.rank || "教师"}
            courseNumber={String(data?.teacher.courseCount || 0)}
          />

          <section className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Teacher Overview</p>
                <h1 className="mt-2 text-3xl font-semibold">课程综合分析</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  首页不再固定展示某一门课，而是汇总你所有课程最近一次已采集课时的综合状态。
                  进入单门课程后，再按课时选择查看对应报告。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100">
                已接入数据课程 {data?.overview.monitoredCourseCount ?? 0} / {data?.overview.courseCount ?? 0}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">课程综合分</span>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading ? "--" : data?.overview.averageScore.toFixed(1) || "0.0"}
                </p>
                <p className="mt-2 text-xs text-slate-300">按各课程最近一次课时表现综合计算</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">平均出勤</span>
                  <Users className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading ? "--" : formatPercent(data?.overview.averageAttendance || 0)}
                </p>
                <p className="mt-2 text-xs text-slate-300">汇总所有已采集课程的最近课时</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">平均专注</span>
                  <Brain className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading ? "--" : formatPercent(data?.overview.averageFocusLevel || 0)}
                </p>
                <p className="mt-2 text-xs text-slate-300">反映整体课堂跟随度与稳定性</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">平均互动</span>
                  <Radar className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading ? "--" : (data?.overview.averageParticipationCount || 0).toFixed(1)}
                </p>
                <p className="mt-2 text-xs text-slate-300">按各课程最近一节课的平均互动次数统计</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-sky-500">Course Matrix</p>
              <h2 className="mt-2 text-2xl font-semibold">各课程已有数据的综合表现</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                每张卡片代表该课程最近一次已采集的课时数据。点击后先选择课时，再查看具体展示模块。
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              共 {rankedCourses.length} 门课程
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {rankedCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{course.code}</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {course.scheduleLabel} · {course.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      course.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : course.status === "in-progress"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {course.statusLabel}
                  </span>
                </div>

                {course.metrics ? (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3 dark:bg-slate-950/50">
                      <p className="text-xs text-slate-500">综合分</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                        {course.metrics.score.toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 dark:bg-slate-950/50">
                      <p className="text-xs text-slate-500">出勤</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                        {formatPercent(course.metrics.avgAttendance)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 dark:bg-slate-950/50">
                      <p className="text-xs text-slate-500">专注</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                        {formatPercent(course.metrics.avgFocusLevel)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 dark:bg-slate-950/50">
                      <p className="text-xs text-slate-500">互动</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                        {course.metrics.avgParticipationCount.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                    这门课还没有采集到可分析的课时数据，接入边缘设备并完成一次课堂采集后，这里会自动显示综合结果。
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <div>
                    <p>{course.studentCount} 名学生</p>
                    <p className="mt-1">{course.sessionCount} 个课时单元</p>
                  </div>
                  <p>{formatDateTime(course.latestSessionAt)}</p>
                </div>

                <Link
                  href={`/home/performance/course/${course.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  选择课时查看
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-sky-500">Quick Focus</p>
              <h2 className="mt-2 text-2xl font-semibold">建议优先查看的课程</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {rankedCourses.slice(0, 3).map((course, index) => (
              <div
                key={course.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {index === 0 ? "当前表现最佳" : index === 1 ? "稳定课程" : "建议优先复盘"}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{course.name}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  最新课时：{formatDateTime(course.latestSessionAt)}
                </p>
                <p className="mt-4 text-3xl font-semibold">
                  {course.metrics ? course.metrics.score.toFixed(1) : "--"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">课程综合分</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
};

export default TeacherHomePage;
