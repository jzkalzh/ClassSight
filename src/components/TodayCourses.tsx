import React from "react";

interface CourseItem {
  id: string;
  name: string;
  teacher: string;
  time: string;
  location: string;
  status: "completed" | "pending" | "in-progress";
}

interface TodayCoursesProps {
  courses?: CourseItem[];
}

const TodayCourses: React.FC<TodayCoursesProps> = ({ courses = [] }) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return {
          className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          text: "已完成",
        };
      case "pending":
        return {
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          text: "待采集",
        };
      case "in-progress":
        return {
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          text: "进行中",
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
          text: "未知",
        };
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
      <h3 className="mb-3 font-medium">今日课程</h3>
      <div className="space-y-2">
        {courses.length ? (
          courses.map((course) => {
            const statusInfo = getStatusInfo(course.status);
            return (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                <div>
                  <p className="font-medium">{course.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {course.teacher} · {course.time} · {course.location}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            当前还没有可展示的课程安排。
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayCourses;
