import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentMonth } from "@/utils/dateHelpers";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardCheck, Eye, RefreshCw, Search, X, MessageSquare, User } from "lucide-react";

export default function TeamLeadLeaveRequests() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async (params: Record<string, any> | null = null) => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      // Using /leave/admin/history as it likely returns team data for TLs (as seen in Review page)
      const res = await api.get("/leave/admin/history", {
        params: params || {},
      });
      const leavesData = res.data || [];

      // Sort: Pending first
      const sorted = sortLeavesByStatusHierarchy(leavesData);
      setLeaves(sorted);
    } catch (e) {
      console.error("Failed to load team leave history", e);
      setLeaves([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const sortLeavesByStatusHierarchy = (leavesData: any[]) => {
    const statusPriority: Record<string, number> = {
      "PENDING_TL": 3,
      "PENDING_HR": 2,
      "APPROVED": 1,
      "REJECTED": 0,
      "REJECTED_TL": 0,
    };

    return [...leavesData].sort((a, b) => {
      const priorityA = statusPriority[a.status] || 0;
      const priorityB = statusPriority[b.status] || 0;
      return priorityB - priorityA;
    });
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && leave.status !== statusFilter) return false;

      // 2. Month Filter
      if (monthFilter) {
        const leaveMonth = (leave.Month || leave.month || "").toString();
        if (!leaveMonth || !leaveMonth.startsWith(monthFilter)) return false;
      }

      // 3. Date Range
      if (startDateFilter || endDateFilter) {
        const filterStart = startDateFilter ? new Date(startDateFilter) : null;
        const filterEnd = endDateFilter ? new Date(endDateFilter) : null;
        const leaveStart = leave.startDate ? new Date(leave.startDate) : null;
        const leaveEnd = leave.endDate ? new Date(leave.endDate) : null;

        if (!leaveStart || !leaveEnd) return false;

        if (filterStart && filterEnd) {
          if (leaveEnd < filterStart || leaveStart > filterEnd) return false;
        } else if (filterStart) {
          if (leaveEnd < filterStart) return false;
        } else if (filterEnd) {
          if (leaveStart > filterEnd) return false;
        }
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const employeeName = (leave.employeeName || leave.EmployeeName || "").toLowerCase();
        const employeeCode = (leave.employeeCode || leave.EmployeeCode || leave.EmployeeID || "").toLowerCase();
        return employeeName.includes(query) || employeeCode.includes(query);
      }

      return true;
    });
  }, [leaves, searchQuery, statusFilter, monthFilter, startDateFilter, endDateFilter]);

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
    endDateFilter
  );

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = parseLocalDate(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateRange = (leave: any) => {
    if (leave.startDate && leave.endDate) {
      return `${formatDate(leave.startDate)} → ${formatDate(leave.endDate)}`;
    }
    return leave.Month || "—";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Approved
          </Badge>
        );
      case "REJECTED":
      case "REJECTED_TL":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      case "PENDING_HR":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Pending HR
          </Badge>
        );
      case "PENDING_TL":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending Approval
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  // const hasActiveSearch = searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Team Leave Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review history and take action on your team's leave requests
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="bg-background hover:bg-muted text-foreground border-border transition-all flex items-center gap-2"
          onClick={() => load()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-border shadow-sm bg-card">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 border-border focus-visible:ring-primary bg-muted/50"
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

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Month Filter
                </label>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full h-10 border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Range Start
                </label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full h-10 border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Range End
                </label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full h-10 border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Status Category
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-10 border-border bg-background">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING_TL">Pending Approval</SelectItem>
                    <SelectItem value="PENDING_HR">Pending HR</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="REJECTED_TL">Rejected by You</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground order-2 sm:order-1 flex items-center gap-2">
                <span>Displaying <b className="text-foreground">{filteredLeaves.length}</b> requests</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-2 py-0">
                    Filtered
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  className="flex-1 sm:flex-none shadow-md h-10 px-6 transition-all active:scale-95"
                  onClick={() => {
                    const params: Record<string, any> = {};
                    if (monthFilter) params.month = monthFilter;
                    if (startDateFilter) params.startDate = startDateFilter;
                    if (endDateFilter) params.endDate = endDateFilter;
                    if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
                    load(params);
                  }}
                >
                  Apply Filters
                </Button>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearFilters();
                      load();
                    }}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Team Request Management
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold text-foreground h-12">Employee</TableHead>
                  <TableHead className="font-bold text-foreground h-12">Date Range</TableHead>
                  <TableHead className="font-bold text-foreground h-12 text-center">Days</TableHead>
                  <TableHead className="font-bold text-foreground h-12 text-center">Balance (C/S)</TableHead>
                  <TableHead className="font-bold text-foreground h-12">Reason & Feedback</TableHead>
                  <TableHead className="font-bold text-foreground h-12 text-center">Status</TableHead>
                  <TableHead className="font-bold text-foreground h-12 text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={6} className="py-4">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[40%]" />
                            <Skeleton className="h-3 w-[20%]" />
                          </div>
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}

                {!loading && filteredLeaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-muted-foreground italic">
                      {leaves.length === 0 ? "No team leave requests found." : "No matching requests."}
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  filteredLeaves.map((leave) => (
                    <TableRow key={leave.LeaveID} className="group hover:bg-muted/50 transition-colors border-border text-foreground">
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {leave.employeeName || leave.EmployeeName || "—"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                          {leave.employeeCode || leave.EmployeeCode || leave.EmployeeID || "—"}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium">
                        {formatDateRange(leave)}
                      </TableCell>

                      <TableCell className="font-bold text-center">
                        {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-2 py-0.5">
                            C: {leave.employeeLeaveBalance?.CPL ?? leave.leaveBalance?.CPL ?? "—"}
                          </Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-2 py-0.5">
                            S: {leave.employeeLeaveBalance?.SL ?? leave.leaveBalance?.SL ?? "—"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col space-y-2">
                          <p className="line-clamp-2 text-xs text-muted-foreground italic font-medium max-w-[150px]" title={leave.reason}>
                            "{leave.reason || "—"}"
                          </p>

                          {(leave.hrComment || leave.tlComment) && (
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
                                  {leave.tlComment && (
                                    <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                          <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team Lead</p>
                                      </div>
                                      <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
                                        "{leave.tlComment}"
                                      </p>
                                    </div>
                                  )}
                                  {leave.hrComment && (
                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                          <User className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <p className="text-sm font-black text-primary uppercase tracking-widest">HR Admin</p>
                                      </div>
                                      <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                                        "{leave.hrComment}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {statusBadge(leave.status)}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/tl/leave/${leave.LeaveID}`)}
                          className="flex items-center gap-1 ml-auto text-primary border-primary/20 hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          {leave.status === "PENDING_TL" ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}