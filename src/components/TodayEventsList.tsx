import React from "react";
import { BookOpen, Clock3, MapPin } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  teacher: string;
  time: string;
  location?: string;
  status: "completed" | "pending" | "ongoing";
}

interface TodayEventsListProps {
  events: EventItem[];
}

function getStatusClass(status: EventItem["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200";
    case "ongoing":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }
}

function getStatusText(status: EventItem["status"]) {
  switch (status) {
    case "completed":
      return "已采集";
    case "pending":
      return "待接入";
    case "ongoing":
      return "进行中";
    default:
      return status;
  }
}

const TodayEventsList: React.FC<TodayEventsListProps> = ({ events }) => {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{event.teacher}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(event.status)}`}>
              {getStatusText(event.status)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {event.time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {event.location || "教室待定"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TodayEventsList;
export type { EventItem };
