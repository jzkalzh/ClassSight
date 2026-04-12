"use client";

import React, { useEffect, useState } from "react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentProfileCard from "@/components/StudentProfileCard";
import CurrentCourse from "@/components/CurrentCourse";
import TodayCourses from "@/components/TodayCourses";
import PerformanceChart from "@/components/PerformanceChart";

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
  todayCourses: Array<{
    id: string;
    name: string;
    teacherName: string;
    scheduleLabel: string;
    location: string;
    status: "pending" | "completed" | "in-progress";
  }>;
};

function mapStatusLabel(status: "pending" | "completed" | "in-progress") {
  if (status === "completed") return "已采集";
  if (status === "in-progress") return "进行中";
  return "待接入";
}

const StudentHomePage: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StudentProfileCard
            studentName={data?.student.name || "学生"}
            studentId={data?.student.id || ""}
            className={data?.student.className || "未设置班级"}
            attendanceRate={`${(data?.overview.attendanceRate ?? 0).toFixed(1)}%`}
            focusLevel={`${(data?.overview.focusLevel ?? 0).toFixed(1)}%`}
          />

          <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)] md:col-span-2">
            <h2 className="mb-4 text-xl font-bold">课程概览</h2>
            <div className="space-y-4">
              <CurrentCourse
                courseName={data?.currentCourse?.name || "暂无课程"}
                teacherName={data?.currentCourse?.teacherName || "教师"}
                schedule={data?.currentCourse?.scheduleLabel || "待排课"}
                location={data?.currentCourse?.location || "教室待定"}
                statusLabel={
                  data?.currentCourse ? mapStatusLabel(data.currentCourse.status) : "待接入"
                }
              />
              <TodayCourses
                courses={
                  data?.todayCourses.map((course) => ({
                    id: course.id,
                    name: course.name,
                    teacher: course.teacherName,
                    time: course.scheduleLabel,
                    location: course.location,
                    status: course.status,
                  })) || []
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PerformanceChart title="近期表现概览" />
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default StudentHomePage;

