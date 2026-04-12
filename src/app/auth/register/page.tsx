"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { register } from "../../../auth/actions";

const roleOptions = [
  { value: "0", label: "学生", hint: "加入课程并查看个人课堂表现" },
  { value: "1", label: "教师", hint: "创建教学视图并查看课堂分析" },
  { value: "2", label: "管理员", hint: "维护系统中的课程与成员信息" },
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    account: "",
    password: "",
    role: "0",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedRole = roleOptions.find((item) => item.value === formData.role) ?? roleOptions[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleRoleChange = (role: string) => {
    setFormData((prev) => ({ ...prev, role }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await register(new FormData(e.currentTarget as HTMLFormElement));
      if (result.success) {
        setSuccess("注册成功，请前往登录");
        setFormData({ account: "", password: "", role: "0" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef3f8] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.16),transparent_33%),radial-gradient(circle_at_80%_85%,rgba(99,102,241,0.12),transparent_36%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1.05fr_1fr]">
          <section className="relative hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-10 text-white lg:flex lg:flex-col">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.30),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.26),transparent_40%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  新用户接入
                </div>
                <h1 className="text-3xl font-semibold leading-tight">
                  ClassSight
                  <br />
                  账号注册中心
                </h1>
                <p className="mt-4 max-w-md text-sm text-slate-200">
                  完成注册后即可进入角色工作台，查看课程、课堂表现和教学数据。
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Selected Role</p>
                  <p className="mt-2 text-xl font-medium">{selectedRole.label}</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedRole.hint}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-xs text-slate-200">
                  账号创建成功后，请返回登录页完成身份认证。
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold text-slate-900">创建账号</h2>
                <p className="mt-2 text-sm text-slate-500">填写账号与密码，选择身份后完成注册。</p>
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input type="hidden" name="role" value={formData.role} />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">身份</p>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                    {roleOptions.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleRoleChange(role.value)}
                        className={`rounded-xl px-3 py-2 text-sm transition ${
                          formData.role === role.value
                            ? "bg-white font-semibold text-sky-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{selectedRole.hint}</p>
                </div>

                <div>
                  <label htmlFor="account" className="mb-1.5 block text-sm font-medium text-slate-700">
                    账号
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-sky-500">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <input
                      id="account"
                      type="text"
                      name="account"
                      value={formData.account}
                      onChange={handleChange}
                      placeholder="请输入账号"
                      className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    密码
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-sky-500">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="请输入密码"
                      className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "注册中..." : "注册"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                已有账号？
                <Link href="/auth/login" className="ml-1 font-medium text-sky-700 hover:underline">
                  立即登录
                </Link>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 lg:hidden">
                <GraduationCap className="h-3.5 w-3.5" />
                ClassSight 课堂行为洞察平台
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
