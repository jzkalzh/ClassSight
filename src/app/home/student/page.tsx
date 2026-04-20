"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import PageFooter from "@/components/PageFooter";
import PageHeader from "@/components/PageHeader";
import PerformanceChart from "@/components/PerformanceChart";
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
    id: string;
    name: string;
    className: string;
    major: string;
    departmentName: string;
  };
  overview: {
    attendanceRate: number;
    focusLevel: number;
    score: number;
    courseCount: number;
  };
  currentCourse: {
    id: string;
    name: string;
    teacherName: string;
    scheduleLabel: string;
    location: string;
    status: "pending" | "completed" | "in-progress";
  } | null;
  todayCourses: StudentCourse[];
  courses: StudentCourse[];
};

type StudentPanelKey = "portrait" | "schedule" | "performance";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getStatusMeta(status: StudentCourse["status"]) {
  if (status === "in-progress") {
    return {
      label: "进行中",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "completed") {
    return {
      label: "已采集",
      className: "bg-sky-100 text-sky-700",
    };
  }

  return {
    label: "待接入",
    className: "bg-amber-100 text-amber-700",
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const PANEL_OPTIONS: Array<{ key: StudentPanelKey; label: string }> = [
  { key: "portrait", label: "学习画像" },
  { key: "schedule", label: "课程安排" },
  { key: "performance", label: "表现概览" },
];

const StudentHomePage: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState<StudentPanelKey>("portrait");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/student/dashboard", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "加载学生首页失败");
        }

        setData(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载学生首页失败");
      }
    };

    void load();
  }, []);

  const rankedCourses = useMemo(() => {
    if (!data?.courses.length) return [];

    return [...data.courses]
      .filter((course) => course.metrics)
      .sort((left, right) => (right.metrics?.score ?? 0) - (left.metrics?.score ?? 0));
  }, [data]);

  const strongestCourse = rankedCourses[0] ?? null;
  const watchCourse = rankedCourses[rankedCourses.length - 1] ?? null;

  const studySignals = useMemo(() => {
    if (!data) return [];

    const overview = data.overview;
    const activeCourses = data.todayCourses.filter((course) => course.status === "in-progress").length;
    const averageLookUp = average(
      data.courses
        .map((course) => course.metrics?.lookUpRate ?? 0)
        .filter((value) => value > 0),
    );

    return [
      {
        title: "学习状态",
        value:
          overview.focusLevel >= 85
            ? "稳态优秀"
            : overview.focusLevel >= 72
              ? "节奏良好"
              : "需要提振",
        description:
          overview.focusLevel >= 85
            ? "当前专注度比较稳定，适合继续加深理解。"
            : overview.focusLevel >= 72
              ? "保持住课堂响应，近期成绩还有提升空间。"
              : "建议先把注意力拉回到课堂关键节点。",
        icon: Brain,
        tone: "from-sky-500 to-cyan-400",
      },
      {
        title: "当日节奏",
        value: `${activeCourses} 门进行中`,
        description:
          data.todayCourses.length > 0
            ? `今天共安排 ${data.todayCourses.length} 门课程，建议优先处理最近一门。`
            : "今天暂无课程安排，可以回顾近期表现。",
        icon: CalendarClock,
        tone: "from-emerald-500 to-lime-400",
      },
      {
        title: "课堂跟随",
        value: averageLookUp ? formatPercent(averageLookUp) : "暂无",
        description:
          averageLookUp >= 78
            ? "你的课堂视线跟随表现不错。"
            : "可以尝试在老师切换板书时主动抬头跟上节奏。",
        icon: Target,
        tone: "from-violet-500 to-fuchsia-400",
      },
    ];
  }, [data]);

  const nextActions = useMemo(() => {
    if (!data) return [];

    return [
      {
        title: "优先关注课程",
        body: watchCourse
          ? `${watchCourse.name} 当前综合分偏低，建议先复盘老师讲过的关键点。`
          : "当前还没有足够课程数据，先完成课堂采集后会自动给建议。",
      },
      {
        title: "最强课程",
        body: strongestCourse
          ? `${strongestCourse.name} 是你目前表现最稳的一门课，可以保持当前学习节奏。`
          : "暂时还没有形成稳定优势课程。",
      },
      {
        title: "出勤提醒",
        body:
          (data.overview.attendanceRate ?? 0) >= 95
            ? "你的出勤状态很好，继续保持。"
            : "建议优先保证按时到课，出勤率会直接影响整体画像。",
      },
    ];
  }, [data, strongestCourse, watchCourse]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_36%,#f8fafc_100%)] text-gray-900">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Student Learning Deck</p>
                <h1 className="mt-3 text-3xl font-semibold">
                  欢迎回来，{data?.student.name || "同学"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  学生端也改成了分模块查看。你可以先看学习画像，再切到课程安排或表现概览，
                  不会像之前那样一页拉得很长。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">院系 / 专业</p>
                  <p className="mt-1 font-semibold text-white">
                    {data?.student.departmentName || "未设置"} / {data?.student.major || "未设置"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs text-sky-200">班级 / 学号</p>
                  <p className="mt-1 font-semibold text-white">
                    {data?.student.className || "未设置"} / {data?.student.id || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">平均出勤</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {formatPercent(data?.overview.attendanceRate ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">平均专注</span>
                  <Brain className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {formatPercent(data?.overview.focusLevel ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">综合得分</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{(data?.overview.score ?? 0).toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sky-100">
                  <span className="text-sm">课程数量</span>
                  <BookOpen className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{data?.overview.courseCount ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6 border-0 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {PANEL_OPTIONS.map((panel) => (
                <Button
                  key={panel.key}
                  type="button"
                  variant={activePanel === panel.key ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setActivePanel(panel.key)}
                >
                  {panel.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {activePanel === "portrait" && (
          <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-5">
              <Card className="border-0 bg-white shadow-sm">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">个人学习画像</p>
                      <h2 className="text-xl font-semibold text-slate-900">今天的你处在什么状态</h2>
                    </div>
                    <UserRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    {studySignals.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-2xl bg-gradient-to-br ${item.tone} p-3 text-white`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <span className="text-sm font-medium text-slate-700">{item.value}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="border-0 bg-white shadow-sm">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">学习建议</p>
                      <h2 className="text-xl font-semibold text-slate-900">下一步该做什么</h2>
                    </div>
                    <Sparkles className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="grid gap-3">
                    {nextActions.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            <section>
              <Card className="border-0 bg-white shadow-sm">
                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">当前课程</p>
                      <h2 className="text-xl font-semibold text-slate-900">本节课的学习状态</h2>
                    </div>
                    <Badge
                      className={
                        data?.currentCourse
                          ? getStatusMeta(data.currentCourse.status).className
                          : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                      }
                    >
                      {data?.currentCourse ? getStatusMeta(data.currentCourse.status).label : "暂无课程"}
                    </Badge>
                  </div>

                  {data?.currentCourse ? (
                    <div className="rounded-3xl bg-[linear-gradient(135deg,#eff6ff,#ecfeff)] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900">{data.currentCourse.name}</h3>
                          <p className="mt-2 text-sm text-slate-600">{data.currentCourse.teacherName}</p>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-sky-600" />
                            <span>{data.currentCourse.scheduleLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            <span>{data.currentCourse.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      当前还没有可展示的课堂会话，可以先切到课程安排模块查看。
                    </div>
                  )}
                </div>
              </Card>
            </section>
          </div>
        )}

        {activePanel === "schedule" && (
          <div className="mt-6">
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">今日课程</p>
                    <h2 className="text-xl font-semibold text-slate-900">你的学习日程</h2>
                  </div>
                  <GraduationCap className="h-5 w-5 text-slate-400" />
                </div>
                <div className="space-y-3">
                  {data?.todayCourses.length ? (
                    data.todayCourses.map((course) => {
                      const statusMeta = getStatusMeta(course.status);

                      return (
                        <div
                          key={course.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{course.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{course.teacherName}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-sky-600" />
                              <span>{course.scheduleLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-emerald-600" />
                              <span>{course.location}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      今天还没有课程安排，适合回顾近期表现。
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activePanel === "performance" && (
          <div className="mt-6">
            <PerformanceChart title="近期表现概览" dashboardData={data ?? undefined} />
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  );
};

export default StudentHomePage;
