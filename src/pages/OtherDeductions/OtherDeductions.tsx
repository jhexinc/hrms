import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentMonth } from "@/utils/dateHelpers";
import { Skeleton } from "@/components/ui/skeleton";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Calendar,
  PlusCircle,
  Search,
  Plus,
  Clock,
  Save,
  User,
  X,
  FileCheck
} from "lucide-react";

/* ===========================
   TYPES
=========================== */

type Employee = {
  EmployeeID: string;
  name: string;
  department: string;
  employeeCode?: string;
  EmployeeCode?: string;
  isActive?: boolean;
};

type DeductionRow = {
  type: string;
  amount: number;
};

type Entry = {
  employeeID: string;
  employeeName: string;
  deductions: DeductionRow[];
};

export default function OtherDeductions() {
  const [month, setMonth] = useState(getCurrentMonth());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existing, setExisting] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [deductionType, setDeductionType] = useState("");
  const [deductionAmount, setDeductionAmount] = useState<number | "">("");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchSaved, setSearchSaved] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editRows, setEditRows] = useState<DeductionRow[]>([]);
  const [editingSaving, setEditingSaving] = useState(false);

  /* ===========================
     LOAD EMPLOYEES (ONCE)
  =========================== */

  useEffect(() => {
    api.get("/admin/employees").then((res) => {
      setEmployees(res.data || []);
    });
  }, []);

  /* ===========================
     LOAD EXISTING DEDUCTIONS
  =========================== */

  useEffect(() => {
    if (!month) {
      setExisting([]);
      return;
    }

    setLoadingExisting(true);
    api.get("/performance/deductions", { params: { month } })
      .then((res) => {
        setExisting(res.data || []);
      })
      .finally(() => {
        setLoadingExisting(false);
      });
  }, [month]);

  /* ===========================
     DERIVED DATA
  =========================== */

  const alreadySavedIds = useMemo(
    () => new Set(existing.map((e) => e.EmployeeID)),
    [existing],
  );

  const filteredEmployees = useMemo(() => {
    if (!search) return [];

    const lower = search.toLowerCase();

    return employees.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const code = (
        e.employeeCode ||
        e.EmployeeCode ||
        e.EmployeeID ||
        ""
      ).toLowerCase();

      return (
        (name.includes(lower) || code.includes(lower)) &&
        e.isActive !== false &&
        !entries.some((en) => en.employeeID === e.EmployeeID) &&
        !alreadySavedIds.has(e.EmployeeID)
      );
    });
  }, [search, employees, entries, alreadySavedIds]);

  const filteredExisting = useMemo(() => {
    if (!searchSaved) return existing;

    const lower = searchSaved.toLowerCase();

    return existing.filter((e) => {
      const emp = employees.find((emp) => emp.EmployeeID === e.EmployeeID);
      const name = (emp?.name || "").toLowerCase();
      const code = (
        emp?.employeeCode ||
        emp?.EmployeeCode ||
        e.EmployeeID ||
        ""
      ).toLowerCase();
      const amt = String(e.TotalDeduction || "");

      return (
        name.includes(lower) || code.includes(lower) || amt.includes(lower)
      );
    });
  }, [existing, searchSaved, employees]);

  /* ===========================
     ADD DEDUCTION ROW
  =========================== */

  const addDeductionRow = () => {
    if (!selectedEmployee || !deductionType || deductionAmount === "") return;

    setEntries((prev) => {
      const existingEntry = prev.find(
        (e) => e.employeeID === selectedEmployee.EmployeeID,
      );

      if (existingEntry) {
        return prev.map((e) =>
          e.employeeID === selectedEmployee.EmployeeID
            ? {
              ...e,
              deductions: [
                ...e.deductions,
                {
                  type: deductionType,
                  amount: Number(deductionAmount),
                },
              ],
            }
            : e,
        );
      }

      return [
        ...prev,
        {
          employeeID: selectedEmployee.EmployeeID,
          employeeName: selectedEmployee.name,
          deductions: [
            {
              type: deductionType,
              amount: Number(deductionAmount),
            },
          ],
        },
      ];
    });

    setDeductionType("");
    setDeductionAmount("");
  };

  const removeEmployeeEntry = (employeeID: string) => {
    setEntries((prev) => prev.filter((e) => e.employeeID !== employeeID));
  };

  const removeDeductionRow = (employeeID: string, index: number) => {
    setEntries((prev) =>
      prev
        .map((e) =>
          e.employeeID === employeeID
            ? {
              ...e,
              deductions: e.deductions.filter((_, i) => i !== index),
            }
            : e,
        )
        .filter((e) => e.deductions.length > 0),
    );
  };

  /* ===========================
     SAVE ALL
  =========================== */

  const saveAll = async () => {
    if (!month || entries.length === 0) return;

    setSaving(true);
    try {
      for (const e of entries) {
        await api.post("/performance/deductions", {
          employeeID: e.employeeID,
          month,
          deductions: e.deductions,
        });
      }

      setEntries([]);
      const res = await api.get("/performance/deductions", {
        params: { month },
      });
      setExisting(res.data || []);
    } finally {
      setSaving(false);
    }
  };

  // Highlight search matches
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

  return (
    <div className="space-y-8 pb-10">
      {/* ===== Header ===== */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 uppercase italic">
          Other Deductions
        </h1>
        <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          Manage miscellaneous payroll deductions for staff
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left - Configuration & Selection */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Deduction Period
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Select Month
                </label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                Add New Record
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Staff Member
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search by name or ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedEmployee(null);
                      setShowDropdown(true);
                    }}
                    disabled={!month}
                    className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                </div>

                {showDropdown && filteredEmployees.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredEmployees.slice(0, 5).map((e) => (
                      <div
                        key={e.EmployeeID}
                        className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b border-border/50 last:border-0"
                        onClick={() => {
                          setSelectedEmployee(e);
                          setSearch(`${e.name}`);
                          setShowDropdown(false);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-foreground">{highlightText(e.name, search)}</div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                            {highlightText(e.employeeCode || e.EmployeeCode || e.EmployeeID, search)}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {e.department}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Deduction Type</label>
                  <Input
                    placeholder="e.g. Loan Repayment, Damage..."
                    className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
                    value={deductionType}
                    onChange={(e) => setDeductionType(e.target.value)}
                    disabled={!selectedEmployee}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">₹</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm pl-8"
                      value={deductionAmount}
                      onChange={(e) =>
                        setDeductionAmount(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      disabled={!selectedEmployee}
                    />
                  </div>
                </div>

                <Button
                  onClick={addDeductionRow}
                  disabled={!selectedEmployee || !deductionType || deductionAmount === ""}
                  className="w-full h-12 shadow-lg font-black uppercase tracking-widest text-xs transition-all active:scale-95 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Pending & Existing */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Entries */}
          <Card className="shadow-sm border-border overflow-hidden bg-card border-l-4 border-l-primary/30">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Pending Queue ({entries.length})
              </CardTitle>
              {entries.length > 0 && (
                <Button
                  onClick={saveAll}
                  disabled={saving}
                  size="sm"
                  className="h-7 px-4 shadow-md font-black uppercase tracking-tighter text-[10px] bg-primary hover:bg-primary/90"
                >
                  <Save className="mr-1.5 h-3 w-3" />
                  {saving ? "Deploying..." : "Save All Dossiers"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Queue is currently empty</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {entries.map((e) => (
                    <div key={e.employeeID} className="p-4 bg-muted/10 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary/40" />
                          <span className="font-black text-sm uppercase italic tracking-tight">{e.employeeName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10"
                          onClick={() => removeEmployeeEntry(e.employeeID)}
                        >
                          Remove Staff
                        </Button>
                      </div>

                      <div className="overflow-hidden border border-border/50 rounded-lg bg-background">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                              <th className="p-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</th>
                              <th className="p-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</th>
                              <th className="p-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {e.deductions.map((d, i) => (
                              <tr key={i} className="border-b border-border/30 last:border-0">
                                <td className="p-3 text-sm font-bold text-foreground/80">{d.type}</td>
                                <td className="p-3 text-sm font-black text-primary">₹{d.amount.toLocaleString("en-IN")}</td>
                                <td className="p-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeDeductionRow(e.employeeID, i)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Deductions */}
          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Deduction Dossiers {month && `(${month})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative max-w-sm">
                <Input
                  placeholder="Search saved dossiers..."
                  value={searchSaved}
                  onChange={(e) => setSearchSaved(e.target.value)}
                  className="h-10 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm pl-10"
                  disabled={!month}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              </div>

              {loadingExisting ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : existing.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">No Saved Dossiers</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-border/50 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border/50">
                      <tr>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</th>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Amount</th>
                        <th className="p-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExisting.map((e) => (
                        <tr key={e.EmployeeID} className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-black text-sm text-foreground uppercase italic group-hover:text-primary transition-colors">
                                {highlightText(
                                  employees.find((x) => x.EmployeeID === e.EmployeeID)
                                    ?.name || e.EmployeeID,
                                  searchSaved,
                                )}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">
                                {highlightText(
                                  employees.find((x) => x.EmployeeID === e.EmployeeID)
                                    ?.employeeCode ||
                                  employees.find((x) => x.EmployeeID === e.EmployeeID)
                                    ?.EmployeeCode ||
                                  e.EmployeeID,
                                  searchSaved,
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-sm">
                              {highlightText(
                                `₹${Number(e.TotalDeduction).toLocaleString("en-IN")}`,
                                searchSaved,
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 shadow-sm font-black uppercase tracking-tighter text-[10px] border-primary/20 text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingEntry(e);
                                setEditRows(e.Deductions || e.deductions || []);
                                setEditOpen(true);
                              }}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => setEditOpen(o)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Edit Deduction Dossier</DialogTitle>
              <DialogDescription className="text-xs font-medium italic">
                Update the specific deduction rows for this payroll period.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6 border-y border-border/50 my-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</span>
                <p className="text-sm font-bold uppercase italic">
                  {editingEntry
                    ? employees.find(
                      (x) => x.EmployeeID === editingEntry.EmployeeID,
                    )?.name || editingEntry.EmployeeID
                    : "-"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Month</span>
                <p className="text-sm font-bold">{editingEntry?.Month || editingEntry?.month || month || "-"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Specified Deductions</label>
              {editRows.map((r, i) => (
                <div key={i} className="flex gap-3 items-center bg-muted/20 p-2 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                  <Input
                    placeholder="Type"
                    className="flex-1 h-10 font-bold border-border"
                    value={r.type}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditRows((prev) =>
                        prev.map((row, idx) =>
                          idx === i ? { ...row, type: v } : row,
                        ),
                      );
                    }}
                  />

                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">₹</span>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="h-10 font-bold pl-7 border-border"
                      value={r.amount}
                      onChange={(e) => {
                        const v =
                          e.target.value === "" ? "" : Number(e.target.value);
                        setEditRows((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, amount: v as number } : row,
                          ),
                        );
                      }}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setEditRows((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary font-black uppercase tracking-widest text-[10px]"
                onClick={() =>
                  setEditRows((prev) => [...prev, { type: "", amount: 0 }])
                }
              >
                <Plus className="mr-2 h-3 w-3" />
                Add Deduction Line Item
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setEditOpen(false);
                setEditingEntry(null);
                setEditRows([]);
              }}
            >
              Cancel
            </Button>

            <Button
              className="shadow-lg font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
              onClick={async () => {
                if (!editingEntry) return;
                setEditingSaving(true);
                try {
                  await api.put("/performance/deductions", {
                    employeeID: editingEntry.EmployeeID,
                    month: editingEntry.Month || editingEntry.month || month,
                    deductions: editRows,
                  });

                  const res = await api.get("/performance/deductions", {
                    params: { month },
                  });
                  setExisting(res.data || []);

                  setEditOpen(false);
                  setEditingEntry(null);
                  setEditRows([]);
                } catch (err) {
                  console.error("Update failed", err);
                } finally {
                  setEditingSaving(false);
                }
              }}
              disabled={editingSaving}
            >
              {editingSaving ? "Processing..." : "Commit Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
