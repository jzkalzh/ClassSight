"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  Brain,
  Flame,
  LineChart as LineChartIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PerformanceChartProps {
  title?: string;
  dashboardData?: StudentDashboardData;
}

type CourseMetric = {
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
  };
  courses: CourseMetric[];
};

type DashboardResponse = {
  data?: StudentDashboardData;
  error?: string;
};

const BAR_COLORS = ["#0ea5e9", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

function formatMetric(value: number) {
  return `${value.toFixed(1)}%`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title = "近期表现概览",
  dashboardData,
}) => {
  const [data, setData] = useState<StudentDashboardData | null>(dashboardData ?? null);
  const [loading, setLoading] = useState(!dashboardData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardData) {
      setData(dashboardData);
      setLoading(false);
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/student/dashboard", {
          credentials: "include",
        });
        const result = (await response.json()) as DashboardResponse;

        if (!response.ok) {
          throw new Error(result.error || "加载学生表现数据失败");
        }

        setData(result.data ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载学生表现数据失败");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [dashboardData]);

  const chartData = useMemo(() => {
    const courses = data?.courses ?? [];
    return courses
      .filter((item) => item.metrics)
      .map((item) => ({
        id: item.id,
        course: item.name.length > 8 ? `${item.name.slice(0, 8)}...` : item.name,
        fullName: item.name,
        attendanceRate: Number((item.metrics?.attendanceRate ?? 0).toFixed(1)),
        focusLevel: Number((item.metrics?.focusLevel ?? 0).toFixed(1)),
        lookUpRate: Number((item.metrics?.lookUpRate ?? 0).toFixed(1)),
        score: Number((item.metrics?.score ?? 0).toFixed(1)),
      }));
  }, [data]);

  const summary = useMemo(() => {
    if (!chartData.length) {
      return { attendanceRate: 0, focusLevel: 0, lookUpRate: 0, score: 0 };
    }

    return {
      attendanceRate: average(chartData.map((item) => item.attendanceRate)),
      focusLevel: average(chartData.map((item) => item.focusLevel)),
      lookUpRate: average(chartData.map((item) => item.lookUpRate)),
      score: average(chartData.map((item) => item.score)),
    };
  }, [chartData]);

  const rankedCourses = useMemo(() => {
    return [...chartData].sort((left, right) => right.score - left.score);
  }, [chartData]);

  const bestCourse = rankedCourses[0] ?? null;
  const watchCourse = rankedCourses[rankedCourses.length - 1] ?? null;

  const focusBuckets = useMemo(() => {
    if (!chartData.length) return [];

    return chartData.map((item) => ({
      course: item.course,
      score: item.score,
    }));
  }, [chartData]);

  const learningSummary = useMemo(() => {
    return [
      {
        label: "出勤表现",
        value: formatMetric(summary.attendanceRate),
        description:
          summary.attendanceRate >= 95
            ? "整体到课状态稳定，继续保持。"
            : "建议优先保证到课节奏，基础画像会更稳。",
        icon: BookOpenCheck,
      },
      {
        label: "专注表现",
        value: formatMetric(summary.focusLevel),
        description:
          summary.focusLevel >= 82
            ? "课堂专注状态很不错。"
            : "可以在课上减少分心点，专注度还有提升空间。",
        icon: Brain,
      },
      {
        label: "跟随表现",
        value: formatMetric(summary.lookUpRate),
        description:
          summary.lookUpRate >= 78
            ? "课堂跟随状态比较积极。"
            : "多关注老师切换板书和提问时段，会更容易跟上节奏。",
        icon: TrendingUp,
      },
    ];
  }, [summary.attendanceRate, summary.focusLevel, summary.lookUpRate]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-44 rounded-full bg-slate-200" />
          <div className="h-72 rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm text-sky-100">
                {data?.student.name || "学生"} 的课程表现趋势与重点课程画像
              </p>
            </div>
            <LineChartIcon className="h-8 w-8 text-sky-100" />
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">平均出勤</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(summary.attendanceRate)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">平均专注</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(summary.focusLevel)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">平均抬头率</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(summary.lookUpRate)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">平均综合分</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.score.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">课程趋势</p>
                  <h3 className="text-lg font-semibold text-slate-900">各门课程表现曲线</h3>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {chartData.length} 门课程
                </Badge>
              </div>
              {chartData.length ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="course" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="attendanceRate" name="出勤率" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="focusLevel" name="专注度" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="lookUpRate" name="抬头率" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="score" name="综合分" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
                  <BookOpenCheck className="mb-3 h-7 w-7 text-slate-500" />
                  <p className="text-sm text-slate-600">暂时还没有可视化指标数据</p>
                  <p className="mt-1 text-xs text-slate-500">
                    完成课堂采集后，这里会自动展示你的课程表现趋势。
                  </p>
                </div>
              )}
            </div>

            {focusBuckets.length ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">课程排名</p>
                    <h3 className="text-lg font-semibold text-slate-900">综合分对比</h3>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusBuckets}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="course" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" name="综合分" radius={[10, 10, 0, 0]}>
                        {focusBuckets.map((_, index) => (
                          <Cell key={`score-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">课程信号</p>
                  <h3 className="text-lg font-semibold text-slate-900">强项与待提升</h3>
                </div>
                <Sparkles className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">当前最稳课程</p>
                  <p className="mt-1 font-semibold text-slate-900">{bestCourse?.fullName || "暂无数据"}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {bestCourse
                      ? `综合分 ${bestCourse.score.toFixed(1)}，可以保持当前学习节奏。`
                      : "等课堂采集数据稳定后，这里会自动识别你的优势课程。"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-slate-500">建议优先补强</p>
                  <p className="mt-1 font-semibold text-slate-900">{watchCourse?.fullName || "暂无数据"}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {watchCourse
                      ? `当前综合分 ${watchCourse.score.toFixed(1)}，可以先回顾这门课的课堂重点。`
                      : "还没有足够的课程差异，先继续积累课堂表现。"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">学习提示</p>
                  <h3 className="text-lg font-semibold text-slate-900">最近可以这样做</h3>
                </div>
                <Flame className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {learningSummary.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-900 p-3 text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{item.label}</p>
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
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceChart;
