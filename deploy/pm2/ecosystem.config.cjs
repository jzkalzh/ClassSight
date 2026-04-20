module.exports = {
  apps: [
    {
      name: "classsight-teacher",
      cwd: "/opt/classsight",
      script: "node",
      args: "scripts/run-instance.js start teacher",
      env: {
        NODE_ENV: "production",
        APP_PORT: "3000",
        AUTH_COOKIE_PREFIX: "classsight-teacher",
        AUTH_URL: "https://teacher.example.com",
      },
    },
    {
      name: "classsight-student",
      cwd: "/opt/classsight",
      script: "node",
      args: "scripts/run-instance.js start student",
      env: {
        NODE_ENV: "production",
        APP_PORT: "3001",
        AUTH_COOKIE_PREFIX: "classsight-student",
        AUTH_URL: "https://student.example.com",
      },
    },
    {
      name: "classsight-admin",
      cwd: "/opt/classsight",
      script: "node",
      args: "scripts/run-instance.js start admin",
      env: {
        NODE_ENV: "production",
        APP_PORT: "3002",
        AUTH_COOKIE_PREFIX: "classsight-admin",
        AUTH_URL: "https://admin.example.com",
      },
    },
  ],
};
