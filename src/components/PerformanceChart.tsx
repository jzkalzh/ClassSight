"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpenCheck, LineChart as LineChartIcon } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceChartProps {
  title?: string;
}

type CourseMetric = {
  id: string;
  name: string;
  code: string;
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

function formatMetric(value: number) {
  return `${value.toFixed(1)}%`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ title = "近期表现概览" }) => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const chartData = useMemo(() => {
    const courses = data?.courses ?? [];
    return courses
      .filter((item) => item.metrics)
      .map((item) => ({
        course: item.name.length > 10 ? `${item.name.slice(0, 10)}...` : item.name,
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

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-44 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
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
    <div className="overflow-hidden rounded-2xl bg-white shadow-md dark:bg-[oklch(0.205_0_0)]">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-cyan-100">
              {data?.student.name || "学生"} 的课程行为指标趋势
            </p>
          </div>
          <LineChartIcon className="h-8 w-8 text-cyan-100" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 px-6 py-4 md:grid-cols-4 dark:border-slate-700">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">平均出勤率</p>
          <p className="mt-1 text-lg font-semibold">{formatMetric(summary.attendanceRate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">平均专注度</p>
          <p className="mt-1 text-lg font-semibold">{formatMetric(summary.focusLevel)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">平均抬头率</p>
          <p className="mt-1 text-lg font-semibold">{formatMetric(summary.lookUpRate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">平均综合分</p>
          <p className="mt-1 text-lg font-semibold">{summary.score.toFixed(1)}</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {chartData.length ? (
          <div className="h-72">
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
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <BookOpenCheck className="mb-3 h-7 w-7 text-slate-500 dark:text-slate-300" />
            <p className="text-sm text-slate-600 dark:text-slate-300">暂时还没有可视化指标数据</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              完成课堂采集后，这里会自动展示你的课程表现趋势
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;
