import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getCurrentMonth } from "@/utils/dateHelpers";

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
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Eye, RefreshCw, Search, X, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminLeaveRequests() {
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

  const load = async (params: Record<string, any> | null = null) => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await api.get("/leave/admin/history", {
        params: params || {},
      });
      const leavesData = res.data || [];

      // Sort leaves based on hierarchical order
      const sortedLeaves = sortLeavesByStatusHierarchy(leavesData);
      setLeaves(sortedLeaves);
    } catch (e) {
      console.error("Failed to load admin leave history", e);
      setLeaves([]);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  /* ===========================
     SORT LEAVES BY STATUS HIERARCHY
  =========================== */
  const sortLeavesByStatusHierarchy = (leavesData: any[]) => {
    const statusPriority: Record<string, number> = {
      PENDING_HR: 3,
      PENDING_TL: 2,
      APPROVED: 1,
      REJECTED: 0,
      REJECTED_TL: 0,
    };

    return [...leavesData].sort((a, b) => {
      const priorityA = statusPriority[a.status] || 0;
      const priorityB = statusPriority[b.status] || 0;
      return priorityB - priorityA;
    });
  };

  /* ===========================
     FILTERED LEAVES
  =========================== */
  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      // Filter by status
      if (statusFilter !== "ALL" && leave.status !== statusFilter) {
        return false;
      }

      // Filter by month (if provided)
      if (monthFilter) {
        const leaveMonth = (leave.Month || leave.month || "").toString();
        if (!leaveMonth || !leaveMonth.startsWith(monthFilter)) {
          return false;
        }
      }

      // Filter by date range (if provided) - include leaves that overlap the selected range
      if (startDateFilter || endDateFilter) {
        const filterStart = startDateFilter ? new Date(startDateFilter) : null;
        const filterEnd = endDateFilter ? new Date(endDateFilter) : null;

        const leaveStart = leave.startDate ? new Date(leave.startDate) : null;
        const leaveEnd = leave.endDate ? new Date(leave.endDate) : null;

        // If we don't have leave start/end, exclude from range-filtered results
        if (!leaveStart || !leaveEnd) return false;

        if (filterStart && filterEnd) {
          // overlap check
          if (leaveEnd < filterStart || leaveStart > filterEnd) return false;
        } else if (filterStart) {
          if (leaveEnd < filterStart) return false;
        } else if (filterEnd) {
          if (leaveStart > filterEnd) return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const employeeName = (
          leave.employeeName ||
          leave.EmployeeName ||
          ""
        ).toLowerCase();
        const employeeCode = (
          leave.employeeCode ||
          leave.EmployeeCode ||
          leave.EmployeeID ||
          ""
        ).toLowerCase();

        return employeeName.includes(query) || employeeCode.includes(query);
      }

      return true;
    });
  }, [
    leaves,
    searchQuery,
    statusFilter,
    monthFilter,
    startDateFilter,
    endDateFilter,
  ]);

  /* ===========================
     STATUS BADGE
  =========================== */
  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Approved
          </Badge>
        );
      case "REJECTED":
      case "REJECTED_TL":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Rejected
          </Badge>
        );
      case "PENDING_HR":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Pending HR
          </Badge>
        );
      case "PENDING_TL":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending TL
          </Badge>
        );
      default:
        return null;
    }
  };

  /* ===========================
     DATE RANGE
  =========================== */
  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    const date = parseLocalDate(d);
    if (isNaN(date.getTime())) return d;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateRange = (l: any) => {
    if (l.startDate && l.endDate) {
      return `${formatDate(l.startDate)} → ${formatDate(l.endDate)}`;
    }
    return l.Month || "—";
  };

  const handleLeaveClick = (leaveId: string) => {
    navigate(`/admin/leave/${leaveId}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setMonthFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== "ALL" ||
    monthFilter ||
    startDateFilter ||
    endDateFilter,
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 uppercase italic">
            Leave Requests
          </h1>
          <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Central control for employee absence and leave dossiers
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-10 px-4 shadow-sm font-black uppercase tracking-widest text-[10px] transform transition-all active:scale-95 border-primary/20 hover:bg-primary/5"
          onClick={() => load()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Syncing..." : "Sync Records"}
        </Button>
      </div>

      {/* Search and Filter Section */}
      <Card className="shadow-sm border-border overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
          <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Filter Database
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block">
                Employee Finder
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  placeholder="Query by staff name or unique identifier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 text-foreground">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Target Month
                </label>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="h-11 border-border font-bold bg-background"
                />
              </div>

              <div className="space-y-2 text-foreground">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Range Start
                </label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-11 border-border font-bold bg-background"
                />
              </div>

              <div className="space-y-2 text-foreground">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Range End
                </label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-11 border-border font-bold bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Status Category
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-border font-bold bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-foreground">
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="PENDING_HR">Pending HR</SelectItem>
                    <SelectItem value="PENDING_TL">Pending TL</SelectItem>
                    <SelectItem value="APPROVED">Approved Records</SelectItem>
                    <SelectItem value="REJECTED">Rejected Records</SelectItem>
                    <SelectItem value="REJECTED_TL">Rejected (TL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3 order-2 sm:order-1">
                <span className="text-xs font-bold text-muted-foreground italic">
                  Showing <span className="text-foreground font-black">{filteredLeaves.length}</span> individual requests
                </span>
                {hasActiveFilters && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest px-2 py-0.5">
                    Filtered
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearFilters();
                      load();
                    }}
                    className="h-11 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    Reset All
                  </Button>
                )}
                <Button
                  className="flex-1 sm:flex-none h-11 px-8 shadow-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    const params: Record<string, any> = {};
                    if (monthFilter) params.month = monthFilter;
                    if (startDateFilter) params.startDate = startDateFilter;
                    if (endDateFilter) params.endDate = endDateFilter;
                    if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
                    load(params);
                  }}
                >
                  Retrieve Records
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-6">
        {/* Desktop Table View */}
        <Card className="hidden lg:block border-border shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Administrative Review Portal
            </CardTitle>
            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-background border-border">
              {filteredLeaves.length} Dossiers
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="w-[20%] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Identified Staff</TableHead>
                    <TableHead className="w-[18%] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Leave Duration</TableHead>
                    <TableHead className="w-[8%] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Quantum</TableHead>
                    <TableHead className="w-[15%] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Allocation (C/S/L)</TableHead>
                    <TableHead className="w-[18%] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Specified Reason</TableHead>
                    <TableHead className="w-[12%] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Status</TableHead>
                    <TableHead className="w-[9%] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-b border-border/30">
                        <TableCell colSpan={7} className="py-6 px-6">
                          <div className="flex items-center space-x-6">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-64 rounded-full" />
                              <Skeleton className="h-3 w-32 rounded-full" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-lg" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredLeaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <ClipboardCheck className="h-12 w-12 mb-4 text-muted-foreground" />
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {leaves.length === 0 ? "No records found in system" : "No matching dossiers"}
                          </p>
                          <p className="text-[10px] font-medium mt-1">Adjust your filters to scan a different set of records</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeaves.map((l) => (
                      <TableRow key={l.LeaveID} className="group border-b border-border/50 hover:bg-muted/30 transition-colors text-foreground">
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-black group-hover:text-primary transition-colors italic uppercase leading-none mb-1 text-sm tracking-tight text-foreground">
                              {l.EmployeeName || l.employeeName || "—"}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                              ID: {l.employeeCode || l.EmployeeCode || l.EmployeeID}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-[11px] font-black uppercase tracking-tight text-foreground/70">
                            {formatDateRange(l)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 font-black text-primary text-[10px] uppercase">
                            {l.totalDays ?? l.requestedDays ?? "—"} Days
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-1.5">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-muted-foreground/60 mb-0.5 uppercase">C</span>
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none font-black text-[11px] px-2 h-5 min-w-6 justify-center">{l.breakup?.CPL || 0}</Badge>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-muted-foreground/60 mb-0.5 uppercase">S</span>
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-none font-black text-[11px] px-2 h-5 min-w-6 justify-center">{l.breakup?.SL || 0}</Badge>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-muted-foreground/60 mb-0.5 uppercase">L</span>
                              <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-none font-black text-[11px] px-2 h-5 min-w-6 justify-center">{l.breakup?.LOP || l.lopDays || 0}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col space-y-2">
                            <p className="line-clamp-2 text-xs text-muted-foreground italic font-medium max-w-[150px]" title={l.reason}>
                              "{l.reason || "—"}"
                            </p>

                            {(l.hrComment || l.tlComment) && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded w-fit transition-colors shadow-sm">
                                    <MessageSquare className="h-3 w-3" />
                                    Read Feedback
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md border-border bg-card">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-foreground">
                                      <MessageSquare className="h-5 w-5 text-primary" />
                                      Leave Feedback
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    {l.tlComment && (
                                      <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                          </div>
                                          <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team Lead</p>
                                        </div>
                                        <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
                                          "{l.tlComment}"
                                        </p>
                                      </div>
                                    )}
                                    {l.hrComment && (
                                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <User className="h-3.5 w-3.5 text-primary" />
                                          </div>
                                          <p className="text-sm font-black text-primary uppercase tracking-widest">HR Admin</p>
                                        </div>
                                        <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                                          "{l.hrComment}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          {statusBadge(l.status)}
                        </TableCell>
                        <TableCell className="text-right py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleLeaveClick(l.LeaveID)}
                              className="h-9 w-9 p-0 rounded-lg border-primary/20 text-primary hover:bg-primary/10 hover:border-primary transition-all active:scale-90"
                              title="Audit Dossier"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 p-0 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all active:scale-90"
                              onClick={() => {
                                if (window.confirm("FATAL: Unauthorized deletion will result in permanent record loss. Confirm destruction?")) {
                                  api.delete("/leave/delete", { data: { LeaveID: l.LeaveID } })
                                    .then(() => setLeaves(prev => prev.filter(x => x.LeaveID !== l.LeaveID)))
                                    .catch(() => alert("System failure during deletion protocol"));
                                }
                              }}
                              title="Delete Record"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tablet/Mobile Grid/Card View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))
          ) : filteredLeaves.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10 opacity-60">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">No records match parameters</p>
            </div>
          ) : (
            filteredLeaves.map((l) => (
              <Card key={l.LeaveID} className="overflow-hidden border-border shadow-sm bg-card group hover:shadow-lg transition-all duration-300">
                <div
                  className="h-1.5 w-full bg-border"
                  style={{
                    backgroundColor: l.status === 'APPROVED' ? 'rgb(16 185 129)' :
                      l.status.startsWith('PENDING') ? 'rgb(245 158 11)' :
                        'rgb(239 68 68)'
                  }}
                />
                <CardContent className="p-5 space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-black text-foreground italic uppercase leading-none mb-1 text-sm tracking-tight truncate">
                        {l.EmployeeName || l.employeeName || "—"}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                        {l.employeeCode || l.EmployeeCode || l.EmployeeID}
                      </div>
                    </div>
                    {statusBadge(l.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/50">
                      <div className="text-[9px] font-black text-muted-foreground mb-1.5 uppercase tracking-widest leading-none">Date Range</div>
                      <div className="text-[10px] font-bold text-foreground leading-tight italic">{formatDateRange(l)}</div>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-center flex flex-col justify-center">
                      <div className="text-[9px] font-black text-primary/60 mb-1.5 uppercase tracking-widest leading-none">Total Days</div>
                      <div className="text-sm font-black text-primary leading-none uppercase tracking-tighter">
                        {l.totalDays ?? l.requestedDays ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-muted/30 rounded-xl italic text-[11px] text-muted-foreground border-l-4 border-primary font-medium">
                      "{l.reason || "No specified reason in records"}"
                    </div>

                    {(l.hrComment || l.tlComment) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md w-full justify-center transition-colors shadow-sm">
                            <MessageSquare className="h-3 w-3" />
                            Read Feedback Notes
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md border-border bg-card">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-foreground">
                              <MessageSquare className="h-5 w-5 text-primary" />
                              Leave Feedback
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            {l.tlComment && (
                              <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team Lead</p>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
                                  "{l.tlComment}"
                                </p>
                              </div>
                            )}
                            {l.hrComment && (
                              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <p className="text-sm font-black text-primary uppercase tracking-widest">HR Admin</p>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                                  "{l.hrComment}"
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1 mt-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 shadow-sm font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95"
                      onClick={() => handleLeaveClick(l.LeaveID)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" /> Audit Dossier
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive transition-all active:scale-90"
                      onClick={() => {
                        if (window.confirm("Confirm destructor protocol?")) {
                          api.delete("/leave/delete", { data: { LeaveID: l.LeaveID } })
                            .then(() => setLeaves(prev => prev.filter(x => x.LeaveID !== l.LeaveID)))
                            .catch(() => alert("Destruction sequence failed"));
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

