"use client";

import React, { useEffect, useState } from "react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import TeacherProfileCard from "@/components/TeacherProfileCard";
import CurrentCourse from "@/components/CurrentCourse";
import TodayCourses from "@/components/TodayCourses";
import StudentPerformanceChart from "@/components/StudentPerformanceChart";

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
      status: "completed" | "pending" | "in-progress";
      statusLabel: string;
    }>;
  };
}

const TeacherHomePage: React.FC = () => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/teacher/dashboard", {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const result = await response.json();
        setData(result.data);
      } catch {
        setData(null);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader />
      <StudentNavigation role={1} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <TeacherProfileCard
            teacherName={data?.teacher.name || "教师"}
            teacherId={data?.teacher.id || ""}
            collegeName={data?.teacher.departmentName || "未设置院系"}
            rank={data?.teacher.rank || "教师"}
            courseNumber={String(data?.teacher.courseCount || 0)}
          />

          <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)] md:col-span-2">
            <h2 className="mb-4 text-xl font-bold">课程概览</h2>
            <div className="space-y-4">
              <CurrentCourse
                courseName={data?.courseOverview.currentCourse?.name || "暂无课程"}
                teacherName={data?.teacher.name || "教师"}
                schedule={data?.courseOverview.currentCourse?.scheduleLabel || "待排课"}
                location={data?.courseOverview.currentCourse?.location || "教室待定"}
                statusLabel={data?.courseOverview.currentCourse?.statusLabel || "待采集"}
              />

              <TodayCourses
                courses={
                  data?.courseOverview.todayCourses.map((course) => ({
                    id: course.id,
                    name: course.name,
                    teacher: data?.teacher.name || "教师",
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
          <StudentPerformanceChart />
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default TeacherHomePage;
