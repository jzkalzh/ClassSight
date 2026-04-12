"use client";

import React, { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface PageHeaderProps {
  title?: string;
  welcomeText?: string;
}

type SessionUser = {
  name?: string | null;
  id?: string;
  role?: number;
};

type AuthSession = {
  user?: SessionUser;
};

function buildWelcomeText(user?: SessionUser) {
  if (!user) {
    return "欢迎使用 ClassSight";
  }

  const displayName = user.name?.trim() || user.id?.trim() || "";

  if (user.role === 1) {
    return displayName ? `欢迎，教师 ${displayName}` : "欢迎，教师";
  }

  if (user.role === 2) {
    return displayName ? `欢迎，管理员 ${displayName}` : "欢迎，管理员";
  }

  if (user.role === 0) {
    return displayName ? `欢迎，学生 ${displayName}` : "欢迎，学生";
  }

  return displayName ? `欢迎，${displayName}` : "欢迎使用 ClassSight";
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title = "ClassSight",
  welcomeText,
}) => {
  const [resolvedWelcomeText, setResolvedWelcomeText] = useState(
    welcomeText || "欢迎使用 ClassSight",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (welcomeText) {
      setResolvedWelcomeText(welcomeText);
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const teacherResponse = await fetch("/api/teacher/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (teacherResponse.ok) {
          const teacherResult = (await teacherResponse.json()) as {
            data?: { name?: string; id?: string };
          };

          if (!cancelled) {
            const displayName =
              teacherResult.data?.name?.trim() || teacherResult.data?.id?.trim() || "";
            setResolvedWelcomeText(displayName ? `欢迎，教师 ${displayName}` : "欢迎，教师");
            setIsAuthenticated(true);
          }
          return;
        }

        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load session");
        }

        const session = (await response.json()) as AuthSession | null;
        if (!cancelled) {
          setResolvedWelcomeText(buildWelcomeText(session?.user));
          setIsAuthenticated(Boolean(session?.user));
        }
      } catch {
        if (!cancelled) {
          setResolvedWelcomeText(welcomeText || "欢迎使用 ClassSight");
          setIsAuthenticated(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [welcomeText]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({
        callbackUrl: "/auth/login",
        redirect: true,
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-white shadow-md dark:bg-[oklch(0.205_0_0)]">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm">{resolvedWelcomeText}</div>
          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isSigningOut ? "退出中..." : "退出登录"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
