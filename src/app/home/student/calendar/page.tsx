"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";
import TodayEventsList from "@/components/TodayEventsList";
import { EventItem } from "@/components/TodayEventsList";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, CalendarDays, Clock3 } from "lucide-react";

type StudentCourse = {
  id: string;
  name: string;
  teacherName: string;
  scheduleLabel: string;
  location: string;
  status: "pending" | "completed" | "in-progress";
};

type StudentDashboardData = {
  courses: StudentCourse[];
};

const weekdayMap: Record<string, number> = {
  周日: 0,
  周天: 0,
  周一: 1,
  周二: 2,
  周三: 3,
  周四: 4,
  周五: 5,
  周六: 6,
};

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseScheduleLabel(scheduleLabel: string) {
  const [day, ...rest] = scheduleLabel.trim().split(/\s+/);
  const time = rest.join(" ").trim() || "待排课";
  return { day, time };
}

function mapCourseStatusToEventStatus(status: StudentCourse["status"]): EventItem["status"] {
  if (status === "completed") return "completed";
  if (status === "in-progress") return "ongoing";
  return "pending";
}

function buildEventsByDate(courses: StudentCourse[], month: Date) {
  const map: Record<string, EventItem[]> = {};
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const weekday = date.getDay();
    const key = formatDateKey(date);
    const events: EventItem[] = [];

    for (const course of courses) {
      const parsed = parseScheduleLabel(course.scheduleLabel);
      const scheduleWeekday = weekdayMap[parsed.day];

      if (scheduleWeekday === undefined || scheduleWeekday !== weekday) {
        continue;
      }

      events.push({
        id: `${course.id}-${key}`,
        title: course.name,
        teacher: course.teacherName,
        time: parsed.time,
        location: course.location,
        status: mapCourseStatusToEventStatus(course.status),
      });
    }

    if (events.length) {
      map[key] = events;
    }
  }

  return map;
}

const StudentCalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(normalizeDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(normalizeDate(new Date()));
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/student/dashboard", {
          credentials: "include",
        });
        const result = (await response.json()) as { data?: StudentDashboardData; error?: string };

        if (!response.ok) {
          throw new Error(result?.error || "加载课程数据失败");
        }

        setCourses(result.data?.courses ?? []);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载课程数据失败");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const eventsByDate = useMemo(
    () => buildEventsByDate(courses, currentMonth),
    [courses, currentMonth],
  );

  const selectedDateEvents = useMemo(() => {
    const key = formatDateKey(selectedDate);
    return eventsByDate[key] ?? [];
  }, [selectedDate, eventsByDate]);

  const courseDays = useMemo(
    () => Object.keys(eventsByDate).map((dateKey) => new Date(`${dateKey}T00:00:00`)),
    [eventsByDate],
  );

  const formatSelectedDate = (date: Date) =>
    date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight" />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">学习日历</h2>
          <p className="mt-1 text-sm text-slate-500">按课程排期自动生成每月学习日程。</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(normalizeDate(date));
              }}
              month={currentMonth}
              onMonthChange={(date) => setCurrentMonth(normalizeDate(date))}
              modifiers={{
                hasCourse: courseDays,
              }}
              modifiersClassNames={{
                hasCourse: "bg-emerald-100 text-emerald-700 font-semibold dark:bg-emerald-900/40 dark:text-emerald-200",
              }}
              className="w-full rounded-md"
              captionLayout="dropdown"
            />
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              绿色日期表示当天有课程
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                {formatSelectedDate(selectedDate)} 的课程
              </h3>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <Clock3 className="h-3.5 w-3.5" />
                共 {selectedDateEvents.length} 节
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            ) : selectedDateEvents.length ? (
              <TodayEventsList events={selectedDateEvents} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                该日期没有课程安排。
              </div>
            )}
          </section>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default StudentCalendarPage;

