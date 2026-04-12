import prisma from "@/db/db";

type RankedStudentMetric = {
  id: string;
  name: string;
  studentId?: string;
  trackerId?: string;
  attendanceRate: number;
  lookUpRate: number;
  focusLevel: number;
  participationCount: number;
  score: number;
  rank: number;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function distributionByLookUpRate(students: RankedStudentMetric[]) {
  const buckets = [
    { name: "0-59%", min: 0, max: 59, value: 0 },
    { name: "60-69%", min: 60, max: 69, value: 0 },
    { name: "70-79%", min: 70, max: 79, value: 0 },
    { name: "80-89%", min: 80, max: 89, value: 0 },
    { name: "90-100%", min: 90, max: 100, value: 0 },
  ];

  for (const student of students) {
    const bucket = buckets.find(
      (item) => student.lookUpRate >= item.min && student.lookUpRate <= item.max,
    );

    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ name, value }) => ({ name, value }));
}

function buildAttendanceSummary(students: RankedStudentMetric[]) {
  const presentStudents = students.filter((student) => student.attendanceRate > 0);
  const presentStudentIds = presentStudents
    .map((student) => student.studentId ?? student.trackerId ?? student.id)
    .filter(Boolean);

  return {
    presentCount: presentStudents.length,
    absentCount: Math.max(0, students.length - presentStudents.length),
    presentStudentIds,
  };
}

export async function getCoursePerformance(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      department: true,
      courseEnrollments: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!course) return null;

  const latestSession = await prisma.inferenceSession.findFirst({
    where: {
      courseId,
    },
    include: {
      device: true,
      studentMetrics: {
        include: {
          student: true,
        },
      },
      classMetric: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  });
  const metricMap = new Map<string, RankedStudentMetric>();

  for (const enrollment of course.courseEnrollments) {
    if (!enrollment.student) continue;

    metricMap.set(`student:${enrollment.student.studentId}`, {
      id: enrollment.student.studentId,
      name: enrollment.student.name,
      studentId: enrollment.student.studentId,
      attendanceRate: 0,
      lookUpRate: 0,
      focusLevel: 0,
      participationCount: 0,
      score: 0,
      rank: 0,
    });
  }

  if (latestSession) {
    for (const metric of latestSession.studentMetrics) {
      const key = metric.studentId ? `student:${metric.studentId}` : `tracker:${metric.trackerId}`;
      metricMap.set(key, {
        id: metric.studentId ?? metric.trackerId ?? metric.id,
        name:
          metric.student?.name ??
          metric.displayName ??
          metric.studentId ??
          metric.trackerId ??
          "Unknown",
        studentId: metric.studentId ?? undefined,
        trackerId: metric.trackerId ?? undefined,
        attendanceRate: Number(metric.attendanceRate.toFixed(2)),
        lookUpRate: Number(metric.lookUpRate.toFixed(2)),
        focusLevel: Number(metric.focusLevel.toFixed(2)),
        participationCount: metric.participationCount,
        score: Number(metric.score.toFixed(2)),
        rank: 0,
      });
    }
  }

  const students = Array.from(metricMap.values())
    .sort((a, b) => b.score - a.score)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

  const computedClassStats = {
    avgAttendance: average(students.map((item) => item.attendanceRate)),
    avgLookUpRate: average(students.map((item) => item.lookUpRate)),
    avgFocusLevel: average(students.map((item) => item.focusLevel)),
    avgParticipationCount: average(students.map((item) => item.participationCount)),
  };
  const attendanceSummary = buildAttendanceSummary(students);

  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code,
      credits: course.credits,
      teacherName: course.teacher?.name ?? "",
      departmentName: course.department?.name ?? "",
      schedule: course.schedule,
      studentCount: course.studentCount,
    },
    session: latestSession
      ? {
          id: latestSession.id,
          status: latestSession.status,
          startedAt: latestSession.startedAt,
          endedAt: latestSession.endedAt,
          classroom: latestSession.classroom,
          sourceStream: latestSession.sourceStream,
          deviceName: latestSession.device.name,
        }
      : null,
    classStats: latestSession?.classMetric
      ? {
          avgAttendance: latestSession.classMetric.avgAttendance,
          avgLookUpRate: latestSession.classMetric.avgLookUpRate,
          avgFocusLevel: latestSession.classMetric.avgFocusLevel,
          avgParticipationCount: latestSession.classMetric.avgParticipationCount,
          totalStudents: latestSession.classMetric.totalStudents,
          distribution:
            latestSession.classMetric.distribution ?? distributionByLookUpRate(students),
        }
      : {
          ...computedClassStats,
          totalStudents: students.length,
          distribution: distributionByLookUpRate(students),
        },
    attendanceSummary,
    students,
  };
}
