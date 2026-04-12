"use client";

import React, { useEffect, useState } from "react";
import StudentNavigation from "@/components/StudentNavigation";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import ProfileHeaderCard from "@/components/ProfileHeaderCard";
import ProfileDetails from "@/components/ProfileDetails";
import StudyStats from "@/components/StudyStats";

type StudentProfileData = {
  id: string;
  name: string;
  departmentName: string;
  major: string;
  grade: string;
  className: string;
  email: string;
  phone: string;
  courseCount: number;
};

const emptyProfile: StudentProfileData = {
  id: "",
  name: "",
  departmentName: "",
  major: "",
  grade: "",
  className: "",
  email: "",
  phone: "",
  courseCount: 0,
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfileData>(emptyProfile);
  const [draft, setDraft] = useState<StudentProfileData>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/student/me", {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "加载学生资料失败");
        }

        setProfile(result.data);
        setDraft(result.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载学生资料失败");
      }
    };

    void load();
  }, []);

  const details = [
    { label: "姓名", value: profile.name || "未设置" },
    { label: "学号", value: profile.id || "未设置" },
    { label: "院系", value: profile.departmentName || "未设置" },
    { label: "专业", value: profile.major || "未设置" },
    { label: "年级", value: profile.grade || "未设置" },
    { label: "班级", value: profile.className || "未设置" },
    { label: "邮箱", value: profile.email || "未设置" },
    { label: "电话", value: profile.phone || "未设置" },
  ];

  const stats = [
    { label: "当前课程数", value: String(profile.courseCount || 0), color: "blue" },
    { label: "专业", value: profile.major || "-", color: "green" },
    { label: "年级", value: profile.grade || "-", color: "purple" },
    { label: "班级", value: profile.className || "-", color: "amber" },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/student/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: draft.name,
          major: draft.major,
          grade: draft.grade,
          className: draft.className,
          email: draft.email,
          phone: draft.phone,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "保存学生资料失败");
      }

      setProfile(result.data);
      setDraft(result.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存学生资料失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">个人资料</h2>
            <button
              onClick={() => {
                if (isEditing) {
                  setDraft(profile);
                }
                setIsEditing((value) => !value);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {isEditing ? "取消编辑" : "编辑资料"}
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <ProfileHeaderCard name={profile.name || "学生"} studentId={profile.id || ""} />

          {isEditing ? (
            <div className="mb-8 rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
              <h3 className="mb-4 text-lg font-semibold">编辑资料</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: "name", label: "姓名" },
                  { key: "major", label: "专业" },
                  { key: "grade", label: "年级" },
                  { key: "className", label: "班级" },
                  { key: "email", label: "邮箱" },
                  { key: "phone", label: "电话" },
                ].map((field) => (
                  <label key={field.key} className="space-y-2">
                    <span className="text-sm text-gray-500">{field.label}</span>
                    <input
                      value={draft[field.key as keyof StudentProfileData] as string}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSaving ? "保存中..." : "保存修改"}
                </button>
              </div>
            </div>
          ) : null}

          <ProfileDetails details={details} />
          <StudyStats stats={stats} />
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default ProfilePage;

