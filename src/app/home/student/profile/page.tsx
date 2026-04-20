"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Mail,
  PencilLine,
  Phone,
  Save,
  School,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import PageFooter from "@/components/PageFooter";
import PageHeader from "@/components/PageHeader";
import StudentNavigation from "@/components/StudentNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

const editableFields: Array<{ key: keyof StudentProfileData; label: string; placeholder: string }> = [
  { key: "name", label: "姓名", placeholder: "请输入姓名" },
  { key: "major", label: "专业", placeholder: "请输入专业" },
  { key: "grade", label: "年级", placeholder: "请输入年级" },
  { key: "className", label: "班级", placeholder: "请输入班级" },
  { key: "email", label: "邮箱", placeholder: "请输入邮箱" },
  { key: "phone", label: "电话", placeholder: "请输入电话" },
];

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

  const details = useMemo(
    () => [
      { label: "姓名", value: profile.name || "未设置", icon: UserRound },
      { label: "学号", value: profile.id || "未设置", icon: ShieldCheck },
      { label: "院系", value: profile.departmentName || "未设置", icon: School },
      { label: "专业", value: profile.major || "未设置", icon: GraduationCap },
      { label: "年级", value: profile.grade || "未设置", icon: BookOpen },
      { label: "班级", value: profile.className || "未设置", icon: BookOpen },
      { label: "邮箱", value: profile.email || "未设置", icon: Mail },
      { label: "电话", value: profile.phone || "未设置", icon: Phone },
    ],
    [profile],
  );

  const stats = useMemo(
    () => [
      { label: "已接入课程", value: String(profile.courseCount || 0) },
      { label: "专业方向", value: profile.major || "-" },
      { label: "所在年级", value: profile.grade || "-" },
      { label: "所属班级", value: profile.className || "-" },
    ],
    [profile],
  );

  const handleToggleEdit = () => {
    if (isEditing) {
      setDraft(profile);
    }
    setIsEditing((value) => !value);
  };

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_36%,#f8fafc_100%)] text-gray-900">
      <PageHeader />
      <StudentNavigation role={0} />

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-white">
                  <UserRound className="h-12 w-12" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Profile Studio</p>
                  <h1 className="mt-2 text-3xl font-semibold">{profile.name || "学生"}</h1>
                  <p className="mt-2 text-sm text-slate-200">
                    {profile.departmentName || "未设置院系"} · {profile.major || "未设置专业"}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">学号 {profile.id || "-"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">
                  {profile.className || "未设置班级"}
                </Badge>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full bg-white text-slate-900 hover:bg-white"
                  onClick={handleToggleEdit}
                >
                  <PencilLine className="h-4 w-4" />
                  {isEditing ? "取消编辑" : "编辑资料"}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                  <p className="text-xs text-sky-200">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5">
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-slate-500">资料总览</p>
                  <h2 className="text-xl font-semibold text-slate-900">当前信息一览</h2>
                </div>
                <div className="space-y-3">
                  {details.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-slate-900 p-3 text-white">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className="mt-1 font-semibold text-slate-900">{item.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-slate-500">资料状态</p>
                  <h2 className="text-xl font-semibold text-slate-900">信息完整度</h2>
                </div>
                <div className="space-y-3">
                  {[
                    profile.name,
                    profile.major,
                    profile.grade,
                    profile.className,
                    profile.email,
                    profile.phone,
                  ].map((value, index) => (
                    <div key={index} className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                        style={{ width: `${value ? 100 : 35}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  资料越完整，后续展示和课堂身份映射就会越稳定。建议把邮箱、电话和班级都补全。
                </p>
              </div>
            </Card>
          </section>

          <section>
            <Card className="border-0 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">资料编辑</p>
                    <h2 className="text-xl font-semibold text-slate-900">维护你的学生信息</h2>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {isEditing ? "编辑中" : "只读模式"}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {editableFields.map((field) => (
                    <label key={field.key} className="space-y-2">
                      <span className="text-sm text-slate-500">{field.label}</span>
                      <input
                        value={draft[field.key] as string}
                        disabled={!isEditing}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-75"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-600">
                    {isEditing
                      ? "修改完成后记得保存，姓名不能为空。"
                      : "点击右上角“编辑资料”后即可修改个人信息。"}
                  </p>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <Button type="button" onClick={handleSave} disabled={isSaving} className="rounded-full">
                        <Save className="h-4 w-4" />
                        {isSaving ? "保存中..." : "保存修改"}
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" onClick={handleToggleEdit} className="rounded-full">
                        <PencilLine className="h-4 w-4" />
                        开始编辑
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default ProfilePage;
