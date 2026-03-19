"use client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentMonth } from "@/utils/dateHelpers";
import { Skeleton } from "@/components/ui/skeleton";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

import { RefreshCw, Download } from "lucide-react";

/* =====================================================
   CASalaryCalculator Page
===================================================== */

export default function CASalaryCalculator() {
  /* ===========================
     STATE
  =========================== */

  // raw fetched dataset for selected month
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState(getCurrentMonth());
  // filter states
  const [department, setDepartment] = useState("");
  const [branch, setBranch] = useState("");
  const [pfApplicable] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [exitedOnly] = useState(false);

  // dropdown options derived from fetched data
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);

  const defaultColumns = [
    "employeeCode",
    "uan",
    "name",
    "baseSalary",
    "totalDays", // ✅ NOT daysInMonth
    "presentDays",
    "exitDate",
  ];

  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(defaultColumns);

  /* ===========================
     ALL AVAILABLE COLUMNS
  =========================== */

  const allColumns = [
    { key: "employeeCode", label: "Employee Code" },
    { key: "uan", label: "UAN No" },
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "baseSalary", label: "Salary" },
    { key: "totalDays", label: "Total Days" }, // ✅ THIS
    { key: "presentDays", label: "Present Days" },
    { key: "exitDate", label: "Exit Date" },
  ];

  /* ===========================
     FETCH DATA
  =========================== */

  const fetchData = async () => {
    if (!month) return;

    setLoading(true);

    try {
      // fetch server-side data by month only; client-side will filter department/branch/search instantly
      const res = await api.get(`/admin/ca-salary`, {
        params: { month },
      });

      const rows = res.data || [];
      setData(rows);

      // derive unique department & branch options
      const depts = Array.from(
        new Set(
          rows
            .map((r: any) => String(r.department || "").trim())
            .filter(Boolean),
        ),
      ) as string[];
      const branches = Array.from(
        new Set(
          rows
            .map((r: any) => String(r.branch || "").trim())
            .filter(Boolean),
        ),
      ) as string[];

      setDepartmentOptions(depts.sort());
      setBranchOptions(branches.sort());
    } catch (error) {
      console.error(error);
      setData([]);
      setDepartmentOptions([]);
      setBranchOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (month) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  /* ===========================
     COLUMN TOGGLE
  =========================== */

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter((col) => col !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  /* ===========================
     CLIENT-SIDE FILTERING (instant)
  =========================== */

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.filter((row) => {
      // Month is already used server-side to fetch data, but keep branch/department/pf/exited filters here
      if (department && (row.department || "") !== department) return false;
      if (branch && (row.branch || "") !== branch) return false;
      if (pfApplicable !== undefined && pfApplicable !== "all") {
        // if dataset exposes pfApplicable as boolean/string — handle both
        const val = String(row.pfApplicable ?? "").toLowerCase();
        if (pfApplicable === "true" && val !== "true") return false;
        if (pfApplicable === "false" && val !== "false") return false;
      }
      if (exitedOnly) {
        if (!row.exitDate) return false;
      }

      if (!q) return true;

      const name = String(row.name || "").toLowerCase();
      const code = String(row.employeeCode || "").toLowerCase();
      const uan = String(row.uan || "").toLowerCase();

      return name.includes(q) || code.includes(q) || uan.includes(q);
    });
  }, [data, search, department, branch, pfApplicable, exitedOnly]);

  /* ===========================
     CSV EXPORT (uses filtered data)
  =========================== */

  const exportToExcel = () => {
    if (!filteredData.length) return;

    // Map visible columns to proper labels
    const headers = visibleColumns.map(
      (col) => allColumns.find((c) => c.key === col)?.label || col,
    );

    const exportData = filteredData.map((row) => {
      const obj: any = {};

      visibleColumns.forEach((col, index) => {
        let value = row[col] ?? "";

        // Force UAN and employeeCode as string
        if (col === "uan" || col === "employeeCode") {
          value = String(value);
        }

        obj[headers[index]] = value;
      });

      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Optional: Auto column width
    const columnWidths = headers.map((header) => ({
      wch: Math.max(header.length + 2, 15),
    }));
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CA Salary");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, `CA-Salary-${month}.xlsx`);
  };

  /* ===========================
     UI
  =========================== */

  return (
    <Card>
      <CardHeader>
        <CardTitle>CA Salary Calculator</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ===========================
           FILTERS SECTION
        =========================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Month */}
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />

          {/* Department (dropdown) */}
          <Select
            value={department || "all"}
            onValueChange={(value) =>
              setDepartment(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch (dropdown) */}
          <Select
            value={branch || "all"}
            onValueChange={(value) => setBranch(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search (instant) */}
          <Input
            placeholder="Search Name or Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          

          {/* Refresh (refetch month data) */}
          <Button onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {/* Export */}
          <Button onClick={exportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* ===========================
           COLUMN SELECTOR
        =========================== */}

        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            {allColumns.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <span>{col.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ===========================
           TABLE
        =========================== */}

        <div className="overflow-auto border border-border rounded-lg bg-card">
          <Table className="text-foreground">
            <TableHeader>
              <TableRow>
                {visibleColumns.map((col) => {
                  const columnMeta = allColumns.find((c) => c.key === col);
                  return (
                    <TableHead key={col}>{columnMeta?.label || col}</TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={visibleColumns.length} className="py-4">
                      <div className="flex gap-4">
                        {visibleColumns.map((_, idx) => (
                          <Skeleton key={idx} className="h-4 flex-1" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>No data found</TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.EmployeeID}>
                    {visibleColumns.map((col) => (
                      <TableCell key={col}>{row[col] ?? "-"}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
