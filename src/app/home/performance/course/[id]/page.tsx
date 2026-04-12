"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
    schedule: string | null;
    studentCount: number;
  };
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
  students: StudentPerformance[];
}

const COLORS = ["#0f766e", "#0284c7", "#f59e0b", "#ef4444", "#7c3aed"];

const CoursePerformancePage = () => {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [data, setData] = useState<CoursePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/performance/course/${courseId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("加载课堂表现数据失败");
        }

        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载课堂表现数据失败");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      void load();
    }
  }, [courseId]);

  const focusParticipationData = useMemo(() => {
    if (!data?.students.length) return [];

    const groups = new Map<number, { total: number; count: number }>();

    for (const student of data.students) {
      const bucket = Math.floor(student.focusLevel / 10) * 10;
      const current = groups.get(bucket) ?? { total: 0, count: 0 };
      groups.set(bucket, {
        total: current.total + student.participationCount,
        count: current.count + 1,
      });
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, value]) => ({
        focusRange: `${bucket}-${bucket + 9}%`,
        focusStart: bucket,
        avgParticipation: Number((value.total / value.count).toFixed(2)),
      }));
  }, [data]);

  const attendancePieData = useMemo(() => {
    if (!data) return [];

    return [
      { name: "已签到", value: data.attendanceSummary.presentCount },
      { name: "未签到", value: data.attendanceSummary.absentCount },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={20} />
          </button>
          <h1 className="ml-2 text-xl font-bold text-gray-900">加载中...</h1>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={20} />
          </button>
          <h1 className="ml-2 text-xl font-bold text-gray-900">课堂表现</h1>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
            <p className="mt-2 text-center">{error || "未找到课程信息"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { course, session, classStats, students, attendanceSummary } = data;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-200 hover:text-gray-700"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="ml-2 text-2xl font-bold text-gray-900">课堂表现分析</h1>
      </div>

      <Card className="mb-6 overflow-hidden bg-white shadow">
        <div className="p-6">
          <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center">
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">
                  {course.code}
                </Badge>
                <h2 className="text-xl font-bold text-gray-900">{course.name}</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                最新采集设备：{session?.deviceName ?? "暂无"} · 会话状态：{session?.status ?? "未采集"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-sm text-gray-500">
                <Users size={16} className="mr-1" />
                <span>{classStats.totalStudents} 名学生</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp size={16} className="mr-1" />
                <span>均分 {Math.round(classStats.avgFocusLevel)}%</span>
              </div>
            </div>
          </div>

          <Separator className="my-4 bg-gray-200" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
                <BookOpen size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">任课教师</p>
                <p className="text-sm text-gray-500">{course.teacherName || "暂无"}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-500">
                <MapPin size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">教室</p>
                <p className="text-sm text-gray-500">{session?.classroom || "暂无"}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                <Calendar size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">课程安排</p>
                <p className="text-sm text-gray-500">
                  {course.schedule ? JSON.stringify(course.schedule) : "暂无"}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-500">
                <TrendingUp size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">所属学院</p>
                <p className="text-sm text-gray-500">{course.departmentName || "暂无"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white shadow">
          <div className="p-5">
            <p className="text-sm font-medium text-blue-800">出勤率</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {Math.round(classStats.avgAttendance)}%
            </p>
          </div>
        </Card>
        <Card className="bg-white shadow">
          <div className="p-5">
            <p className="text-sm font-medium text-green-800">抬头率</p>
            <p className="mt-1 text-2xl font-bold text-green-900">
              {Math.round(classStats.avgLookUpRate)}%
            </p>
          </div>
        </Card>
        <Card className="bg-white shadow">
          <div className="p-5">
            <p className="text-sm font-medium text-amber-800">专注度</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">
              {Math.round(classStats.avgFocusLevel)}%
            </p>
          </div>
        </Card>
        <Card className="bg-white shadow">
          <div className="p-5">
            <p className="text-sm font-medium text-purple-800">平均发言次数</p>
            <p className="mt-1 text-2xl font-bold text-purple-900">
              {classStats.avgParticipationCount.toFixed(1)}
            </p>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">签到概览</h2>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800">已签到</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {attendanceSummary.presentCount}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-800">未签到</p>
                <p className="mt-1 text-2xl font-bold text-rose-900">
                  {attendanceSummary.absentCount}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">签到ID数</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {attendanceSummary.presentStudentIds.length}
                </p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={attendancePieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {attendancePieData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">签到学生ID</h2>
            <div className="flex min-h-72 flex-wrap content-start gap-2 rounded-lg bg-gray-50 p-4">
              {attendanceSummary.presentStudentIds.length ? (
                attendanceSummary.presentStudentIds.map((studentId) => (
                  <Badge key={studentId} variant="outline" className="bg-white">
                    {studentId}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">当前会话还没有签到数据。</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">抬头率分布</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={classStats.distribution} dataKey="value" nameKey="name" outerRadius={90} label>
                    {classStats.distribution.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">专注度与发言次数</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusParticipationData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="focusRange" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgParticipation"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="平均发言次数"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-white shadow">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">学生课堂表现明细</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>学号/跟踪ID</TableHead>
                  <TableHead>出勤率</TableHead>
                  <TableHead>抬头率</TableHead>
                  <TableHead>专注度</TableHead>
                  <TableHead>发言次数</TableHead>
                  <TableHead>得分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.rank}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.studentId ?? student.trackerId ?? "-"}</TableCell>
                    <TableCell>{student.attendanceRate}%</TableCell>
                    <TableCell>{student.lookUpRate}%</TableCell>
                    <TableCell>{student.focusLevel}%</TableCell>
                    <TableCell>{student.participationCount}</TableCell>
                    <TableCell>{student.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CoursePerformancePage;
