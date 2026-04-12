import React from "react";
import { User } from "lucide-react";

interface TeacherProfileCardProps {
  teacherName?: string;
  teacherId?: string;
  collegeName?: string;
  rank?: string;
  courseNumber?: string;
}

const TeacherProfileCard: React.FC<TeacherProfileCardProps> = ({
  teacherName = "教师",
  teacherId = "",
  collegeName = "未设置院系",
  rank = "教师",
  courseNumber = "0",
}) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <User className="h-12 w-12 text-blue-500 dark:text-blue-300" />
        </div>
        <h2 className="text-xl font-bold">{teacherName || "教师"}</h2>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          工号：{teacherId || "未设置"}
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">院系</span>
          <span>{collegeName || "未设置院系"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">职称</span>
          <span className="text-green-600 dark:text-green-400">{rank || "教师"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">课程数量</span>
          <span className="text-blue-600 dark:text-blue-400">{courseNumber}</span>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfileCard;
