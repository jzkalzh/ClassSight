/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const supportedProfiles = new Set(["teacher", "student", "admin"]);
const roleRoutes = {
  teacher: [
    "/auth/login",
    "/home/teacher",
    "/home/teacher/courses",
    "/home/teacher/calendar",
    "/home/teacher/profile",
  ],
  student: [
    "/auth/login",
    "/home/student",
    "/home/student/courses",
    "/home/student/calendar",
    "/home/student/profile",
  ],
  admin: [
    "/auth/login",
    "/home/admin",
    "/home/admin/courses",
    "/home/admin/student",
    "/home/admin/profile",
  ],
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getBaseUrl(profile) {
  const profileFile = path.join(projectRoot, `.env.${profile}`);
  const env = parseEnvFile(profileFile);
  return env.AUTH_URL ?? `http://127.0.0.1:${env.APP_PORT ?? "3000"}`;
}

async function warmProfile(profile, explicitBaseUrl) {
  const baseUrl = (explicitBaseUrl ?? getBaseUrl(profile)).replace(/\/+$/, "");
  const routes = roleRoutes[profile];

  console.log(`\n[${profile}] warming ${baseUrl}`);

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "classsight-warmup/1.0",
        },
      });
      const elapsed = Date.now() - startedAt;
      console.log(`${response.status} ${elapsed}ms ${url}`);
    } catch (error) {
      console.error(`ERR ${url} -> ${error.message}`);
      process.exitCode = 1;
    }
  }
}

async function main() {
  const [, , target = "all", explicitBaseUrl] = process.argv;

  if (target === "all") {
    for (const profile of ["teacher", "student", "admin"]) {
      await warmProfile(profile);
    }
    return;
  }

  if (!supportedProfiles.has(target)) {
    console.error("Usage: node scripts/warmup-routes.js <teacher|student|admin|all> [baseUrl]");
    process.exit(1);
  }

  await warmProfile(target, explicitBaseUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
