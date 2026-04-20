/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const supportedModes = new Set(["dev", "start"]);
const supportedProfiles = new Set(["teacher", "student", "admin"]);

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

function getProfileFile(profile) {
  return path.join(projectRoot, `.env.${profile}`);
}

function printUsage() {
  console.log("Usage: node scripts/run-instance.js <dev|start> <teacher|student|admin> [--dry-run]");
}

const [, , mode, profile, ...restArgs] = process.argv;
const dryRun = restArgs.includes("--dry-run");

if (!supportedModes.has(mode) || !supportedProfiles.has(profile)) {
  printUsage();
  process.exit(1);
}

const baseEnv = parseEnvFile(path.join(projectRoot, ".env"));
const profileFile = getProfileFile(profile);
const profileEnv = parseEnvFile(profileFile);

if (!fs.existsSync(profileFile)) {
  console.error(`Missing profile env file: ${profileFile}`);
  process.exit(1);
}

const mergedEnv = {
  ...process.env,
  ...baseEnv,
  ...profileEnv,
};

const port = mergedEnv.APP_PORT || profileEnv.APP_PORT;
const host = mergedEnv.APP_HOST || profileEnv.APP_HOST || "0.0.0.0";

if (!port) {
  console.error(`APP_PORT is missing in ${profileFile}`);
  process.exit(1);
}

const nextArgs = [nextBin, mode, "--hostname", String(host), "--port", String(port)];

if (mode === "dev") {
  nextArgs.splice(2, 0, "--turbopack");
}

if (dryRun) {
  console.log(JSON.stringify({
    mode,
    profile,
    host,
    port,
    authCookiePrefix: mergedEnv.AUTH_COOKIE_PREFIX,
    authUrl: mergedEnv.AUTH_URL || null,
    profileFile,
    command: ["node", ...nextArgs],
  }, null, 2));
  process.exit(0);
}

const child = spawn(process.execPath, nextArgs, {
  cwd: projectRoot,
  env: mergedEnv,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
