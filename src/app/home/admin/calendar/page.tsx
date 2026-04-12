"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";
import TodayEventsList from "@/components/TodayEventsList";
import { EventItem } from "@/components/TodayEventsList";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, CalendarDays, Clock3 } from "lucide-react";

type ScheduleShape = {
  day?: string;
  weekDay?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  classroom?: string;
  room?: string;
};

type CourseItem = {
  id: string;
  name: string;
  teacher?: { name?: string | null } | null;
  teacherId?: string | null;
  schedule?: unknown;
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

function parseScheduleRaw(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (!value.startsWith("[") && !value.startsWith("{")) return raw;
  try {
    return JSON.parse(value);
  } catch {
    return raw;
  }
}

function normalizeSchedule(raw: unknown) {
  const parsed = parseScheduleRaw(raw);

  if (!parsed) {
    return {
      day: "",
      time: "待排课",
      location: "教室待定",
    };
  }

  if (typeof parsed === "string") {
    return {
      day: "",
      time: parsed,
      location: "教室待定",
    };
  }

  const item = (Array.isArray(parsed) ? parsed[0] : parsed) as ScheduleShape | undefined;
  if (!item || typeof item !== "object") {
    return {
      day: "",
      time: "待排课",
      location: "教室待定",
    };
  }

  const day = item.day || item.weekDay || "";
  const time =
    item.time ||
    (item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime || "待排课");
  const location = item.location || item.classroom || item.room || "教室待定";

  return {
    day,
    time,
    location,
  };
}

function buildEventsByDate(courses: CourseItem[], month: Date) {
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
      const schedule = normalizeSchedule(course.schedule);
      const scheduleWeekday = weekdayMap[schedule.day];

      if (scheduleWeekday === undefined || scheduleWeekday !== weekday) {
        continue;
      }

      events.push({
        id: `${course.id}-${key}`,
        title: course.name,
        teacher: course.teacher?.name || course.teacherId || "教师",
        time: schedule.time,
        location: schedule.location,
        status: "pending",
      });
    }

    if (events.length) {
      map[key] = events;
    }
  }

  return map;
}

const AdminCalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(normalizeDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(normalizeDate(new Date()));
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/course", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || result?.status !== "success") {
          throw new Error(result?.error || "加载全校课程失败");
        }

        setCourses((result?.data ?? []) as CourseItem[]);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载全校课程失败");
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
      <PageHeader title="ClassSight 管理系统" />
      <StudentNavigation role={2} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">管理员日历</h2>
          <p className="mt-1 text-sm text-slate-500">查看全校课程排期与每日教学分布。</p>
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
                hasCourse: "bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/40 dark:text-purple-200",
              }}
              className="w-full rounded-md"
              captionLayout="dropdown"
            />
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              紫色日期表示当天有课程安排
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                {formatSelectedDate(selectedDate)} 的课程
              </h3>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
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
                该日期暂无课程安排。
              </div>
            )}
          </section>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default AdminCalendarPage;

