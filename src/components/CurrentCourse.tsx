import React from "react";

interface CurrentCourseProps {
  courseName?: string;
  teacherName?: string;
  schedule?: string;
  location?: string;
  statusLabel?: string;
}

const CurrentCourse: React.FC<CurrentCourseProps> = ({
  courseName = "暂无课程",
  teacherName = "教师",
  schedule = "待排课",
  location = "教室待定",
  statusLabel = "待采集",
}) => {
  return (
    <div className="border-l-4 border-blue-500 py-2 pl-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{courseName}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {teacherName} · {schedule} · {location}
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {statusLabel}
        </span>
      </div>
    </div>
  );
};

export default CurrentCourse;
