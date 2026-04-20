/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";
import SearchBar from "@/components/SearchBar";
import DataTable from "@/components/DataTable";
import Pagination from "@/components/Pagination";
import StudentAddDialog from "@/components/StudentAddDialog";
import StudentEditDialog from "@/components/StudentEditDialog";
import BulkImportDialog from "@/components/BulkImportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Student {
  name: string;
  studentId: string;
  departmentId: string;
  departmentName: string;
  major: string;
  grade: string;
  class: string;
  email: string;
  phone: string;
  password?: string;
  enrollmentDate: string;
  status: "active" | "suspended" | "graduated";
  courseCount?: number;
}

interface Department {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;
const STUDENT_BULK_SAMPLE = `姓名,学号,学院,专业,年级,班级,邮箱,电话,密码,状态,入学日期
张晨,20250001,计算机学院,人工智能,2025,1班,zhangchen@example.com,13800000001,123456,在读,2025-09-01
李雨桐,20250002,自动化学院,机器人工程,2025,2班,,13800000002,123456,在读,2025-09-01`;

function normalizeDateInput(value?: string) {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  return value.includes("T") ? value.split("T")[0] : value;
}

function splitBulkLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((item) => item.trim());
  }

  return trimmed.split(/[，,]/).map((item) => item.trim());
}

function mapStudentStatus(value?: string): Student["status"] {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "休学" || normalized === "suspended") {
    return "suspended";
  }

  if (normalized === "毕业" || normalized === "graduated") {
    return "graduated";
  }

  return "active";
}

const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: "",
    studentId: "",
    departmentId: "",
    major: "",
    grade: "2025",
    class: "",
    email: "",
    phone: "",
    password: "",
    enrollmentDate: normalizeDateInput(),
    status: "active",
  });
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({});

  const fetchStudents = async () => {
    const response = await fetch("/api/student", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("获取学生数据失败");
    }

    const result = await response.json();
    const studentsArray = Array.isArray(result)
      ? result
      : result && Array.isArray(result.data)
        ? result.data
        : [];

    const normalizedStudents = studentsArray.map((student: any) => ({
      ...student,
      departmentName:
        student.departmentName ||
        student.department?.name ||
        "未分配学院",
      phone: student.phone || "",
      email: student.email || "",
      class: student.class || "",
      major: student.major || "",
      grade: student.grade || "",
      enrollmentDate: normalizeDateInput(student.enrollmentDate),
    }));

    setStudents(normalizedStudents);
  };

  const fetchDepartments = async () => {
    const response = await fetch("/api/department", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("获取学院数据失败");
    }

    const result = await response.json();
    const departmentsArray =
      result && Array.isArray(result.data) ? result.data : [];

    setDepartments(departmentsArray);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([fetchStudents(), fetchDepartments()]);
      } catch (error) {
        console.error(error);
        setError("学生数据加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return students;
    }

    return students.filter((student) =>
      [student.name, student.studentId, student.departmentName, student.major]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(keyword))
    );
  }, [searchTerm, students]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getDepartmentByKeyword = (keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    return departments.find(
      (department) =>
        department.id.toLowerCase() === normalized ||
        department.name.trim().toLowerCase() === normalized
    );
  };

  const resetNewStudent = () => {
    setNewStudent({
      name: "",
      studentId: "",
      departmentId: "",
      major: "",
      grade: "2025",
      class: "",
      email: "",
      phone: "",
      password: "",
      enrollmentDate: normalizeDateInput(),
      status: "active",
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddStudent = async () => {
    if (
      !newStudent.name ||
      !newStudent.studentId ||
      !newStudent.departmentId ||
      !newStudent.major ||
      !newStudent.password
    ) {
      toast.error("请填写姓名、学号、学院、专业和密码");
      return;
    }

    try {
      const response = await fetch("/api/student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newStudent.name,
          studentId: newStudent.studentId,
          departmentId: newStudent.departmentId,
          major: newStudent.major,
          grade: newStudent.grade || "2025",
          class: newStudent.class || "",
          email: newStudent.email || "",
          phone: newStudent.phone || "",
          password: newStudent.password,
          enrollmentDate: newStudent.enrollmentDate
            ? `${normalizeDateInput(newStudent.enrollmentDate)}T00:00:00.000Z`
            : new Date().toISOString(),
          status: (newStudent.status as Student["status"]) || "active",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "添加学生失败");
      }

      await fetchStudents();
      setIsAddDialogOpen(false);
      resetNewStudent();
      toast.success("学生信息已添加");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "添加学生失败");
    }
  };

  const handleEditStudent = async () => {
    if (
      !selectedStudent ||
      !editingStudent.name ||
      !editingStudent.studentId ||
      !editingStudent.departmentId ||
      !editingStudent.major
    ) {
      toast.error("请填写姓名、学号、学院和专业");
      return;
    }

    try {
      const response = await fetch(`/api/student/${selectedStudent.studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingStudent.name,
          studentId: editingStudent.studentId,
          departmentId: editingStudent.departmentId,
          major: editingStudent.major,
          grade: editingStudent.grade || selectedStudent.grade,
          class: editingStudent.class || selectedStudent.class,
          email: editingStudent.email || selectedStudent.email,
          phone: editingStudent.phone || selectedStudent.phone,
          enrollmentDate: editingStudent.enrollmentDate
            ? `${normalizeDateInput(editingStudent.enrollmentDate)}T00:00:00.000Z`
            : selectedStudent.enrollmentDate,
          status:
            (editingStudent.status as Student["status"]) || selectedStudent.status,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "更新学生失败");
      }

      await fetchStudents();
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      setEditingStudent({});
      toast.success("学生信息已更新");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "更新学生失败");
    }
  };

  const handleDeleteStudent = async (student?: Student) => {
    const targetStudent = student || selectedStudent;
    if (!targetStudent) {
      return;
    }

    try {
      const response = await fetch(`/api/student/${targetStudent.studentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "删除学生失败");
      }

      await fetchStudents();
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
      toast.success("学生信息已删除");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "删除学生失败");
    }
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditingStudent({
      name: student.name,
      studentId: student.studentId,
      departmentId: student.departmentId,
      major: student.major,
      grade: student.grade,
      class: student.class,
      email: student.email,
      phone: student.phone,
      enrollmentDate: normalizeDateInput(student.enrollmentDate),
      status: student.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleBulkAddStudents = async () => {
    const lines = bulkContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("请先粘贴批量导入内容");
      return;
    }

    const payload: Array<Record<string, string>> = [];

    try {
      lines.forEach((line, index) => {
        const columns = splitBulkLine(line);
        if (columns.length === 0) {
          return;
        }

        if (
          index === 0 &&
          ["姓名", "name"].some((marker) => columns[0]?.includes(marker))
        ) {
          return;
        }

        if (columns.length < 9) {
          throw new Error(`第 ${index + 1} 行字段不足，至少需要 9 列`);
        }

        const [
          name,
          studentId,
          departmentKeyword,
          major,
          grade,
          className,
          email,
          phone,
          password,
          status,
          enrollmentDate,
        ] = columns;

        const department = getDepartmentByKeyword(departmentKeyword);
        if (!department) {
          throw new Error(`第 ${index + 1} 行学院“${departmentKeyword}”未匹配到系统学院`);
        }

        payload.push({
          name,
          studentId,
          departmentId: department.id,
          major,
          grade: grade || "2025",
          class: className || "",
          email: email || "",
          phone: phone || "",
          password,
          status: mapStudentStatus(status),
          enrollmentDate: enrollmentDate
            ? `${normalizeDateInput(enrollmentDate)}T00:00:00.000Z`
            : new Date().toISOString(),
        });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量内容解析失败");
      return;
    }

    if (payload.length === 0) {
      toast.error("没有识别到可导入的学生记录");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const response = await fetch("/api/student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok && !result.summary) {
        throw new Error(result.error || result.message || "批量导入失败");
      }

      await fetchStudents();
      setIsBulkDialogOpen(false);
      setBulkContent("");

      const summary = result.summary;
      if (summary?.failed) {
        const failedNames = (result.errors || [])
          .slice(0, 3)
          .map((item: { name?: string; studentId?: string }) => item.name || item.studentId)
          .filter(Boolean)
          .join("、");
        toast.warning(
          `学生批量导入完成，成功 ${summary.created} 条，失败 ${summary.failed} 条${failedNames ? `：${failedNames}` : ""}`
        );
      } else {
        toast.success(`学生批量导入成功，共新增 ${summary?.created || payload.length} 条`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "批量导入失败");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            在读
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            休学
          </Badge>
        );
      case "graduated":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            毕业
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
        <PageHeader title="ClassSight 管理系统" welcomeText="欢迎，管理员" />
        <StudentNavigation role={2} />
        <main className="container mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
            <h1 className="text-2xl font-bold">学生管理</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              正在加载学生名单与学院信息...
            </p>
          </div>
        </main>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight 管理系统" welcomeText="欢迎，管理员" />
      <StudentNavigation role={2} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
          <h1 className="text-2xl font-bold">学生管理</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            支持单个录入、批量导入、编辑和删除学生资料。
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl bg-white p-8 shadow-md dark:bg-[oklch(0.205_0_0)]">
            <p className="text-lg font-medium text-red-500">{error}</p>
            <Button
              className="mt-4"
              onClick={() => {
                setLoading(true);
                setError(null);
                void Promise.all([fetchStudents(), fetchDepartments()]).finally(() =>
                  setLoading(false)
                );
              }}
            >
              重新加载
            </Button>
          </div>
        ) : (
          <>
            <SearchBar
              searchTerm={searchTerm}
              onSearch={handleSearch}
              placeholder="搜索学生姓名、学号、学院或专业"
              onAddClick={() => setIsAddDialogOpen(true)}
              addButtonText="添加学生"
              additionalContent={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setIsBulkDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  批量添加
                </Button>
              }
            />

            <DataTable
              title="学生列表"
              data={paginatedStudents.map((student) => ({
                ...student,
                id: student.studentId,
              }))}
              columns={[
                { header: "姓名", accessor: "name", className: "font-medium" },
                { header: "学号", accessor: "studentId" },
                { header: "所属学院", accessor: "departmentName" },
                { header: "专业", accessor: "major" },
                {
                  header: "年级班级",
                  accessor: (student) => `${student.grade || "--"} ${student.class || ""}`,
                },
                {
                  header: "邮箱",
                  accessor: (student) => (
                    <a
                      href={`mailto:${student.email}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {student.email || "--"}
                    </a>
                  ),
                },
                {
                  header: "电话",
                  accessor: (student) => student.phone || "--",
                },
                { header: "状态", accessor: "status" },
              ]}
              onEdit={(student) => openEditDialog(student)}
              onDelete={(student) => handleDeleteStudent(student)}
              deleteDialogOpen={isDeleteDialogOpen}
              setDeleteDialogOpen={setIsDeleteDialogOpen}
              selectedItem={selectedStudent as any}
              setSelectedItem={setSelectedStudent as any}
              emptyStateText="当前没有匹配到学生记录"
              getStatusBadge={getStatusBadge}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredStudents.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>

      <StudentAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        departments={departments}
        onAddStudent={handleAddStudent}
      />

      <StudentEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingStudent={editingStudent}
        setEditingStudent={setEditingStudent}
        departments={departments}
        onEditStudent={handleEditStudent}
        selectedStudent={selectedStudent}
      />

      <BulkImportDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        title="批量添加学生"
        description="支持粘贴 Excel 导出的逗号分隔或制表符内容，系统会按行解析并逐条写入。"
        formatHint="格式为：姓名, 学号, 学院名称或学院ID, 专业, 年级, 班级, 邮箱, 电话, 密码, 状态, 入学日期。前 9 列为基础必填，状态和入学日期可省略。"
        sample={STUDENT_BULK_SAMPLE}
        value={bulkContent}
        onChange={setBulkContent}
        onSubmit={handleBulkAddStudents}
        isSubmitting={isBulkSubmitting}
      />

      <PageFooter />
    </div>
  );
};

export default StudentManagementPage;
