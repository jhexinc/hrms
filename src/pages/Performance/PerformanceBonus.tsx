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
  IndianRupee,
  Calendar,
  UserCircle,
  Search,
  PlusCircle,
  Clock,
  Save,
  XCircle,
  CheckCircle2
} from "lucide-react";

type Employee = {
  EmployeeID: string;
  name: string;
  department: string;
  employeeCode?: string;
  EmployeeCode?: string;
};

type BonusEntry = {
  employeeID: string;
  employeeName: string;
  bonusAmount: number;
};

export default function PerformanceBonus() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingBonuses, setExistingBonuses] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [amount, setAmount] = useState<number | "">("");

  const [entries, setEntries] = useState<BonusEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editingSaving, setEditingSaving] = useState(false);
  const [searchSaved, setSearchSaved] = useState("");

  /* ===========================
     LOAD EMPLOYEES (ONCE)
  =========================== */

  useEffect(() => {
    api.get("/admin/employees").then((res) => {
      setEmployees(res.data || []);
    });
  }, []);

  /* ===========================
     LOAD EXISTING BONUSES (MONTH)
  =========================== */

  useEffect(() => {
    if (!month) {
      setExistingBonuses([]);
      return;
    }

    setLoadingExisting(true);
    api.get("/performance/bonus", { params: { month } })
      .then((res) => {
        setExistingBonuses(res.data || []);
      })
      .finally(() => {
        setLoadingExisting(false);
      });
  }, [month]);

  /* ===========================
     DERIVED DATA
  =========================== */

  const alreadySavedIds = useMemo(
    () => new Set(existingBonuses.map((b) => b.EmployeeID)),
    [existingBonuses],
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
        !entries.some((en) => en.employeeID === e.EmployeeID) &&
        !alreadySavedIds.has(e.EmployeeID)
      );
    });
  }, [search, employees, entries, alreadySavedIds]);

  const filteredExistingBonuses = useMemo(() => {
    if (!searchSaved) return existingBonuses;

    const lower = searchSaved.toLowerCase();

    return existingBonuses.filter((b) => {
      const emp = employees.find((e) => e.EmployeeID === b.EmployeeID);
      const name = (emp?.name || "").toLowerCase();
      const code = (
        emp?.employeeCode ||
        emp?.EmployeeCode ||
        b.EmployeeID ||
        ""
      ).toLowerCase();
      const amt = String(b.BonusAmount || "");

      return (
        name.includes(lower) || code.includes(lower) || amt.includes(lower)
      );
    });
  }, [existingBonuses, searchSaved, employees]);

  /* ===========================
     ADD ENTRY
  =========================== */

  const addEntry = () => {
    if (!selectedEmployee || amount === "") return;

    setEntries((prev) => [
      ...prev,
      {
        employeeID: selectedEmployee.EmployeeID,
        employeeName: selectedEmployee.name,
        bonusAmount: Number(amount),
      },
    ]);

    setSelectedEmployee(null);
    setSearch("");
    setAmount("");
  };

  const removeEntry = (employeeID: string) => {
    setEntries((prev) => prev.filter((e) => e.employeeID !== employeeID));
  };

  /* ===========================
     SAVE ALL
  =========================== */

  const saveAll = async () => {
    if (!month || entries.length === 0) return;

    setSaving(true);
    try {
      for (const e of entries) {
        await api.post("/performance/bonus", {
          employeeID: e.employeeID,
          month,
          bonusAmount: e.bonusAmount,
        });
      }

      setEntries([]);
      const res = await api.get("/performance/bonus", {
        params: { month },
      });
      setExistingBonuses(res.data || []);
    } finally {
      setSaving(false);
    }
  };

  /* ===========================
     UI
  =========================== */

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
          Performance Bonus
        </h1>
        <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          Assign performance-based rewards to team members
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left - Configuration & Selection */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Bonus Period
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
                <UserCircle className="h-4 w-4 text-primary" />
                Add Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Employee
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search by name..."
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Bonus Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">₹</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm pl-8"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    disabled={!selectedEmployee}
                  />
                </div>
              </div>

              <Button
                onClick={addEntry}
                disabled={!selectedEmployee || amount === ""}
                className="w-full h-12 shadow-lg font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add to List
              </Button>
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
                  className="h-7 px-4 shadow-md font-black uppercase tracking-tighter text-[10px] bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="mr-1.5 h-3 w-3" />
                  {saving ? "Deploying..." : "Confirm All"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Queue Empty</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border/50">
                      <tr>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</th>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bonus Amount</th>
                        <th className="p-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.employeeID} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-sm italic uppercase">{e.employeeName}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-sm text-primary">₹{e.bonusAmount.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => removeEntry(e.employeeID)}
                            >
                              <XCircle className="h-4 w-4" />
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

          {/* Existing Records */}
          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                History Dossier {month && `(${month})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative max-w-sm">
                <Input
                  placeholder="Search saved records..."
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
              ) : filteredExistingBonuses.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">No Records Found</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-border/50 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border/50">
                      <tr>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</th>
                        <th className="p-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bonus</th>
                        <th className="p-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExistingBonuses.map((b) => (
                        <tr key={b.BonusID || b.EmployeeID} className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-black text-sm text-foreground uppercase italic group-hover:text-primary transition-colors">
                                {highlightText(
                                  employees.find((x) => x.EmployeeID === b.EmployeeID)
                                    ?.name || b.EmployeeID,
                                  searchSaved,
                                )}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">
                                {highlightText(
                                  employees.find((x) => x.EmployeeID === b.EmployeeID)
                                    ?.employeeCode ||
                                  employees.find((x) => x.EmployeeID === b.EmployeeID)
                                    ?.EmployeeCode ||
                                  b.EmployeeID,
                                  searchSaved,
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-sm">
                              {highlightText(
                                `₹${Number(b.BonusAmount).toLocaleString("en-IN")}`,
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
                                setEditingBonus(b);
                                setEditAmount(Number(b.BonusAmount) || "");
                                setEditOpen(true);
                              }}
                            >
                              Edit
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
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Edit Bonus Dossier</DialogTitle>
              <DialogDescription className="text-xs font-medium italic">
                Adjust the performance reward parameters for this employee.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6 border-y border-border/50 my-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee</span>
                <p className="text-sm font-bold uppercase italic">
                  {editingBonus
                    ? employees.find(
                      (x) => x.EmployeeID === editingBonus.EmployeeID,
                    )?.name || editingBonus.EmployeeID
                    : "-"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Month</span>
                <p className="text-sm font-bold">{editingBonus?.Month || "-"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Update Bonus Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">₹</span>
                <Input
                  type="number"
                  className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-black bg-background shadow-sm pl-8"
                  value={editAmount}
                  onChange={(e) =>
                    setEditAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setEditOpen(false);
                setEditingBonus(null);
                setEditAmount("");
              }}
            >
              Discard Changes
            </Button>

            <Button
              className="shadow-lg font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90"
              onClick={async () => {
                if (!editingBonus) return;
                setEditingSaving(true);
                try {
                  await api.put("/performance/bonus", {
                    bonusID: editingBonus.BonusID,
                    bonusAmount: Number(editAmount),
                  });

                  const res = await api.get("/performance/bonus", {
                    params: { month },
                  });
                  setExistingBonuses(res.data || []);

                  setEditOpen(false);
                  setEditingBonus(null);
                  setEditAmount("");
                } catch (err) {
                  console.error("Update failed", err);
                } finally {
                  setEditingSaving(false);
                }
              }}
              disabled={editingSaving || editAmount === ""}
            >
              {editingSaving ? "Processing..." : "Commit Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
