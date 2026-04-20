"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Brain,
  ChevronRight,
  Eye,
  Radar,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceChartProps {
  title?: string;
}

interface DashboardStudent {
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

interface TeacherDashboardData {
  teacher: {
    id: string;
    name: string;
    departmentName: string;
    rank: string;
    courseCount: number;
  };
  courseOverview: {
    currentCourse: {
      id: string;
      name: string;
      code: string;
      scheduleLabel: string;
      location: string;
      studentCount: number;
      status: string;
      statusLabel: string;
    } | null;
    todayCourses: Array<{
      id: string;
      name: string;
      code: string;
      scheduleLabel: string;
      location: string;
      studentCount: number;
      status: string;
      statusLabel: string;
    }>;
    monitoredCourseCount: number;
  };
  performance: {
    courseId: string;
    courseName: string;
    courseCode: string;
    session: {
      id: string;
      status: string;
      startedAt: string;
      endedAt?: string | null;
      classroom?: string | null;
      sourceStream?: string | null;
      deviceName: string;
    } | null;
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
    students: DashboardStudent[];
    topStudents: DashboardStudent[];
    attentionStudents: DashboardStudent[];
  } | null;
}

const PIE_COLORS = ["#0f766e", "#fb7185"];
const BAR_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无记录";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const StudentPerformanceChart: React.FC<PerformanceChartProps> = ({
  title = "学生表现总览",
}) => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/teacher/dashboard", {
          credentials: "include",
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error || "加载教师首页数据失败");
        }

        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载教师首页数据失败");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const rankingData = useMemo(() => {
    if (!data?.performance) return [];
    return data.performance.topStudents.map((student) => ({
      name: student.name,
      score: Number(student.score.toFixed(1)),
      focusLevel: Number(student.focusLevel.toFixed(1)),
    }));
  }, [data]);

  const trendData = useMemo(() => {
    if (!data?.performance) return [];
    return data.performance.students.slice(0, 8).map((student) => ({
      name: student.name,
      attendanceRate: Number(student.attendanceRate.toFixed(1)),
      lookUpRate: Number(student.lookUpRate.toFixed(1)),
      focusLevel: Number(student.focusLevel.toFixed(1)),
    }));
  }, [data]);

  const attendancePieData = useMemo(() => {
    if (!data?.performance) return [];
    return [
      { name: "已签到", value: data.performance.attendanceSummary.presentCount },
      { name: "未签到", value: data.performance.attendanceSummary.absentCount },
    ];
  }, [data]);

  const courseInsights = useMemo(() => {
    if (!data?.performance) return null;

    const metricEntries = [
      {
        label: "出勤率",
        value: data.performance.classStats.avgAttendance,
        suggestion: "继续保持签到节奏，同时优先关注迟到与缺勤学生。",
      },
      {
        label: "抬头率",
        value: data.performance.classStats.avgLookUpRate,
        suggestion: "建议加入更多提问、板书切换或走动教学，提升学生视线跟随度。",
      },
      {
        label: "专注度",
        value: data.performance.classStats.avgFocusLevel,
        suggestion: "可在知识点切换时插入短互动，帮助学生重新聚焦。",
      },
    ];

    const strongestMetric = metricEntries.reduce((best, current) =>
      current.value > best.value ? current : best,
    );
    const weakestMetric = metricEntries.reduce((best, current) =>
      current.value < best.value ? current : best,
    );
    const dominantGroup = [...data.performance.classStats.distribution].sort(
      (left, right) => right.value - left.value,
    )[0];
    const topAverageScore =
      data.performance.topStudents.reduce((sum, student) => sum + student.score, 0) /
      Math.max(data.performance.topStudents.length, 1);

    return {
      strongestMetric,
      weakestMetric,
      dominantGroup,
      topAverageScore,
      attentionCount: data.performance.attentionStudents.length,
    };
  }, [data]);

  const commandCenter = useMemo(() => {
    if (!data?.performance || !courseInsights) return null;

    const attendanceGap =
      data.performance.classStats.totalStudents - data.performance.attendanceSummary.presentCount;
    const weakMetricDelta = courseInsights.strongestMetric.value - courseInsights.weakestMetric.value;
    const riskLevel =
      attendanceGap >= 6 || courseInsights.attentionCount >= 5
        ? "high"
        : attendanceGap >= 3 || courseInsights.attentionCount >= 2
          ? "medium"
          : "low";

    const headline =
      riskLevel === "high"
        ? "本节课需要立即干预"
        : riskLevel === "medium"
          ? "课堂状态可控，但有波动"
          : "课堂状态整体稳定";

    const summary =
      riskLevel === "high"
        ? "优先处理缺勤和风险学生，再调整课堂节奏。"
        : riskLevel === "medium"
          ? "建议先做一次提问或互动，拉齐前后排专注状态。"
          : "可以保持当前节奏，适合推进新内容或课堂总结。";

    return {
      attendanceGap,
      weakMetricDelta,
      riskLevel,
      headline,
      summary,
    };
  }, [courseInsights, data]);

  const rhythmTimeline = useMemo(() => {
    if (!data?.performance || !courseInsights) return [];

    return [
      {
        label: "课前签到",
        value: data.performance.classStats.avgAttendance,
        description: `${data.performance.attendanceSummary.presentCount}/${data.performance.classStats.totalStudents} 人到课`,
        tone: data.performance.classStats.avgAttendance >= 90 ? "emerald" : "amber",
      },
      {
        label: "课堂跟随",
        value: data.performance.classStats.avgLookUpRate,
        description: `抬头率 ${formatPercent(data.performance.classStats.avgLookUpRate)}`,
        tone: data.performance.classStats.avgLookUpRate >= 70 ? "sky" : "amber",
      },
      {
        label: "深度专注",
        value: data.performance.classStats.avgFocusLevel,
        description: `专注度 ${formatPercent(data.performance.classStats.avgFocusLevel)}`,
        tone: data.performance.classStats.avgFocusLevel >= 75 ? "violet" : "amber",
      },
      {
        label: "互动产出",
        value: Math.min(data.performance.classStats.avgParticipationCount * 20, 100),
        description: `平均互动 ${data.performance.classStats.avgParticipationCount.toFixed(1)} 次`,
        tone: data.performance.classStats.avgParticipationCount >= 3 ? "rose" : "slate",
      },
    ];
  }, [courseInsights, data]);

  const strategyCards = useMemo(() => {
    if (!data?.performance || !courseInsights || !commandCenter) return [];

    return [
      {
        title: "优先动作",
        body: courseInsights.weakestMetric.suggestion,
        icon: Target,
        tone:
          commandCenter.riskLevel === "high"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-amber-200 bg-amber-50 text-amber-700",
      },
      {
        title: "班级信号",
        body: `当前主体分布为“${courseInsights.dominantGroup?.name ?? "稳定"}”，强弱指标差值 ${commandCenter.weakMetricDelta.toFixed(1)}。`,
        icon: Activity,
        tone: "border-sky-200 bg-sky-50 text-sky-700",
      },
      {
        title: "风险提示",
        body: `未到课 ${commandCenter.attendanceGap} 人，重点关注 ${courseInsights.attentionCount} 人。`,
        icon: ShieldAlert,
        tone:
          commandCenter.riskLevel === "low"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-700",
      },
    ];
  }, [commandCenter, courseInsights, data]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-5">
          <div className="h-7 w-48 rounded-full bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="h-80 rounded-2xl bg-slate-100" />
            <div className="h-80 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>{error || "暂时无法加载教师表现数据"}</p>
        </div>
      </div>
    );
  }

  const { teacher, courseOverview, performance } = data;

  if (!performance) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-200">Teacher Pulse</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            {teacher.name}，当前还没有课堂监测数据。边缘设备开始上传后，这里会自动展示签到、专注度、
            抬头率和学生分层结果。
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">授课课程</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{teacher.courseCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">已接入监测</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {courseOverview.monitoredCourseCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">建议动作</p>
            <p className="mt-2 text-lg font-medium text-slate-900">
              先启动一门课程的数据采集，再返回这里查看画像。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.22),_transparent_40%),linear-gradient(135deg,_#0f172a,_#1e293b)] p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-200">Teacher Insight Deck</p>
            <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-200">
              当前聚焦 <span className="font-semibold text-white">{performance.courseName}</span>，
              将签到、抬头率、专注度和课堂参与度整合成可直接用于教学观察的面板。
            </p>
          </div>
          <Link
            href={`/home/performance/course/${performance.courseId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            查看完整课堂报告
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sky-100">
              <span className="text-sm">班级出勤</span>
              <Users className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold">
              {formatPercent(performance.classStats.avgAttendance)}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              已签到 {performance.attendanceSummary.presentCount} / {performance.classStats.totalStudents} 人
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sky-100">
              <span className="text-sm">抬头率</span>
              <Eye className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold">
              {formatPercent(performance.classStats.avgLookUpRate)}
            </p>
            <p className="mt-2 text-xs text-slate-300">可快速观察学生是否跟随课堂节奏</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sky-100">
              <span className="text-sm">专注度</span>
              <Brain className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold">
              {formatPercent(performance.classStats.avgFocusLevel)}
            </p>
            <p className="mt-2 text-xs text-slate-300">综合课堂行为数据计算得到的整体状态</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sky-100">
              <span className="text-sm">课堂参与</span>
              <Radar className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold">
              {performance.classStats.avgParticipationCount.toFixed(1)}
            </p>
            <p className="mt-2 text-xs text-slate-300">平均互动次数，适合衡量课堂活跃度</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">课程画像</p>
              <h3 className="text-xl font-semibold text-slate-900">{performance.courseName}</h3>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
              {performance.courseCode}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">当前课程</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {courseOverview.currentCourse?.name ?? "暂无"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {courseOverview.currentCourse?.scheduleLabel ?? "待排课"} ·{" "}
                {courseOverview.currentCourse?.location ?? "教室待定"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">采集设备</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {performance.session?.deviceName ?? "未连接"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                状态：{performance.session?.status ?? "无采集会话"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">今日课程数</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {courseOverview.todayCourses.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                已接入监测 {courseOverview.monitoredCourseCount} 门
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">课堂快照</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {performance.session?.classroom ?? courseOverview.currentCourse?.location ?? "教室待定"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {performance.session?.status ?? "未采集"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">开始时间</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(performance.session?.startedAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">结束时间</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(performance.session?.endedAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">到课人数</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {performance.attendanceSummary.presentCount} / {performance.classStats.totalStudents}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">重点关注</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {courseInsights?.attentionCount ?? 0} 人
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                数据源：{performance.session?.sourceStream ?? "边缘设备课堂采集流"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">画像解读</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600">当前强项</p>
                  <p className="mt-1 text-base font-semibold text-emerald-900">
                    {courseInsights?.strongestMetric.label ?? "暂无"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {courseInsights ? formatPercent(courseInsights.strongestMetric.value) : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs text-amber-600">优先优化</p>
                  <p className="mt-1 text-base font-semibold text-amber-900">
                    {courseInsights?.weakestMetric.label ?? "暂无"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    {courseInsights?.weakestMetric.suggestion ?? "等待课堂行为数据。"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">高分学生均值</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {(courseInsights?.topAverageScore ?? 0).toFixed(1)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  可作为本节课的正向样本，对照观察课堂节奏和互动设计。
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">分层结构</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                主体分布：{courseInsights?.dominantGroup?.name ?? "暂无"}
              </p>
              <div className="mt-4 space-y-3">
                {performance.classStats.distribution.map((item) => {
                  const denominator = Math.max(performance.classStats.totalStudents, 1);
                  const width = Math.max((item.value / denominator) * 100, item.value ? 12 : 0);

                  return (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-medium text-slate-900">{item.value} 人</span>
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
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                当前班级更偏向
                <span className="mx-1 font-semibold text-slate-900">
                  {courseInsights?.dominantGroup?.name ?? "稳定"}
                </span>
                状态，适合结合风险学生名单做针对性提醒。
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.95))] p-5 text-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-sky-200">Classroom Command</p>
                  <h4 className="mt-2 text-xl font-semibold">
                    {commandCenter?.headline ?? "课堂状态分析中"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {commandCenter?.summary ?? "等待课堂画像数据。"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    commandCenter?.riskLevel === "high"
                      ? "bg-rose-500/20 text-rose-200"
                      : commandCenter?.riskLevel === "medium"
                        ? "bg-amber-500/20 text-amber-100"
                        : "bg-emerald-500/20 text-emerald-100"
                  }`}
                >
                  {commandCenter?.riskLevel === "high"
                    ? "高风险"
                    : commandCenter?.riskLevel === "medium"
                      ? "中等波动"
                      : "稳定"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {strategyCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className={`rounded-2xl border p-4 ${item.tone}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <p className="text-sm font-semibold">{item.title}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6">{item.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">课堂节奏</p>
                  <h4 className="text-lg font-semibold text-slate-900">四段式进程</h4>
                </div>
                <Activity className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4">
                {rhythmTimeline.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.value.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full ${
                          item.tone === "emerald"
                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                            : item.tone === "sky"
                              ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                              : item.tone === "violet"
                                ? "bg-gradient-to-r from-violet-500 to-fuchsia-400"
                                : item.tone === "rose"
                                  ? "bg-gradient-to-r from-rose-500 to-pink-400"
                                  : "bg-gradient-to-r from-slate-500 to-slate-400"
                        }`}
                        style={{ width: `${Math.min(item.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 h-80 rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">高分学生排行</p>
                <p className="text-base font-semibold text-slate-900">课堂综合分前 6 名</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="综合分" radius={[10, 10, 0, 0]}>
                  {rankingData.map((_, index) => (
                    <Cell key={`score-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="focusLevel" name="专注度" radius={[10, 10, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="mb-4">
              <p className="text-sm text-slate-500">签到看板</p>
              <h3 className="text-xl font-semibold text-slate-900">到课情况</h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    dataKey="value"
                    paddingAngle={4}
                  >
                    {attendancePieData.map((_, index) => (
                      <Cell key={`attendance-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {performance.attendanceSummary.presentStudentIds.slice(0, 10).map((studentId) => (
                <span
                  key={studentId}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                >
                  {studentId}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="mb-4">
              <p className="text-sm text-slate-500">风险学生</p>
              <h3 className="text-xl font-semibold text-slate-900">优先关注对象</h3>
            </div>
            <div className="space-y-3">
              {performance.attentionStudents.length ? (
                performance.attentionStudents.map((student) => (
                  <div key={student.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.studentId ?? student.trackerId ?? "未绑定学号"}
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                        需关注
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-slate-500">出勤</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatPercent(student.attendanceRate)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-slate-500">抬头</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatPercent(student.lookUpRate)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-slate-500">专注</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatPercent(student.focusLevel)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
                  当前没有明显需要重点干预的学生，课堂整体状态比较稳定。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 border-t border-slate-200 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">多维趋势</p>
              <h3 className="text-xl font-semibold text-slate-900">学生行为雷达</h3>
            </div>
            <BookOpen className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendanceRate" name="出勤率" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="lookUpRate" name="抬头率" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="focusLevel" name="专注度" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">课程清单</p>
            <h3 className="text-xl font-semibold text-slate-900">今日教学节奏</h3>
          </div>
          <div className="space-y-3">
            {courseOverview.todayCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{course.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {course.scheduleLabel} · {course.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                    {course.statusLabel}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{course.code}</span>
                  <span>{course.studentCount} 人</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-slate-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">学生明细</p>
            <h3 className="text-xl font-semibold text-slate-900">课堂表现表</h3>
          </div>
          <p className="text-sm text-slate-500">
            {teacher.name} · {teacher.departmentName}
          </p>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">排名</th>
                <th className="px-4 py-3 font-medium">学生</th>
                <th className="px-4 py-3 font-medium">学号</th>
                <th className="px-4 py-3 font-medium">出勤率</th>
                <th className="px-4 py-3 font-medium">抬头率</th>
                <th className="px-4 py-3 font-medium">专注度</th>
                <th className="px-4 py-3 font-medium">参与次数</th>
                <th className="px-4 py-3 font-medium">综合分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {performance.students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{student.rank}</td>
                  <td className="px-4 py-3 text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {student.studentId ?? student.trackerId ?? "未绑定"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatPercent(student.attendanceRate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPercent(student.lookUpRate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPercent(student.focusLevel)}</td>
                  <td className="px-4 py-3 text-slate-700">{student.participationCount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                      {student.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceChart;
