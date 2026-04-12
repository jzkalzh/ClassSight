"use client";

import React, { useEffect, useState } from "react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import CourseCard from "@/components/CourseCard";

type StudentCourse = {
  id: string;
  name: string;
  teacherName: string;
  scheduleLabel: string;
  location: string;
  status: "pending" | "completed" | "in-progress";
};

type StudentDashboardData = {
  student: {
    name: string;
    departmentName: string;
  };
  courses: StudentCourse[];
};

function pickCourseColor(index: number) {
  const palette = [
    "bg-blue-500 dark:bg-blue-700",
    "bg-emerald-500 dark:bg-emerald-700",
    "bg-violet-500 dark:bg-violet-700",
    "bg-amber-500 dark:bg-amber-700",
    "bg-cyan-500 dark:bg-cyan-700",
    "bg-rose-500 dark:bg-rose-700",
  ];
  return palette[index % palette.length];
}

function mapStatusLabel(status: StudentCourse["status"]) {
  if (status === "completed") return "已采集";
  if (status === "in-progress") return "进行中";
  return "待接入";
}

const CoursesPage: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const courses = data?.courses ?? [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">我的课程</h2>
          <p className="mt-1 text-sm text-slate-500">
            {data?.student.name || "学生"} · {data?.student.departmentName || "未设置院系"}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : courses.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                title={course.name}
                teacher={course.teacherName}
                department={mapStatusLabel(course.status)}
                type={course.location}
                schedule={course.scheduleLabel}
                bgColor={pickCourseColor(index)}
                id={course.id}
                isStudentView={true}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            当前没有已选课程。
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  );
};

export default CoursesPage;

