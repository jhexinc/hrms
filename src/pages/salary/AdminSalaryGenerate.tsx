import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { getCurrentMonth } from "@/utils/dateHelpers";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, X, RefreshCw } from "lucide-react";

export default function AdminSalaryGenerate() {
  const [month, setMonth] = useState(getCurrentMonth());

  // 🔑 employee resolution
  const [employees, setEmployees] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  /* ===========================
     LOAD EMPLOYEES (ONCE)
  =========================== */
  useEffect(() => {
    api
      .get("/admin/employees")
      .then((res) => setEmployees(res.data || []))
      .catch(() => setEmployees([]));
  }, []);

  /* ===========================
     FILTER BY NAME OR CODE
  =========================== */
  const suggestions =
    query.length >= 2
      ? employees.filter((e) => {
        if (e.isActive === false) return false;
        const lowerQuery = query.toLowerCase();
        return (
          e.employeeCode?.toLowerCase().includes(lowerQuery) ||
          e.name?.toLowerCase().includes(lowerQuery)
        );
      })
      : [];

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
        <mark className="bg-primary/20 text-primary font-semibold p-0 rounded">
          {match}
        </mark>
        {after}
      </>
    );
  };

  /* ===========================
     GENERATE SALARY
  =========================== */
  async function handleGenerate() {
    if (!month) {
      setMessage({
        type: "error",
        text: "Please select a month",
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one employee",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post("/salary/generate", {
        employeeIDs: selectedEmployees.map(e => e.EmployeeID),
        month,
      });

      setMessage({
        type: "success",
        text: `Salary generated for ${selectedEmployees.length} employee(s)`
      });

    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error || "Salary generation failed",
      });
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="space-y-8 pb-10 max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 uppercase italic">
          Generate Salary
        </h1>
        <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Process monthly payroll for selected team members
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Month Selection */}
        <Card className="shadow-sm border-border overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-card-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Payroll Period
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Select Month & Year
              </label>
              <Input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setMessage(null);
                }}
                className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card className="shadow-sm border-border overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-card-foreground">
              <RefreshCw className="h-4 w-4 text-primary" />
              Employee Selection
            </CardTitle>
            {selectedEmployees.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmployees([])}
                className="h-7 px-3 text-[10px] font-black uppercase tracking-tighter text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Reset Selection
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Employee Finder
              </label>
              <Input
                placeholder="Search by name or employee code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
              />

              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((e) => (
                    <div
                      key={e.EmployeeID}
                      className="cursor-pointer px-4 py-3 hover:bg-muted border-b border-border/50 last:border-0 transition-colors"
                      onClick={() => {
                        if (!selectedEmployees.find(emp => emp.EmployeeID === e.EmployeeID)) {
                          setSelectedEmployees([...selectedEmployees, e]);
                        }
                        setQuery("");
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-foreground">
                          {highlightText(e.name, query)}
                        </span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                          {highlightText(e.employeeCode, query)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedEmployees.length > 0 ? (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Selected Staff ({selectedEmployees.length})
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedEmployees.map((e) => (
                    <div
                      key={e.EmployeeID}
                      className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 pl-3 pr-2 py-1.5 rounded-full animate-in zoom-in-95 duration-200"
                    >
                      <span className="text-xs font-black uppercase tracking-tight">
                        {e.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-primary/20 text-primary"
                        onClick={() =>
                          setSelectedEmployees(
                            selectedEmployees.filter(
                              (emp) => emp.EmployeeID !== e.EmployeeID
                            )
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No employees selected</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Search and select staff to process their payroll</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Section */}
      <div className="space-y-4 pt-4">
        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              : message.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                : "bg-blue-500/10 border-blue-500/20 text-blue-600"
            }`}>
            <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest line-clamp-1">{message.text}</p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-14 shadow-xl font-black uppercase tracking-[0.2em] text-sm group transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Processing Payroll...
            </div>
          ) : (
            <>
              <Calendar className="mr-3 h-5 w-5 group-hover:animate-bounce" />
              Generate Salary Slips
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
