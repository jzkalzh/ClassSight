/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

const STUDENTS_PER_TEACHER = 36;
const START_STUDENT_ID = 20231001;
const SESSION_COUNT_PER_COURSE = 6;
const SESSION_DURATION_MINUTES = 95;
const DEMO_STUDENT = {
  studentId: "20239999",
  name: "Demo Student",
  major: "人工智能",
  class: "智能2301",
  grade: "2023",
  email: "demo.student@classsight.local",
  password: "Demo@123",
};

const departmentSeed = {
  code: "CS",
  name: "计算机与控制工程学院",
  description: "用于智能课堂与课程画像演示的模拟院系",
};

const namePool = [
  "张晨", "李睿", "王浩", "赵宁", "陈远", "刘洋", "杨凡", "黄欣", "周航", "吴楠",
  "徐泽", "孙悦", "马俊", "朱琳", "胡博", "郭宇", "何清", "高扬", "林瑞", "罗川",
  "郑可", "梁越", "谢南", "宋晨", "唐悦", "韩淼", "冯宇", "邓宁", "蔡涵", "彭晨",
  "潘越", "袁千", "于钰", "董博", "余航", "苏悦", "叶景", "吕卓", "魏清", "蒋凡",
  "田宇", "杜晨", "夏宁", "姜瑞", "崔航", "钟悦", "汪博", "陆宁", "任越", "程悦",
];

const majorPool = [
  { major: "计算机科学与技术", classPrefix: "计科" },
  { major: "软件工程", classPrefix: "软工" },
  { major: "人工智能", classPrefix: "智科" },
];

const courseTemplates = [
  {
    suffix: "A",
    name: "智能课堂分析示范课",
    type: "专业课程",
    credits: 3,
    description: "聚焦课堂行为识别、签到统计与教学反馈，是教师端总览的主展示课程。",
    schedule: { day: "周三", startTime: "08:00", endTime: "09:40", location: "A-206" },
    mode: "completed",
  },
  {
    suffix: "B",
    name: "边缘视觉实训",
    type: "实验课程",
    credits: 2,
    description: "面向 Jetson Nano 与 YOLO 推理链路的实践课程，适合展示实时采集状态。",
    schedule: { day: "周四", startTime: "14:00", endTime: "15:40", location: "B-302" },
    mode: "running",
  },
  {
    suffix: "C",
    name: "课堂数据洞察专题",
    type: "研讨课程",
    credits: 2,
    description: "展示课程画像、红黑榜、随堂练习与同类课对比。",
    schedule: { day: "周五", startTime: "10:00", endTime: "11:40", location: "C-105" },
    mode: "completed",
  },
];

function pickName(index) {
  const base = namePool[index % namePool.length];
  const suffix = Math.floor(index / namePool.length) + 1;
  return suffix === 1 ? base : `${base}${suffix}`;
}

function buildStudentSeeds(total) {
  return Array.from({ length: total }).map((_, index) => {
    const studentId = String(START_STUDENT_ID + index);
    const majorInfo = majorPool[index % majorPool.length];
    const classNo = (index % 3) + 1;

    return {
      studentId,
      name: pickName(index),
      major: majorInfo.major,
      class: `${majorInfo.classPrefix}23${String(classNo).padStart(2, "0")}`,
      grade: "2023",
    };
  });
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateScore(metric) {
  if (Number(metric.attendanceRate) <= 0) {
    return 0;
  }

  return Number(
    (
      metric.attendanceRate * 0.3 +
      metric.lookUpRate * 0.2 +
      metric.focusLevel * 0.35 +
      Math.min(metric.participationCount * 12, 100) * 0.15
    ).toFixed(2),
  );
}

function buildDistribution(metrics) {
  const buckets = [
    { name: "0-59%", min: 0, max: 59, value: 0 },
    { name: "60-69%", min: 60, max: 69, value: 0 },
    { name: "70-79%", min: 70, max: 79, value: 0 },
    { name: "80-89%", min: 80, max: 89, value: 0 },
    { name: "90-100%", min: 90, max: 100, value: 0 },
  ];

  for (const metric of metrics) {
    const bucket = buckets.find((item) => metric.lookUpRate >= item.min && metric.lookUpRate <= item.max);
    if (bucket) {
      bucket.value += 1;
    }
  }

  return buckets.map(({ name, value }) => ({ name, value }));
}

function buildMetrics(studentSeeds, teacherIndex, templateIndex, sessionIndex) {
  const sessionDrift = sessionIndex * 2;

  return studentSeeds.map((student, index) => {
    const isDemoStudent = student.studentId === DEMO_STUDENT.studentId;
    const absentMod = 9 + ((teacherIndex + templateIndex + sessionIndex) % 4);
    const attendanceRate = isDemoStudent ? 100 : index % absentMod === 0 ? 0 : 100;
    const lookUpBase = 94 - (index % 14) * 2 - teacherIndex * 2 - templateIndex * 3 - sessionDrift;
    const focusBase = 91 - (index % 13) * 2 - teacherIndex * 2 - templateIndex * 2 - sessionDrift;
    const interactionBase = 6 - (index % 5) + (templateIndex === 1 ? 1 : 0) - Math.floor(sessionIndex / 2);

    const isAbsent = attendanceRate <= 0;
    const lookUpRate = isAbsent
      ? 0
      : isDemoStudent
        ? clamp(88 - templateIndex * 3 - sessionIndex, 76, 95)
        : clamp(lookUpBase, 45, 100);
    const focusLevel = isAbsent
      ? 0
      : isDemoStudent
        ? clamp(90 - templateIndex * 2 - sessionIndex, 80, 96)
        : clamp(focusBase, 42, 100);
    const participationCount = isAbsent
      ? 0
      : isDemoStudent
        ? Math.max(3, 6 - templateIndex - Math.floor(sessionIndex / 2))
        : Math.max(1, interactionBase);

    return {
      studentId: student.studentId,
      displayName: student.name,
      attendanceRate,
      lookUpRate,
      focusLevel,
      participationCount,
    };
  });
}

function getTeacherStudents(allStudents, teacherIndex, teachersCount) {
  const size = Math.min(STUDENTS_PER_TEACHER, allStudents.length);
  const start = (teacherIndex * size) % allStudents.length;
  const selected = [];

  for (let i = 0; i < size; i += 1) {
    selected.push(allStudents[(start + i) % allStudents.length]);
  }

  if (selected.length < size && teachersCount > 1) {
    return allStudents.slice(0, size);
  }

  return selected;
}

async function ensureDepartment() {
  return prisma.department.upsert({
    where: { code: departmentSeed.code },
    update: departmentSeed,
    create: departmentSeed,
  });
}

async function ensureStudents(studentSeeds, departmentId) {
  for (const student of studentSeeds) {
    const email = student.email || `${student.studentId}@student.classsight.local`;
    const password = student.password || "123456";

    await prisma.student.upsert({
      where: { studentId: student.studentId },
      update: {
        name: student.name,
        departmentId,
        major: student.major,
        grade: student.grade,
        class: student.class,
        email,
        status: "active",
      },
      create: {
        studentId: student.studentId,
        password,
        role: 0,
        name: student.name,
        departmentId,
        major: student.major,
        grade: student.grade,
        class: student.class,
        email,
        status: "active",
      },
    });
  }
}

async function ensureTeachers(departmentId) {
  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (!teachers.length) {
    throw new Error("当前没有教师账号，无法写入模拟课程数据");
  }

  for (const [index, teacher] of teachers.entries()) {
    await prisma.teacher.update({
      where: { teacherId: teacher.teacherId },
      data: {
        name: teacher.name || `教师${index + 1}`,
        departmentId,
        departmentName: departmentSeed.name,
        rank: teacher.rank || (index === 0 ? "副教授" : "讲师"),
        email: teacher.email || `${teacher.teacherId}@teacher.classsight.local`,
        status: "active",
      },
    });
  }

  return prisma.teacher.findMany({
    orderBy: { createdAt: "asc" },
  });
}

async function ensureDevice() {
  const existing = await prisma.edgeDevice.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.edgeDevice.create({
    data: {
      name: "simulation-device-01",
      deviceKey: "simulation-device-key-01",
      location: "A-206",
      status: "active",
      metadata: { seeded: true },
    },
  });
}

async function ensureCourse(teacher, departmentId, teacherIndex, template, studentCount) {
  const code = `SIM-T${teacherIndex + 1}${template.suffix}`;
  const existing = await prisma.course.findFirst({
    where: { code },
  });

  const schedule = [template.schedule];
  const baseData = {
    name: `${template.name} ${teacherIndex + 1}`,
    code,
    teacherId: teacher.teacherId,
    departmentId,
    type: template.type,
    credits: template.credits,
    description: template.description,
    status: "active",
    schedule,
    studentCount,
  };

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return prisma.course.create({
    data: baseData,
  });
}

async function ensureEnrollments(courseId, students) {
  for (const student of students) {
    await prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: student.studentId,
          courseId,
        },
      },
      update: {
        status: "enrolled",
      },
      create: {
        studentId: student.studentId,
        courseId,
        status: "enrolled",
      },
    });
  }
}

async function clearSeededSessions(courseId) {
  const sessions = await prisma.inferenceSession.findMany({
    where: {
      courseId,
      metadata: {
        path: ["seeded"],
        equals: true,
      },
    },
    select: {
      id: true,
    },
  });

  const sessionIds = sessions.map((session) => session.id);
  if (!sessionIds.length) {
    return;
  }

  await prisma.classSessionMetric.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });
  await prisma.studentSessionMetric.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });
  await prisma.behaviorEvent.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });
  await prisma.inferenceSession.deleteMany({
    where: { id: { in: sessionIds } },
  });
}

function buildSessionPlan(mode) {
  return Array.from({ length: SESSION_COUNT_PER_COURSE }).map((_, index) => {
    if (mode === "running" && index === 0) {
      return { index, status: "running" };
    }

    return { index, status: "completed" };
  });
}

async function createSessionRecord({
  course,
  device,
  teacherIndex,
  templateIndex,
  sessionIndex,
  status,
  students,
}) {
  const baseDaysOffset = teacherIndex * 7 + templateIndex * 3 + sessionIndex;
  const startedAt = new Date(Date.now() - baseDaysOffset * 24 * 60 * 60 * 1000);
  startedAt.setHours(8 + ((templateIndex + sessionIndex) % 5) * 2, (sessionIndex * 7) % 60, 0, 0);

  const endedAt =
    status === "completed"
      ? new Date(startedAt.getTime() + SESSION_DURATION_MINUTES * 60 * 1000)
      : null;
  const classroom = course.schedule?.[0]?.location || "A-206";

  const session = await prisma.inferenceSession.create({
    data: {
      deviceId: device.id,
      courseId: course.id,
      classroom,
      sourceStream: status === "running" ? "jetson-live-stream" : "simulation-camera",
      status,
      startedAt,
      endedAt,
      metadata: {
        seeded: true,
        source: "seed-simulated-classroom",
        sessionIndex,
        templateIndex,
        mode: status,
      },
    },
  });

  const metrics = buildMetrics(students, teacherIndex, templateIndex, sessionIndex);

  for (const metric of metrics) {
    await prisma.studentSessionMetric.create({
      data: {
        sessionId: session.id,
        metricKey: `student:${metric.studentId}`,
        studentId: metric.studentId,
        displayName: metric.displayName,
        attendanceRate: metric.attendanceRate,
        lookUpRate: metric.lookUpRate,
        focusLevel: metric.focusLevel,
        participationCount: metric.participationCount,
        score: calculateScore(metric),
        rawSummary: {
          seeded: true,
          sessionIndex,
          templateIndex,
        },
      },
    });
  }

  const eventTimeBase = startedAt.getTime() + 5 * 60 * 1000;
  const events = metrics.flatMap((metric, index) => {
    const offset = index * 11 * 1000;
    return [
      {
        sessionId: session.id,
        studentId: metric.studentId,
        trackerId: metric.studentId,
        behaviorType: "attendance",
        confidence: metric.attendanceRate > 0 ? 0.98 : 0.4,
        frameTs: new Date(eventTimeBase + offset),
        durationMs: 1200,
        attributes: { present: metric.attendanceRate > 0, seeded: true, sessionIndex },
      },
      {
        sessionId: session.id,
        studentId: metric.studentId,
        trackerId: metric.studentId,
        behaviorType: "look_up",
        confidence: 0.92,
        frameTs: new Date(eventTimeBase + offset + 7000),
        durationMs: 800,
        attributes: { rate: metric.lookUpRate, seeded: true, sessionIndex },
      },
      {
        sessionId: session.id,
        studentId: metric.studentId,
        trackerId: metric.studentId,
        behaviorType: "focus",
        confidence: 0.9,
        frameTs: new Date(eventTimeBase + offset + 12000),
        durationMs: 900,
        attributes: { level: metric.focusLevel, seeded: true, sessionIndex },
      },
    ];
  });

  await prisma.behaviorEvent.createMany({
    data: events,
  });

  await prisma.classSessionMetric.create({
    data: {
      sessionId: session.id,
      avgAttendance: average(metrics.map((item) => item.attendanceRate)),
      avgLookUpRate: average(metrics.map((item) => item.lookUpRate)),
      avgFocusLevel: average(metrics.map((item) => item.focusLevel)),
      avgParticipationCount: average(metrics.map((item) => item.participationCount)),
      totalStudents: metrics.length,
      distribution: buildDistribution(metrics),
    },
  });

  return session;
}

async function createSessionBundles(course, device, teacherIndex, templateIndex, mode, students) {
  await clearSeededSessions(course.id);

  const sessions = [];
  const plan = buildSessionPlan(mode);

  for (const item of plan.reverse()) {
    const session = await createSessionRecord({
      course,
      device,
      teacherIndex,
      templateIndex,
      sessionIndex: item.index,
      status: item.status,
      students,
    });
    sessions.push(session);
  }

  return sessions.sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
}

async function main() {
  const department = await ensureDepartment();
  const teachers = await ensureTeachers(department.id);

  const totalStudentsNeeded = Math.max(STUDENTS_PER_TEACHER * teachers.length, STUDENTS_PER_TEACHER);
  const studentSeeds = buildStudentSeeds(totalStudentsNeeded);
  const allStudentSeeds = [DEMO_STUDENT, ...studentSeeds];
  await ensureStudents(allStudentSeeds, department.id);

  const device = await ensureDevice();
  const summary = [];

  for (const [teacherIndex, teacher] of teachers.entries()) {
    const teacherStudents = [
      DEMO_STUDENT,
      ...getTeacherStudents(studentSeeds, teacherIndex, teachers.length).filter(
        (student) => student.studentId !== DEMO_STUDENT.studentId,
      ),
    ];

    for (const [templateIndex, template] of courseTemplates.entries()) {
      const course = await ensureCourse(
        teacher,
        department.id,
        teacherIndex,
        template,
        teacherStudents.length,
      );

      await ensureEnrollments(course.id, teacherStudents);
      const sessions = await createSessionBundles(
        course,
        device,
        teacherIndex,
        templateIndex,
        template.mode,
        teacherStudents,
      );

      summary.push({
        teacherId: teacher.teacherId,
        teacherName: teacher.name || `教师${teacherIndex + 1}`,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        studentCount: teacherStudents.length,
        sessionCount: sessions.length,
        latestSessionId: sessions[0]?.id ?? null,
        latestSessionStatus: sessions[0]?.status ?? null,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        message: "Simulated classroom, sessions, and course analytics data seeded successfully.",
        seededStudents: studentSeeds.length + 1,
        seededTeachers: teachers.length,
        seededCourses: summary.length,
        sessionsPerCourse: SESSION_COUNT_PER_COURSE,
        studentsPerTeacher: STUDENTS_PER_TEACHER,
        summary,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
