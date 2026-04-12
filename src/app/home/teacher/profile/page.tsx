"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";
import TeacherProfileCard from "@/components/TeacherProfileCard";
import ContactInfo from "@/components/ContactInfo";
import TeachingPerformance from "@/components/TeachingPerformance";
import OfficeHours from "@/components/OfficeHours";
import EditButton from "@/components/EditButton";

interface TeacherProfile {
  id: string;
  name: string;
  departmentName: string;
  rank: string;
  courseCount: number;
  email: string;
  phone: string;
  office: string;
}

interface TeacherCourseItem {
  id: string;
  name: string;
  studentCount: number;
  avgAttendance: number | null;
  avgFocusLevel: number | null;
  avgLookUpRate: number | null;
}

const emptyProfile: TeacherProfile = {
  id: "",
  name: "",
  departmentName: "",
  rank: "",
  courseCount: 0,
  email: "",
  phone: "",
  office: "",
};

const officeHours = [
  { day: "周一", time: "16:30-17:30" },
  { day: "周三", time: "15:00-16:00" },
  { day: "周五", time: "14:00-15:00" },
];

function toFiveScaleScore(focus: number | null, lookUp: number | null) {
  const safeFocus = focus ?? 0;
  const safeLookUp = lookUp ?? 0;
  const percent = safeFocus * 0.6 + safeLookUp * 0.4;
  return Number((Math.max(0, Math.min(100, percent)) / 20).toFixed(1));
}

const TeacherProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>(emptyProfile);
  const [draft, setDraft] = useState<TeacherProfile>(emptyProfile);
  const [courses, setCourses] = useState<TeacherCourseItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileResponse, coursesResponse] = await Promise.all([
          fetch("/api/teacher/me", {
            credentials: "include",
          }),
          fetch("/api/teacher/courses", {
            credentials: "include",
          }),
        ]);

        const profileResult = await profileResponse.json();
        if (!profileResponse.ok) {
          throw new Error(profileResult?.error || "加载教师资料失败");
        }

        const coursesResult = await coursesResponse.json();
        if (!coursesResponse.ok) {
          throw new Error(coursesResult?.error || "加载课程数据失败");
        }

        const courseList = (coursesResult?.data?.courses ?? []) as TeacherCourseItem[];

        setProfile(profileResult.data);
        setDraft(profileResult.data);
        setCourses(courseList);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载教师资料失败");
      }
    };

    void load();
  }, []);

  const teachingPerformance = useMemo(
    () =>
      courses.map((course) => ({
        courseId: course.id,
        courseName: course.name,
        evaluationScore: toFiveScaleScore(course.avgFocusLevel, course.avgLookUpRate),
        studentCount: course.studentCount,
        completionRate: Number((course.avgAttendance ?? 0).toFixed(1)),
      })),
    [courses],
  );

  const handleToggleEdit = () => {
    if (isEditing) {
      setDraft(profile);
      setError("");
    }
    setIsEditing((value) => !value);
  };

  const handleChange = (field: keyof TeacherProfile, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: draft.name,
          departmentName: draft.departmentName,
          rank: draft.rank,
          email: draft.email,
          phone: draft.phone,
          office: draft.office,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "保存教师资料失败");
      }

      setProfile(result.data);
      setDraft(result.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存教师资料失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight" />
      <StudentNavigation role={1} />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <TeacherProfileCard
              teacherName={profile.name || "教师"}
              teacherId={profile.id}
              collegeName={profile.departmentName || "未设置院系"}
              rank={profile.rank || "教师"}
              courseNumber={String(profile.courseCount || 0)}
            />

            <div className="my-8" />

            <ContactInfo email={profile.email} phone={profile.phone} office={profile.office} />
          </div>

          <div className="space-y-6 md:col-span-2">
            <EditButton isEditing={isEditing} onToggleEdit={handleToggleEdit} />

            <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">个人资料</h3>
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "保存中..." : "保存修改"}
                  </button>
                ) : null}
              </div>

              {error ? (
                <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: "name", label: "教师姓名" },
                  { key: "departmentName", label: "院系名称" },
                  { key: "rank", label: "职称" },
                  { key: "email", label: "邮箱" },
                  { key: "phone", label: "联系电话" },
                  { key: "office", label: "办公室" },
                ].map((field) => (
                  <label key={field.key} className="space-y-2">
                    <span className="text-sm text-gray-500">{field.label}</span>
                    <input
                      value={draft[field.key as keyof TeacherProfile] as string}
                      onChange={(event) =>
                        handleChange(field.key as keyof TeacherProfile, event.target.value)
                      }
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:disabled:bg-gray-800"
                    />
                  </label>
                ))}
              </div>
            </div>

            <TeachingPerformance performanceData={teachingPerformance} />
            <OfficeHours hours={officeHours} />
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default TeacherProfilePage;
