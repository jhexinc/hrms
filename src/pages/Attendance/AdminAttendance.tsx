import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { Search, Calendar } from "lucide-react";

type DayType = "FULL" | "FIRST_HALF" | "SECOND_HALF";

export default function AdminApplyLeave() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [dateSelections, setDateSelections] = useState<
    { date: string; type: DayType }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ===========================
     Load Employees
  ============================ */
  useEffect(() => {
    api
      .get("/admin/employees")
      .then((res) => setEmployees(res.data || []))
      .finally(() => setLoadingEmployees(false));
  }, []);

  /* ===========================
     Search Filter
  ============================ */
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;

    const query = searchQuery.toLowerCase();

    return employees.filter((emp) => {
      if (emp.isActive === false) return false;
      const name = (emp.name || "").toLowerCase();
      const code = (
        emp.employeeCode ||
        emp.EmployeeCode ||
        emp.EmployeeID ||
        ""
      ).toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [employees, searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text;
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    return (
      <>
        {before}
        <mark className="bg-emerald-100 text-emerald-900 font-semibold p-0 rounded">
          {match}
        </mark>
        {after}
      </>
    );
  };

  /* ===========================
     Generate Dates
  ============================ */
  useEffect(() => {
    if (!startDate || !endDate) {
      setDateSelections([]);
      return;
    }

    const parseLocal = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const start = parseLocal(startDate);
    const end = parseLocal(endDate);

    if (end < start) {
      setDateSelections([]);
      return;
    }

    const dates = [];
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");

      dates.push({
        date: `${year}-${month}-${day}`,
        type: "FULL" as DayType,
      });

      current.setDate(current.getDate() + 1);
    }

    setDateSelections(dates);
  }, [startDate, endDate]);

  /* ===========================
     Total Calculation
  ============================ */
  const totalDays = useMemo(() => {
    return dateSelections.reduce((acc, d) => {
      return d.type === "FULL" ? acc + 1 : acc + 0.5;
    }, 0);
  }, [dateSelections]);

  /* ===========================
     Submit
  ============================ */
  const submit = async () => {
    if (!selectedEmployee) return;

    setSubmitting(true);
    setMessage(null);

    try {
      console.log("Selected Employee:", selectedEmployee);
      await api.post("/leave/request", {
        EmployeeID: selectedEmployee.EmployeeID,
        startDate,
        endDate,
        reason,
        month: startDate.slice(0, 7),
        dailyBreakdown: dateSelections,
      });

      setMessage("Leave applied. Pending HR approval.");

      setSelectedEmployee(null);
      setSearchQuery("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setDateSelections([]);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.error || "Failed to apply leave"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    selectedEmployee &&
    startDate &&
    endDate &&
    reason.trim() &&
    totalDays > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Apply Leave (On Behalf of Employee)
      </h1>

      {/* Employee Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingEmployees ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.EmployeeID}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${selectedEmployee?.EmployeeID === emp.EmployeeID
                      ? "bg-emerald-50"
                      : ""
                    }`}
                >
                  <div className="font-medium">{highlightText(emp.name, searchQuery)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {highlightText(emp.employeeCode || emp.EmployeeID, searchQuery)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedEmployee && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              Selected: {selectedEmployee.name}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Leave Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Leave Details
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {dateSelections.length > 0 && (
            <div className="bg-gray-50 p-4 rounded border space-y-3">
              {dateSelections.map((d, index) => (
                <div
                  key={d.date}
                  className="flex justify-between items-center text-sm"
                >
                  <span>{d.date}</span>
                  <select
                    value={d.type}
                    onChange={(e) => {
                      const updated = [...dateSelections];
                      updated[index].type =
                        e.target.value as DayType;
                      setDateSelections(updated);
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="FULL">Full Day</option>
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                  </select>
                </div>
              ))}

              <div className="pt-3 border-t text-emerald-700 font-medium text-sm">
                Total Leave Days: {totalDays}
              </div>
            </div>
          )}

          <Textarea
            placeholder="Reason (mandatory)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button
        onClick={submit}
        disabled={!isValid || submitting}
        className="w-full bg-emerald-700 hover:bg-emerald-800"
      >
        {submitting ? "Submitting…" : "Apply Leave"}
      </Button>

      {message && (
        <p className="text-sm text-emerald-700">{message}</p>
      )}
    </div>
  );
}