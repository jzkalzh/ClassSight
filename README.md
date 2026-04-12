# ClassSight
<<<<<<< HEAD

课堂行为洞察系统（Web + Edge）。

本项目包含：
- Web 端（Next.js）
- 数据层（Prisma + PostgreSQL）
- 边缘设备上报（Jetson/Python）

## 1. 环境要求

- Windows 10/11（开发机）
- Node.js `20+`
- Docker Desktop（用于 PostgreSQL）
- Git
- 可选：Python `3.10+`（本机调试边缘脚本）

## 2. 拉取与安装

```powershell
cd G:\codex_test
git clone <你的仓库地址> ClassSight
cd G:\codex_test\ClassSight
npm ci
```

## 3. 启动 PostgreSQL（Docker）

```powershell
docker run -d --name classsight-pg `
  -e POSTGRES_PASSWORD=123456 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_DB=postgres `
  -p 5432:5432 `
  postgres:17
```

检查容器状态：

```powershell
docker ps
```

## 4. 配置环境变量

在项目根目录创建 `.env`，至少包含：

```env
DATABASE_URL=postgresql://postgres:123456@127.0.0.1:5432/postgres?schema=public
AUTH_SECRET=请替换成你自己的长随机字符串
```

可用以下命令生成随机 `AUTH_SECRET`（PowerShell）：

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

## 5. 初始化数据库

```powershell
npm run prisma:generate
npx prisma migrate deploy
```

## 6. 导入模拟数据（课程/学生/课堂表现）

```powershell
node .\scripts\seed-simulated-classroom.js
```

当前脚本默认会导入较大规模数据（每位教师约 36 名学生，含课程、选课、课堂会话和行为指标）。

## 7. 启动项目

```powershell
npm run dev -- --hostname 0.0.0.0 --port 3000
```

访问：

- 本机：`http://localhost:3000`
- 局域网设备：`http://<你的电脑IP>:3000`

## 8. 主要页面

- 教师首页：`/home/teacher`
- 教师课程：`/home/teacher/courses`
- 教师日历：`/home/teacher/calendar`
- 教师资料（可编辑）：`/home/teacher/profile`
- 课堂表现详情：`/home/performance/course/<courseId>`

## 9. 边缘端（Jetson）说明

Jetson 兼容脚本目录：

- `edge/jetson`

常用流程：

```bash
cd /home/lzh/classsight-edge-jetson
source .venv/bin/activate
python attendance_report_py36.py
```

确保以下条件成立：
- Web 服务可从 Jetson 访问（`http://<PC-IP>:3000`）
- `.env` 中配置了正确的 `API_BASE_URL` 和 `DEVICE_KEY`
- 识别结果文件存在并格式正确（`attendance_result.json`）

## 10. 常见问题

### 10.1 登录后欢迎语不正确

- 确认已完成最近代码更新（已包含 `app/api/auth/[...nextauth]/route.ts`）
- 修改资料后刷新页面，必要时重启 `npm run dev`

### 10.2 教师课程安排显示为 JSON 字符串

- 已在后端做兼容解析（字符串化 JSON -> 可读排课文本）
- 若仍出现，检查数据库中 `course.schedule` 是否为有效 JSON

### 10.3 Jetson 无法访问接口（超时）

1. 前端需绑定 `0.0.0.0`
2. 放行 Windows 防火墙 `3000` 端口
3. Jetson 上先 `curl http://<PC-IP>:3000` 验证连通

## 11. 开发命令

```powershell
# 代码检查
npm run lint

# 生成 Prisma Client
npm run prisma:generate

# 执行迁移
npx prisma migrate deploy
```

---
