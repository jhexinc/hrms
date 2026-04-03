import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Pencil, Search } from "lucide-react";
import { DEPARTMENTS } from "@/constants/departments";


export default function AdminEmployeeList() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>([...DEPARTMENTS]);
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);


  async function loadEmployees() {
    try {
      setLoading(true);
      const res = await api.get("/admin/employees");
      setEmployees(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  /* ===========================
     SEARCH + FILTER (ROBUST)
  ============================ */

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return employees.filter((e) => {
      const status = e.employmentStatus ?? e.status ?? "REGULAR";

      const searchableText = [
        e.name,
        e.Email,
        e.department,
        e.designation,

        // ✅ Search by employee code also
        e.employeeCode,
        e.EmployeeID, // fallback
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || searchableText.includes(q);

      const matchesDept = !department || e.department === department;

      const matchesStatus = !statusFilter || status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, search, department, statusFilter]);

  const registeredEmployees = useMemo(
    () => filtered.filter((emp) => emp.name),
    [filtered]
  );

  const pendingEmployees = useMemo(
    () => filtered.filter((emp) => !emp.name),
    [filtered]
  );

  const renderTable = (employeeList: any[], isPendingTab: boolean = false) => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {!isPendingTab && <TableHead>Department</TableHead>}
                {!isPendingTab && <TableHead>Status</TableHead>}
                {!isPendingTab && <TableHead>Leave Balance</TableHead>}
                {!isPendingTab && <TableHead className="text-right">Base Salary</TableHead>}
                {!isPendingTab && <TableHead className="text-center">Active</TableHead>}
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={isPendingTab ? 2 : 7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && employeeList.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isPendingTab ? 2 : 7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                employeeList.map((emp) => {
                  const status =
                    emp.employmentStatus ?? emp.status ?? "REGULAR";

                  const isRegular = status === "REGULAR";

                  const leave = emp.leaveBalance ?? emp.leave ?? null;

                  const displayCode = emp.employeeCode || emp.EmployeeID;

                  return (
                    <TableRow key={emp.EmployeeID}>
                      {/* Employee */}
                      <TableCell>
                        <div className="font-medium">{emp.name || "Incomplete Profile"}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          {displayCode}
                        </div>
                      </TableCell>

                      {!isPendingTab && <TableCell>{emp.department || "—"}</TableCell>}

                      {!isPendingTab && (
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${status === "REGULAR"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                              }`}
                          >
                            {status}
                          </span>
                        </TableCell>
                      )}

                      {!isPendingTab && (
                        <TableCell>
                          {isRegular ? (
                            <span className="text-sm">
                              CPL {leave?.CPL ?? 4} / SL {leave?.SL ?? 2}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}

                      {!isPendingTab && (
                        <TableCell className="text-right">
                          ₹
                          {emp.baseSalary
                            ? emp.baseSalary.toLocaleString("en-IN")
                            : "—"}
                        </TableCell>
                      )}

                      {!isPendingTab && (
                        <TableCell className="text-center">
                          <Switch
                            checked={emp.isActive !== false}
                            onCheckedChange={async (checked) => {
                              try {
                                await api.put(
                                  `/admin/employees/${emp.EmployeeID}`,
                                  {
                                    isActive: checked,
                                  },
                                );

                                setEmployees((prev) =>
                                  prev.map((e) =>
                                    e.EmployeeID === emp.EmployeeID
                                      ? { ...e, isActive: checked }
                                      : e,
                                  ),
                                );
                              } catch {
                                alert("Failed to update status");
                              }
                            }}
                          />
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          onClick={() =>
                            navigate(`/admin/employees/${emp.EmployeeID}`)
                          }
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Manage employee records, status, and leave balances
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, dept, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Department */}
          <Select
            value={department || "ALL"}
            onValueChange={(v) => setDepartment(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departmentOptions.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Employment Status */}
          <Select
            value={statusFilter || "ALL"}
            onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="REGULAR">Regular</SelectItem>
              <SelectItem value="PROBATION">Probation</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="registered" className="w-full">
        <TabsList className="mb-4 bg-white border shadow-sm">
          <TabsTrigger value="registered" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Registered ({registeredEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
            Pending Registration ({pendingEmployees.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="registered" className="mt-0 outline-none">
          {renderTable(registeredEmployees)}
        </TabsContent>
        <TabsContent value="pending" className="mt-0 outline-none">
          {renderTable(pendingEmployees, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
