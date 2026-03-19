import { useEffect, useState } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  User,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


/* ---------------- Main Component ---------------- */

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await api.get("/leave/me/history");
      setLeaves(res.data || []);
    } catch (e) {
      console.error("Failed to load leave history", e);
      setLeaves([]);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDateRange = (l: any) => {
    if (l.startDate && l.endDate) {
      const start = formatDate(l.startDate);
      const end = formatDate(l.endDate);
      return `${start} – ${end}`;
    }
    return l.Month || "—";
  };

  const sortedLeaves = [...leaves].sort((a, b) => {
    return (
      new Date(b.startDate || b.createdAt || 0).getTime() -
      new Date(a.startDate || a.createdAt || 0).getTime()
    );
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 py-1">
            My Leave History
          </h1>
          <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Track the status of all your leave requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="w-fit h-9 px-4 border-border bg-background text-xs font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
            {sortedLeaves.length} Total Requests
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 shadow-sm font-black uppercase tracking-widest text-[10px] transform transition-all active:scale-95 border-primary/20 hover:bg-primary/5"
            onClick={() => loadHistory()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SummaryStatCard
          label="Total Leaves"
          value={sortedLeaves.length}
          icon={<Calendar className="h-5 w-5" />}
          color="slate"
        />
        <SummaryStatCard
          label="Approved"
          value={sortedLeaves.filter((l) => l.status === "APPROVED").length}
          icon={<CheckCircle className="h-5 w-5" />}
          color="emerald"
        />
        <SummaryStatCard
          label="Pending"
          value={sortedLeaves.filter((l) => ["PENDING_HR", "PENDING_TL"].includes(l.status)).length}
          icon={<Clock className="h-5 w-5" />}
          color="blue"
        />
        <SummaryStatCard
          label="Rejected"
          value={sortedLeaves.filter((l) => ["REJECTED", "REJECTED_TL"].includes(l.status)).length}
          icon={<XCircle className="h-5 w-5" />}
          color="rose"
        />
      </div>

      {/* Table */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-5 px-6">
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-card-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Leave Records
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-48 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Date Range</TableHead>
                  <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Days</TableHead>
                  <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Allocation</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Reason</TableHead>
                  <TableHead className="w-40 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="px-6 py-6"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell className="px-6"><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell className="px-6"><Skeleton className="h-8 w-24 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black uppercase tracking-widest">No Records Found</p>
                          <p className="text-xs font-medium">Your request history will materialize here once submitted.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLeaves.map((l) => {
                    const breakup = l.breakup || {};
                    const totalDays = l.totalDays ?? l.requestedDays ?? 0;

                    return (
                      <TableRow key={l.LeaveID} className="group hover:bg-muted/30 border-border transition-colors">
                        <TableCell className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-sm text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                              {formatDateRange(l)}
                            </span>
                            {l.startDate && (
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter italic">
                                {new Date(l.startDate).getFullYear()}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-muted border border-border group-hover:bg-background transition-colors">
                            <span className="text-sm font-black text-foreground">{totalDays}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[100px] mx-auto">
                            {breakup.CPL > 0 && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black px-1.5 py-0">CPL:{breakup.CPL}</Badge>}
                            {breakup.SL > 0 && <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-black px-1.5 py-0">SL:{breakup.SL}</Badge>}
                            {breakup.LOP > 0 && <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-black px-1.5 py-0">LOP:{breakup.LOP}</Badge>}
                            {!breakup.CPL && !breakup.SL && !breakup.LOP && <span className="text-[10px] font-bold text-muted-foreground/40 italic">Unallocated</span>}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-2 max-w-md">
                            <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-2">
                              {l.reason || "No reason provided"}
                            </p>
                            
                            {(l.hrComment || l.tlComment) && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md w-fit transition-colors shadow-sm">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    View Feedback
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
                            
                            {l.status === "APPROVED" && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Approved</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="px-6">
                          <div className="flex flex-col gap-1.5">
                            <LeaveStatusBadge status={l.status} />
                            {l.updatedAt && (
                              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter pl-1">
                                Updated: {new Date(l.updatedAt).toLocaleDateString("en-US", { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStatCard({ label, value, icon, color }: any) {
  const colorMap: any = {
    emerald: "bg-primary/10 text-primary border-primary/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    slate: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest line-clamp-1">
              {label}
            </p>
            <p className={`text-2xl sm:text-3xl font-black tracking-tighter ${color === 'emerald' ? 'text-primary' : color === 'blue' ? 'text-blue-500' : color === 'rose' ? 'text-rose-500' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 self-end sm:self-auto ${colorMap[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const baseClass = "px-3 py-1 font-black text-[10px] uppercase tracking-[0.1em] border-none shadow-sm rounded-full w-fit flex items-center gap-1.5";

  switch (status) {
    case "PENDING_TL":
      return (
        <Badge className={`${baseClass} bg-blue-500/10 text-blue-600`}>
          <Clock className="h-3 w-3" />
          Pending TL
        </Badge>
      );
    case "PENDING_HR":
      return (
        <Badge className={`${baseClass} bg-indigo-500/10 text-indigo-600`}>
          <Clock className="h-3 w-3" />
          Pending HR
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className={`${baseClass} bg-primary/10 text-primary`}>
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    case "REJECTED":
    case "REJECTED_TL":
      return (
        <Badge className={`${baseClass} bg-rose-500/10 text-rose-600`}>
          <XCircle className="h-3 w-3" />
          {status === "REJECTED_TL" ? "TL Declined" : "Request Rejected"}
        </Badge>
      );
    default:
      return (
        <Badge className={`${baseClass} bg-muted text-muted-foreground`}>
          <AlertCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

