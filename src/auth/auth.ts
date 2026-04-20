import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAdminById, getStudentById, getTeacherById } from "@/db/db";

interface SystemUser {
  password: string;
  role: number;
  studentId?: string;
  teacherId?: string;
  adminId?: string;
}

const authCookiePrefix = (process.env.AUTH_COOKIE_PREFIX ?? "classsight")
  .trim()
  .replace(/[^a-zA-Z0-9-_]/g, "-");
const useSecureCookies = process.env.NODE_ENV === "production";
const secureCookiePrefix = useSecureCookies ? "__Secure-" : "";
const cookieBaseName = `${secureCookiePrefix}${authCookiePrefix}`;
const baseCookieOptions = {
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `${cookieBaseName}.session-token`,
      options: {
        ...baseCookieOptions,
        httpOnly: true,
      },
    },
    callbackUrl: {
      name: `${cookieBaseName}.callback-url`,
      options: {
        ...baseCookieOptions,
        httpOnly: false,
      },
    },
    csrfToken: {
      name: `${cookieBaseName}.csrf-token`,
      options: {
        ...baseCookieOptions,
        httpOnly: false,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        account: { label: "Account", type: "text", placeholder: "账号" },
        password: { label: "Password", type: "password", placeholder: "密码" },
        role: { label: "Role", type: "text", placeholder: "角色" },
      },
      authorize: async (credentials) => {
        if (!credentials) {
          throw new Error("无效的登录信息");
        }

        const account = credentials.account as string;
        const password = credentials.password as string;
        const role = credentials.role as string;

        if (!account || !password || !role) {
          throw new Error("请填写完整的登录信息");
        }

        let user = null;
        if (role === "student") {
          user = await getStudentById(account);
        } else if (role === "teacher") {
          user = await getTeacherById(account);
        } else if (role === "admin") {
          user = await getAdminById(account);
        } else {
          throw new Error("不存在该用户");
        }

        if (!user) {
          throw new Error("用户不存在");
        }

        if (user.password !== password) {
          throw new Error("密码错误");
        }

        const systemUser = user as SystemUser;
        let userId = "";

        if (systemUser.studentId) {
          userId = systemUser.studentId;
        } else if (systemUser.teacherId) {
          userId = systemUser.teacherId;
        } else if (systemUser.adminId) {
          userId = systemUser.adminId;
        }

        return {
          id: userId,
          ...user,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as SystemUser).role;
        token.name = (user as { name?: string | null }).name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as number;
        session.user.name = (token.name as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});
