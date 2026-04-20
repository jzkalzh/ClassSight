"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import PageFooter from "@/components/PageFooter";
import StudentNavigation from "@/components/StudentNavigation";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import TeacherList from "@/components/TeacherList";
import TeacherAddDialog from "@/components/TeacherAddDialog";
import TeacherEditDialog from "@/components/TeacherEditDialog";
import BulkImportDialog from "@/components/BulkImportDialog";
import { Button } from "@/components/ui/button";

interface Teacher {
  id?: string;
  name: string;
  teacherId: string;
  departmentId: string;
  departmentName: string;
  rank: string;
  email: string;
  phone: string;
  office: string;
  hireDate: string;
  status: "active" | "onLeave" | "resigned";
  courseCount: number;
  studentCount: number;
  password?: string;
}

interface Department {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;
const TEACHER_BULK_SAMPLE = `姓名,工号,学院,职称,邮箱,电话,办公室,入职日期,密码,状态
王晨,TC2025001,计算机学院,讲师,wangchen@example.com,13900000001,A-301,2025-02-20,123456,在职
李敏,TC2025002,自动化学院,副教授,,13900000002,B-402,2024-09-01,123456,在职`;

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

function mapTeacherStatus(value?: string): Teacher["status"] {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "休假" || normalized === "onleave") {
    return "onLeave";
  }

  if (normalized === "离职" || normalized === "resigned") {
    return "resigned";
  }

  return "active";
}

const TeacherManagementPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    name: "",
    teacherId: "",
    departmentId: "",
    rank: "讲师",
    email: "",
    phone: "",
    office: "",
    hireDate: normalizeDateInput(),
    status: "active",
    password: "",
  });
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher>>({});

  const fetchTeachers = async () => {
    const response = await fetch("/api/teacher", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("获取教师数据失败");
    }

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "获取教师数据失败");
    }

    const normalizedTeachers = (result.data || []).map((teacher: Teacher) => ({
      ...teacher,
      departmentName: teacher.departmentName || "未分配学院",
      phone: teacher.phone || "",
      office: teacher.office || "",
      email: teacher.email || "",
      hireDate: normalizeDateInput(teacher.hireDate),
    }));

    setTeachers(normalizedTeachers);
  };

  const fetchDepartments = async () => {
    const response = await fetch("/api/department", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("获取学院数据失败");
    }

    const result = await response.json();
    if (result.status === "success") {
      setDepartments(result.data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        await Promise.all([fetchTeachers(), fetchDepartments()]);
      } catch (error) {
        console.error(error);
        toast.error("加载教师数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredTeachers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      [teacher.name, teacher.teacherId, teacher.departmentName, teacher.rank]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(keyword))
    );
  }, [searchTerm, teachers]);

  const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
  const paginatedTeachers = filteredTeachers.slice(
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

  const resetNewTeacher = () => {
    setNewTeacher({
      name: "",
      teacherId: "",
      departmentId: "",
      rank: "讲师",
      email: "",
      phone: "",
      office: "",
      hireDate: normalizeDateInput(),
      status: "active",
      password: "",
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddTeacher = async () => {
    if (
      !newTeacher.name ||
      !newTeacher.teacherId ||
      !newTeacher.password ||
      !newTeacher.departmentId ||
      !newTeacher.rank
    ) {
      toast.error("请填写姓名、工号、密码、学院和职称");
      return;
    }

    const department = departments.find((item) => item.id === newTeacher.departmentId);
    if (!department) {
      toast.error("请选择有效的学院");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newTeacher.name,
          teacherId: newTeacher.teacherId,
          departmentId: newTeacher.departmentId,
          departmentName: department.name,
          rank: newTeacher.rank,
          email: newTeacher.email || "",
          phone: newTeacher.phone || "",
          office: newTeacher.office || "",
          hireDate: newTeacher.hireDate
            ? new Date(normalizeDateInput(newTeacher.hireDate)).toISOString()
            : new Date().toISOString(),
          status: (newTeacher.status as Teacher["status"]) || "active",
          password: newTeacher.password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "添加教师失败");
      }

      await fetchTeachers();
      setIsAddDialogOpen(false);
      resetNewTeacher();
      toast.success("教师信息已添加");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "添加教师失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeacher = async () => {
    if (
      !selectedTeacher ||
      !editingTeacher.name ||
      !editingTeacher.teacherId ||
      !editingTeacher.departmentId ||
      !editingTeacher.rank
    ) {
      toast.error("请填写姓名、工号、学院和职称");
      return;
    }

    const department = departments.find((item) => item.id === editingTeacher.departmentId);
    if (!department) {
      toast.error("请选择有效的学院");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teacher/${selectedTeacher.teacherId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: editingTeacher.name,
          teacherId: editingTeacher.teacherId,
          departmentId: editingTeacher.departmentId,
          departmentName: department.name,
          rank: editingTeacher.rank,
          email: editingTeacher.email || "",
          phone: editingTeacher.phone || "",
          office: editingTeacher.office || "",
          hireDate: editingTeacher.hireDate
            ? new Date(normalizeDateInput(editingTeacher.hireDate)).toISOString()
            : selectedTeacher.hireDate,
          status:
            (editingTeacher.status as Teacher["status"]) || selectedTeacher.status,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "更新教师失败");
      }

      await fetchTeachers();
      setIsEditDialogOpen(false);
      setSelectedTeacher(null);
      setEditingTeacher({});
      toast.success("教师信息已更新");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "更新教师失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teacher/${selectedTeacher.teacherId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "删除教师失败");
      }

      await fetchTeachers();
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      toast.success("教师信息已删除");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "删除教师失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditingTeacher({
      name: teacher.name,
      teacherId: teacher.teacherId,
      departmentId: teacher.departmentId,
      departmentName: teacher.departmentName,
      rank: teacher.rank,
      email: teacher.email,
      phone: teacher.phone,
      office: teacher.office,
      hireDate: normalizeDateInput(teacher.hireDate),
      status: teacher.status,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkAddTeachers = async () => {
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
          teacherId,
          departmentKeyword,
          rank,
          email,
          phone,
          office,
          hireDate,
          password,
          status,
        ] = columns;

        const department = getDepartmentByKeyword(departmentKeyword);
        if (!department) {
          throw new Error(`第 ${index + 1} 行学院“${departmentKeyword}”未匹配到系统学院`);
        }

        payload.push({
          name,
          teacherId,
          departmentId: department.id,
          departmentName: department.name,
          rank: rank || "讲师",
          email: email || "",
          phone: phone || "",
          office: office || "",
          hireDate: hireDate
            ? new Date(normalizeDateInput(hireDate)).toISOString()
            : new Date().toISOString(),
          password,
          status: mapTeacherStatus(status),
        });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量内容解析失败");
      return;
    }

    if (payload.length === 0) {
      toast.error("没有识别到可导入的教师记录");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const response = await fetch("/api/teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok && !result.summary) {
        throw new Error(result.error || result.message || "批量导入失败");
      }

      await fetchTeachers();
      setIsBulkDialogOpen(false);
      setBulkContent("");

      const summary = result.summary;
      if (summary?.failed) {
        const failedNames = (result.errors || [])
          .slice(0, 3)
          .map((item: { name?: string; teacherId?: string }) => item.name || item.teacherId)
          .filter(Boolean)
          .join("、");
        toast.warning(
          `教师批量导入完成，成功 ${summary.created} 条，失败 ${summary.failed} 条${failedNames ? `：${failedNames}` : ""}`
        );
      } else {
        toast.success(`教师批量导入成功，共新增 ${summary?.created || payload.length} 条`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "批量导入失败");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[oklch(0.145_0_0)] dark:text-white">
      <PageHeader title="ClassSight 管理系统" welcomeText="欢迎，管理员" />
      <StudentNavigation role={2} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
          <h1 className="text-2xl font-bold">教师管理</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            支持单个录入、批量导入、编辑和删除教师资料。
          </p>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearch={handleSearch}
          placeholder="搜索教师姓名、工号、学院或职称"
          onAddClick={() => setIsAddDialogOpen(true)}
          addButtonText="添加教师"
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

        {isLoading ? (
          <div className="rounded-3xl bg-white p-8 shadow-md dark:bg-[oklch(0.205_0_0)]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              正在加载教师数据...
            </p>
          </div>
        ) : paginatedTeachers.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-md dark:bg-[oklch(0.205_0_0)]">
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无教师数据</p>
          </div>
        ) : (
          <TeacherList
            teachers={paginatedTeachers}
            selectedTeacher={selectedTeacher}
            isDeleteDialogOpen={isDeleteDialogOpen}
            onOpenEditDialog={openEditDialog}
            onOpenDeleteDialog={openDeleteDialog}
            onDeleteTeacher={handleDeleteTeacher}
            onSetDeleteDialogOpen={setIsDeleteDialogOpen}
          />
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTeachers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}

        <TeacherAddDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          newTeacher={newTeacher}
          setNewTeacher={setNewTeacher}
          departments={departments}
          onAddTeacher={handleAddTeacher}
          isSubmitting={isSubmitting}
        />

        <TeacherEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          editingTeacher={editingTeacher}
          setEditingTeacher={setEditingTeacher}
          departments={departments}
          onEditTeacher={handleEditTeacher}
          isSubmitting={isSubmitting}
        />

        <BulkImportDialog
          open={isBulkDialogOpen}
          onOpenChange={setIsBulkDialogOpen}
          title="批量添加教师"
          description="支持粘贴 Excel 导出的逗号分隔或制表符内容，系统会按行解析并逐条写入。"
          formatHint="格式为：姓名, 工号, 学院名称或学院ID, 职称, 邮箱, 电话, 办公室, 入职日期, 密码, 状态。前 9 列为基础必填，状态可省略。"
          sample={TEACHER_BULK_SAMPLE}
          value={bulkContent}
          onChange={setBulkContent}
          onSubmit={handleBulkAddTeachers}
          isSubmitting={isBulkSubmitting}
        />
      </main>

      <PageFooter />
    </div>
  );
};

export default TeacherManagementPage;
