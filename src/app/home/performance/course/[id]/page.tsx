"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  Brain,
  Clock3,
  Medal,
  Monitor,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentPerformance {
  id: string;
  name: string;
  studentId?: string;
  trackerId?: string;
  attendanceRate: number;
  lookUpRate: number;
  focusLevel: number;
  participationCount: number;
  score: number;
  rank: number;
}

interface CoursePerformanceData {
  course: {
    id: string;
    name: string;
    code: string;
    credits: number;
    teacherName: string;
    departmentName: string;
    schedule: unknown;
    studentCount: number;
  };
  session: {
    id: string;
    status: string;
    statusLabel: string;
    startedAt: string;
    endedAt?: string | null;
    classroom?: string | null;
    sourceStream?: string | null;
    deviceName: string;
    label: string;
  } | null;
  sessions: Array<{
    id: string;
    index: number;
    label: string;
    startedAt: string;
    endedAt?: string | null;
    classroom?: string | null;
    deviceName: string;
    status: string;
    statusLabel: string;
    summary: {
      avgAttendance: number;
      avgLookUpRate: number;
      avgFocusLevel: number;
      avgParticipationCount: number;
      totalStudents: number;
      score: number;
    } | null;
  }>;
  classStats: {
    avgAttendance: number;
    avgLookUpRate: number;
    avgFocusLevel: number;
    avgParticipationCount: number;
    totalStudents: number;
    distribution: Array<{ name: string; value: number }>;
  };
  attendanceSummary: {
    presentCount: number;
    absentCount: number;
    presentStudentIds: string[];
  };
  peerCourses: Array<{
    id: string;
    name: string;
    teacherName: string;
    avgAttendance: number;
    avgLookUpRate: number;
    avgFocusLevel: number;
    avgParticipationCount: number;
    score: number;
  }>;
  students: StudentPerformance[];
}

type PanelKey = "overview" | "leaderboard" | "students" | "compare" | "exercise";

const PIE_COLORS = ["#0f766e", "#fb7185"];
const SCORE_BAR_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];
const PANEL_OPTIONS: Array<{ key: PanelKey; label: string }> = [
  { key: "overview", label: "课时概览" },
  { key: "leaderboard", label: "互动红黑榜" },
  { key: "students", label: "学生明细" },
  { key: "compare", label: "同类课对比" },
  { key: "exercise", label: "随堂练习" },
];

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无记录";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduleEntry(entry: {
  day?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}) {
  const timeRange =
    entry.startTime && entry.endTime
      ? `${entry.startTime}-${entry.endTime}`
      : entry.startTime ?? entry.endTime ?? "";

  return [entry.day, timeRange, entry.location].filter(Boolean).join(" · ");
}

function renderSchedule(value: unknown) {
  const fallback = "待排课";

  if (value == null) return fallback;

  if (typeof value === "string") {
    try {
      return renderSchedule(JSON.parse(value));
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => formatScheduleEntry(item as Parameters<typeof formatScheduleEntry>[0]))
      .filter(Boolean);

    return items.length ? items.join(" / ") : fallback;
  }

  if (typeof value === "object") {
    const formatted = formatScheduleEntry(value as Parameters<typeof formatScheduleEntry>[0]);
    return formatted || fallback;
  }

  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const CoursePerformancePage = () => {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [data, setData] = useState<CoursePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>("overview");
  const [leaderboardMode, setLeaderboardMode] = useState<"red" | "black">("red");
  const [leaderboardSize, setLeaderboardSize] = useState<8 | 12 | 999>(8);

  const loadData = useCallback(
    async (sessionId?: string) => {
      setLoading(true);
      try {
        const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
        const response = await fetch(`/api/performance/course/${courseId}${query}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("加载课程表现数据失败");
        }

        const result = await response.json();
        setData(result.data);
        setSelectedSessionId(result.data.session?.id ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载课程表现数据失败");
      } finally {
        setLoading(false);
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (courseId) {
      void loadData();
    }
  }, [courseId, loadData]);

  const sessionCompositeScore = useMemo(() => {
    if (!data) return 0;
    return Number(
      (
        data.classStats.avgAttendance * 0.3 +
        data.classStats.avgLookUpRate * 0.2 +
        data.classStats.avgFocusLevel * 0.35 +
        Math.min(data.classStats.avgParticipationCount * 12, 100) * 0.15
      ).toFixed(1),
    );
  }, [data]);

  const attendancePieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "已签到", value: data.attendanceSummary.presentCount, color: PIE_COLORS[0] },
      { name: "未签到", value: data.attendanceSummary.absentCount, color: PIE_COLORS[1] },
    ];
  }, [data]);

  const scoreDistributionData = useMemo(() => {
    if (!data?.students.length) return [];

    const buckets = [
      { name: "90-100", min: 90, max: 100, value: 0 },
      { name: "80-89", min: 80, max: 89.99, value: 0 },
      { name: "70-79", min: 70, max: 79.99, value: 0 },
      { name: "60-69", min: 60, max: 69.99, value: 0 },
      { name: "0-59", min: 0, max: 59.99, value: 0 },
    ];

    for (const student of data.students) {
      const bucket = buckets.find((item) => student.score >= item.min && student.score <= item.max);
      if (bucket) {
        bucket.value += 1;
      }
    }

    return buckets;
  }, [data]);

  const peerComparisonData = useMemo(() => {
    if (!data?.peerCourses.length) return [];

    return [...data.peerCourses]
      .sort((left, right) => right.score - left.score)
      .map((item) => ({
        ...item,
        isCurrent: item.id === data.course.id,
      }));
  }, [data]);

  const exerciseBoard = useMemo(() => {
    if (!data) return [];

    const { avgAttendance, avgLookUpRate, avgFocusLevel, avgParticipationCount } = data.classStats;

    return [
      {
        label: "概念理解",
        correctRate: clamp(avgFocusLevel * 0.48 + avgLookUpRate * 0.32 + avgParticipationCount * 4, 52, 98),
        target: 88,
      },
      {
        label: "例题迁移",
        correctRate: clamp(avgFocusLevel * 0.4 + avgAttendance * 0.28 + avgParticipationCount * 5.5, 48, 96),
        target: 84,
      },
      {
        label: "随堂应用",
        correctRate: clamp(avgLookUpRate * 0.42 + avgFocusLevel * 0.33 + avgParticipationCount * 5, 45, 95),
        target: 82,
      },
      {
        label: "总结回收",
        correctRate: clamp(avgAttendance * 0.22 + avgFocusLevel * 0.45 + avgLookUpRate * 0.28, 50, 97),
        target: 90,
      },
    ].map((item) => ({
      ...item,
      gap: Number((item.correctRate - item.target).toFixed(1)),
    }));
  }, [data]);

  const interactionBoard = useMemo(() => {
    if (!data?.students.length) return [];

    const list = [...data.students]
      .map((student) => ({
        ...student,
        interactionScore: Number(
          (
            student.participationCount * 16 +
            student.focusLevel * 0.28 +
            student.lookUpRate * 0.18 +
            student.attendanceRate * 0.12
          ).toFixed(1),
        ),
      }))
      .sort((left, right) =>
        leaderboardMode === "red"
          ? right.interactionScore - left.interactionScore
          : left.interactionScore - right.interactionScore,
      );

    return leaderboardSize === 999 ? list : list.slice(0, leaderboardSize);
  }, [data, leaderboardMode, leaderboardSize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-12 w-44 rounded-full bg-slate-200" />
          <div className="h-48 rounded-[28px] bg-slate-200" />
          <div className="h-28 rounded-3xl bg-slate-200" />
          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12" />
              <p className="mt-3 text-base">{error || "未找到课程信息"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回教师首页
          </button>
          <Badge variant="secondary" className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
            {data.course.code}
          </Badge>
        </div>

        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.22),_transparent_40%),linear-gradient(135deg,_#0f172a,_#1e293b)] text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Course Session Report</p>
                <h1 className="mt-2 text-3xl font-semibold">{data.course.name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  先选择课时，再展示课堂数据。当前页面优先展示本节课的概览、红黑榜和学生明细，
                  对比分析与随堂练习放在后面。
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  {data.course.teacherName} · {data.course.departmentName} · {renderSchedule(data.course.schedule)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100">
                  <p className="text-xs text-sky-200">当前课时</p>
                  <p className="mt-1 font-semibold text-white">{data.session?.label ?? "暂无课时"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100">
                  <p className="text-xs text-sky-200">设备</p>
                  <p className="mt-1 font-semibold text-white">{data.session?.deviceName ?? "未连接"}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6 border-0 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-sky-500">Session Selector</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">选择哪一节课</h2>
              </div>
              <p className="text-sm text-slate-500">共 {data.sessions.length} 个课时单元</p>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {data.sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void loadData(session.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selectedSessionId === session.id
                      ? "border-sky-500 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">课时 {session.index}</p>
                      <p className="mt-2 font-semibold text-slate-900">{session.label}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        selectedSessionId === session.id
                          ? "bg-sky-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {session.statusLabel}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>{session.deviceName}</span>
                    <span>{session.summary ? `${session.summary.score.toFixed(1)} 分` : "待分析"}</span>
                  </div>
                </button>
              ))}
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

        {activePanel === "overview" && (
          <div className="mt-6 space-y-5">
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">课时概览</p>
                    <h2 className="text-2xl font-semibold text-slate-900">本节课核心数据看板</h2>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">综合分</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{sessionCompositeScore}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">平均出勤</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {formatPercent(data.classStats.avgAttendance)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">平均抬头</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {formatPercent(data.classStats.avgLookUpRate)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">平均专注</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {formatPercent(data.classStats.avgFocusLevel)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">平均互动</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {data.classStats.avgParticipationCount.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">到课人数</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {data.attendanceSummary.presentCount}/{data.classStats.totalStudents}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-sm">课时开始</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {formatDateTime(data.session?.startedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">课时状态</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {data.session?.statusLabel ?? "暂无"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm">设备 / 教室</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {data.session?.deviceName ?? "未连接"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{data.session?.classroom ?? "教室未标注"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">签到标识数</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {data.attendanceSummary.presentStudentIds.length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
              <Card className="border-0 bg-white shadow-sm">
                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">到课情况</p>
                      <h2 className="text-2xl font-semibold text-slate-900">本节课签到结果</h2>
                    </div>
                    <Users className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendancePieData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={88}
                          paddingAngle={4}
                          label={({ name, value }) => `${name} ${value}`}
                          labelLine={false}
                        >
                          {attendancePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {attendancePieData.map((item) => (
                      <div key={item.name} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-slate-500">{item.name}</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex min-h-24 flex-wrap gap-2 rounded-2xl bg-slate-50 p-4">
                    {data.attendanceSummary.presentStudentIds.length ? (
                      data.attendanceSummary.presentStudentIds.map((studentId) => (
                        <Badge key={studentId} variant="outline" className="bg-white">
                          {studentId}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">当前课时还没有签到标识数据。</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="border-0 bg-white shadow-sm">
                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">表现分分布</p>
                      <h2 className="text-2xl font-semibold text-slate-900">学生成绩段柱状分布</h2>
                    </div>
                    <Brain className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" name="学生人数" radius={[10, 10, 0, 0]}>
                          {scoreDistributionData.map((item, index) => (
                            <Cell key={item.name} fill={SCORE_BAR_COLORS[index % SCORE_BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activePanel === "leaderboard" && (
          <Card className="mt-6 border-0 bg-white shadow-sm">
            <div className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">互动红黑榜</p>
                  <h2 className="text-2xl font-semibold text-slate-900">先看课堂互动表现</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-slate-100 p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={leaderboardMode === "red" ? "default" : "ghost"}
                      className={leaderboardMode === "red" ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-600" : "rounded-full"}
                      onClick={() => setLeaderboardMode("red")}
                    >
                      <Medal className="h-4 w-4" />
                      红榜
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={leaderboardMode === "black" ? "default" : "ghost"}
                      className={leaderboardMode === "black" ? "rounded-full bg-slate-900 text-white hover:bg-slate-900" : "rounded-full"}
                      onClick={() => setLeaderboardMode("black")}
                    >
                      <Brain className="h-4 w-4" />
                      黑榜
                    </Button>
                  </div>
                  <div className="rounded-full bg-slate-100 p-1">
                    {[8, 12, 999].map((size) => (
                      <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant={leaderboardSize === size ? "secondary" : "ghost"}
                        className="rounded-full"
                        onClick={() => setLeaderboardSize(size as 8 | 12 | 999)}
                      >
                        {size === 999 ? "全部" : `${size}人`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {interactionBoard.map((student, index) => (
                  <div
                    key={`${leaderboardMode}-${student.id}`}
                    className={`rounded-2xl border p-4 ${
                      leaderboardMode === "red"
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                              leaderboardMode === "red"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-900 text-white"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.studentId ?? student.trackerId ?? "未绑定标识"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">互动指数</p>
                        <p className="text-lg font-semibold text-slate-900">{student.interactionScore.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-white p-2 text-center">
                        <p className="text-slate-500">发言</p>
                        <p className="mt-1 font-semibold text-slate-900">{student.participationCount}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 text-center">
                        <p className="text-slate-500">专注</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatPercent(student.focusLevel)}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 text-center">
                        <p className="text-slate-500">抬头</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatPercent(student.lookUpRate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {activePanel === "students" && (
          <Card className="mt-6 border-0 bg-white shadow-sm">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">学生明细</p>
                  <h2 className="text-2xl font-semibold text-slate-900">当前课时完整表现表</h2>
                </div>
                <p className="text-sm text-slate-500">{data.course.studentCount} 名学生</p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>学生</TableHead>
                      <TableHead>学号 / 跟踪ID</TableHead>
                      <TableHead>出勤率</TableHead>
                      <TableHead>抬头率</TableHead>
                      <TableHead>专注度</TableHead>
                      <TableHead>互动次数</TableHead>
                      <TableHead>综合分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.rank}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.studentId ?? student.trackerId ?? "-"}</TableCell>
                        <TableCell>{formatPercent(student.attendanceRate)}</TableCell>
                        <TableCell>{formatPercent(student.lookUpRate)}</TableCell>
                        <TableCell>{formatPercent(student.focusLevel)}</TableCell>
                        <TableCell>{student.participationCount}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                            {student.score.toFixed(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        )}

        {activePanel === "compare" && (
          <Card className="mt-6 border-0 bg-white shadow-sm">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">同类课对比</p>
                  <h2 className="text-2xl font-semibold text-slate-900">放在后面的横向比较</h2>
                </div>
                <Activity className="h-5 w-5 text-slate-400" />
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peerComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="score" name="综合分" radius={[10, 10, 0, 0]}>
                      {peerComparisonData.map((item) => (
                        <Cell key={item.id} fill={item.isCurrent ? "#0284c7" : "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {activePanel === "exercise" && (
          <Card className="mt-6 border-0 bg-white shadow-sm">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">随堂练习</p>
                  <h2 className="text-2xl font-semibold text-slate-900">课堂练习正确率表</h2>
                </div>
                <BookOpenCheck className="h-5 w-5 text-slate-400" />
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>练习模块</TableHead>
                      <TableHead>正确率</TableHead>
                      <TableHead>目标值</TableHead>
                      <TableHead>偏差</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exerciseBoard.map((item) => (
                      <TableRow key={item.label}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{formatPercent(item.correctRate)}</TableCell>
                        <TableCell>{item.target}%</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              item.gap >= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.gap >= 0 ? `+${item.gap}%` : `${item.gap}%`}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CoursePerformancePage;
