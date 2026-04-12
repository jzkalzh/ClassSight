"use server";

import {
  createAdmin,
  createStudent,
  createTeacher,
  getAdminById,
  getStudentById,
  getTeacherById,
} from "../db/db";
import { signIn } from "./auth";

export async function login(formData: FormData) {
  const account = formData.get("account");
  const password = formData.get("password");
  let role = formData.get("role");
  role = role === "0" ? "student" : role === "1" ? "teacher" : "admin";

  if (!account || !password || !role) {
    throw new Error("请填写完整的登录信息");
  }

  try {
    await signIn("credentials", {
      account,
      password,
      role,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error("登录失败: " + error.message);
    }

    throw new Error("登录失败: " + String(error));
  }

  return {
    success: true,
    message: "登录成功",
  };
}

function buildDefaultEmail(account: string, role: string) {
  if (account.includes("@")) {
    return account;
  }

  return `${account}@${role}.classsight.local`;
}

async function isExistingAccount(account: string, role: string) {
  if (role === "student") {
    return getStudentById(account);
  }

  if (role === "teacher") {
    return getTeacherById(account);
  }

  return getAdminById(account);
}

export async function register(formData: FormData) {
  const account = formData.get("account") as string;
  const password = formData.get("password") as string;
  let role = formData.get("role") as string;

  role = role === "0" ? "student" : role === "1" ? "teacher" : "admin";

  if (!account || !password || !role) {
    throw new Error("请填写完整的注册信息");
  }

  if (await isExistingAccount(account, role)) {
    throw new Error("账号已存在");
  }

  const email = buildDefaultEmail(account, role);

  try {
    if (role === "student") {
      await createStudent({
        studentId: account,
        password,
        email,
      });
    } else if (role === "teacher") {
      await createTeacher({
        teacherId: account,
        password,
        email,
      });
    } else {
      await createAdmin({
        adminId: account,
        password,
        email,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`注册失败: ${error.message}`);
    }

    throw new Error("注册失败");
  }

  return {
    success: true,
    message: "注册成功",
  };
}
