import React from "react";
import { Award } from "lucide-react";

interface TeachingPerformanceItem {
  courseId: string;
  courseName: string;
  evaluationScore: number;
  studentCount: number;
  completionRate: number;
}

interface TeachingPerformanceProps {
  performanceData: TeachingPerformanceItem[];
}

const TeachingPerformance: React.FC<TeachingPerformanceProps> = ({ performanceData }) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
      <h3 className="mb-4 flex items-center text-lg font-semibold">
        <Award className="mr-2 h-5 w-5 text-yellow-500" />
        教学表现
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 text-left">课堂名称</th>
              <th className="py-3 text-left">评分</th>
              <th className="py-3 text-left">学生人数</th>
              <th className="py-3 text-left">出勤率</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.length ? (
              performanceData.map((item) => (
                <tr key={item.courseId} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3">{item.courseName}</td>
                  <td className="py-3">{item.evaluationScore.toFixed(1)}/5.0</td>
                  <td className="py-3">{item.studentCount}</td>
                  <td className="py-3">{item.completionRate.toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-gray-500">
                  暂无课程数据，接入课堂采集后会自动展示。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeachingPerformance;
