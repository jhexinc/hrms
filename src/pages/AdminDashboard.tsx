import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/utils/dateHelpers";
import {
  Users,
  UserCheck,
  Calendar,
  Gift,
  ClipboardList,
  ArrowRight,
  Clock,
  CalendarDays,
  CreditCard,
  Briefcase,
  Activity,
} from "lucide-react";

/* ===========================
   HOLIDAYS – 2026
=========================== */
const HOLIDAYS_2026 = [
  { name: "Makar Sankranti", date: "Jan 14", region: "India" },
  { name: "Memorial Day", date: "May 25", region: "USA" },
  { name: "Independence Day", date: "Jul 4", region: "USA" },
  { name: "Labor Day", date: "Sep 7", region: "USA" },
  { name: "Diwali / Deepavali", date: "Nov 6 - 10", region: "India" },
  { name: "Thanksgiving Day", date: "Nov 26", region: "USA" },
  { name: "Christmas & Year-End Holidays", date: "Dec 25 - Jan 1", region: "USA" },
];

type Employee = {
  EmployeeID: string;
  name: string;
  gender?: string;
  dob?: string;
  isActive?: boolean;
  department?: string;
};

type Leave = {
  LeaveID: string;
  EmployeeName: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.allSettled([
        api.get("/admin/employees"),
        api.get("/leave/admin/history"),
      ]);

      if (empRes.status === "fulfilled") {
        setEmployees(empRes.value.data || []);
      }

      if (leaveRes.status === "fulfilled") {
        setLeaves(leaveRes.value.data || []);
      }
    } catch (e) {
      console.error("Admin dashboard load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const totalEmployees = employees.length;
  const maleCount = employees.filter(
    (e) => e.gender?.toLowerCase() === "male"
  ).length;
  const femaleCount = employees.filter(
    (e) => e.gender?.toLowerCase() === "female"
  ).length;
  const pendingLeaves = leaves.filter((l) => l.status.startsWith("PENDING"));
  const recentLeaves = [...leaves]
    .sort((a, b) => b.LeaveID.localeCompare(a.LeaveID))
    .slice(0, 5);

  const activeCount = employees.filter(e => e.isActive !== false).length;

  const today = new Date();
  const upcomingBirthdays = employees.filter((e) => {
    if (!e.dob || e.isActive === false) return false;
    const dob = new Date(e.dob);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      dob.getMonth(),
      dob.getDate()
    );
    const diff =
      (thisYearBirthday.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 15; // Show next 15 days
  }).sort((a, b) => {
    const dobA = new Date(a.dob!);
    const dobB = new Date(b.dob!);
    return dobA.getMonth() - dobB.getMonth() || dobA.getDate() - dobB.getDate();
  });

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Approved</Badge>;
      case "REJECTED":
      case "REJECTED_TL":
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200">Rejected</Badge>;
      case "PENDING_HR":
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">Pending HR</Badge>;
      case "PENDING_TL":
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">Pending TL</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-10 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground border-l-4 border-primary pl-4 py-1">
            Admin Overview
          </h1>
          <p className="text-muted-foreground mt-1 pl-5 font-medium">
            Organizational health and operations summary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadDashboard()} className="h-10 px-4 shadow-sm border-border bg-background hover:bg-muted">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Refresh Data
          </Button>
          <Button onClick={() => navigate("/admin/employees")} className="h-10 px-4 shadow-md transition-all active:scale-95">
            <Users className="mr-2 h-4 w-4" /> Employee Directory
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Workforce"
          value={totalEmployees}
          description={`${maleCount} Male / ${femaleCount} Female`}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
          trend="+5.2%"
          color="emerald"
        />
        <StatCard
          title="Active Personnel"
          value={activeCount}
          description="Ready for operations"
          icon={<Activity className="h-5 w-5" />}
          loading={loading}
          trend="Stable"
          color="blue"
        />
        <StatCard
          title="Leaves Today"
          value={leaves.filter(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return l.status === "APPROVED" && now >= start && now <= end;
          }).length}
          description={`${pendingLeaves.length} awaiting review`}
          icon={<CalendarDays className="h-5 w-5" />}
          loading={loading}
          trend="Normal"
          color="amber"
        />
        <StatCard
          title="Pending Items"
          value={pendingLeaves.length}
          description="Action required"
          icon={<ClipboardList className="h-5 w-5" />}
          loading={loading}
          trend="Urgent"
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Leave Requests */}
        <Card className="lg:col-span-2 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card">
            <div>
              <CardTitle className="text-xl font-bold text-card-foreground">Recent Leave Requests</CardTitle>
              <CardDescription className="text-muted-foreground">Latest applications needing attention</CardDescription>
            </div>
            <Button variant="link" size="sm" onClick={() => navigate("/admin/leave")} className="text-primary font-bold hover:text-primary/80 p-0 h-auto">
              View All Portal <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentLeaves.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ClipboardList className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium italic text-sm">No recent leave requests found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentLeaves.map((leave) => (
                  <div key={leave.LeaveID} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all group cursor-pointer" onClick={() => navigate(`/admin/leave/${leave.LeaveID}`)}>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm ring-offset-2 ring-offset-muted">
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                          {getInitials(leave.EmployeeName || leave.employeeName || "Unknown")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="font-bold text-base text-foreground leading-none group-hover:text-primary transition-colors">{leave.EmployeeName || leave.employeeName || "Unknown Employee"}</p>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        {statusBadge(leave.status)}
                      </div>
                      <div className="p-2 rounded-full bg-transparent group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-all shadow-none group-hover:shadow-sm">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Grid & Birthdays */}
        <div className="space-y-6">
          <Card className="shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-card-foreground">
                <Briefcase className="h-5 w-5 text-primary" />
                Admin Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-4">
              <ActionButton
                label="Leaves Review"
                icon={<Calendar className="h-5 w-5" />}
                onClick={() => navigate("/admin/leave")}
              />
              <ActionButton
                label="Manage Staff"
                icon={<Users className="h-5 w-5" />}
                onClick={() => navigate("/admin/employees")}
              />
              <ActionButton
                label="Attendance"
                icon={<UserCheck className="h-5 w-5" />}
                onClick={() => navigate("/admin/attendance")}
              />
              <ActionButton
                label="Payroll"
                icon={<CreditCard className="h-5 w-5" />}
                onClick={() => navigate("/admin/salary/generate")}
              />
            </CardContent>
          </Card>

          {/* Birthdays */}
          <Card className="shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-card-foreground">
                <Gift className="h-4 w-4 text-pink-500" />
                CELEBRATIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : upcomingBirthdays.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Gift className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium italic">No upcoming birthdays</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {upcomingBirthdays.map((e) => {
                    const dob = new Date(e.dob!);
                    const day = dob.getDate();
                    const month = dob.toLocaleString("default", { month: "short" });
                    return (
                      <div key={e.EmployeeID} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="h-12 w-12 rounded-xl bg-pink-50 flex flex-col items-center justify-center border border-pink-100 min-w-12 shadow-sm">
                          <span className="text-[10px] font-black text-pink-400 leading-none uppercase">{month}</span>
                          <span className="text-xl font-black text-pink-600 leading-tight">{day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-slate-800">{e.name}</p>
                          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">Active Member</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Holidays */}
        <Card className="shadow-sm lg:col-span-1 bg-card">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-card-foreground">
              <CalendarDays className="h-5 w-5 text-primary" />
              2026 Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 max-h-[350px] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {HOLIDAYS_2026.map((h, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-muted border border-transparent hover:border-border transition-all group">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{h.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h.region}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-foreground bg-muted px-3 py-1 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                      {h.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon, loading, trend, color }: any) {
  const colorMap: any = {
    emerald: "bg-emerald-500 text-white shadow-emerald-200",
    amber: "bg-amber-500 text-white shadow-amber-200",
    blue: "bg-blue-500 text-white shadow-blue-200",
    rose: "bg-rose-500 text-white shadow-rose-200",
  };

  const lightColorMap: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <Card className="shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative border-b-4 border-b-border hover:border-b-primary bg-card">
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 group-hover:scale-150 transition-transform duration-700`}>
        {icon}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className={`p-2.5 rounded-xl shadow-lg transition-transform group-hover:scale-110 ${colorMap[color] || "bg-primary"}`}>
            {icon}
          </div>
          <Badge variant="secondary" className={`text-[10px] font-black tracking-widest uppercase py-0.5 px-2 border-none ${lightColorMap[color]}`}>
            {trend}
          </Badge>
        </div>
        <CardTitle className="text-xs font-black text-muted-foreground pt-3 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-12 w-24" />
        ) : (
          <div className="flex flex-col">
            <span className="text-4xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</span>
            <span className="text-xs font-bold text-muted-foreground mt-1">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionButton({ label, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-card border border-border hover:border-primary/20 hover:bg-muted/50 transition-all group shadow-sm active:scale-95 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-3 w-3 text-primary" />
      </div>
      <div className="p-3 rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12 transition-all duration-300 shadow-inner">
        {icon}
      </div>
      <span className="text-xs font-extrabold text-muted-foreground group-hover:text-foreground uppercase tracking-tighter">{label}</span>
    </button>
  );
}
