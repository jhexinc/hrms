import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  BadgeIcon,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  Hash,
  Home,
  Mail,
  User,
  Users,
  TrendingUp,
  MapPin,
  Clock,
  Activity as ActivityIcon,
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

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { employee } = useAuth();

  const getInitials = () => {
    if (!employee?.name) return "U";
    return employee.name
      .split(/[_ ]/)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified";

    const isDateOnly = dateString.length === 10;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(isDateOnly && { timeZone: "UTC" }),
    });
  };

  const employeeCode = employee?.employeeCode || employee?.employeeID || employee?.EmployeeID;

  if (!employee) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 px-4 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="relative group">
            <Avatar className="h-20 w-20 ring-4 ring-emerald-500/10 ring-offset-4 ring-offset-slate-50 shadow-xl transition-transform group-hover:scale-105 duration-300">
              <AvatarFallback className="bg-linear-to-br from-emerald-500 to-emerald-700 text-white font-black text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-sm">
              <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4">
              Hello, {employee.name?.split(/[_ ]/)[0] || "Employee"}!
            </h1>
            <p className="text-muted-foreground font-medium pl-5 flex items-center gap-2 italic">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Welcome to your workspace at {employee.branch || "Corporate Head Office"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/profile")} className="h-11 px-5 border-border bg-background hover:bg-muted shadow-sm font-bold text-muted-foreground">
            <User className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
          <Button onClick={() => navigate("/leave")} className="h-11 px-5 shadow-md font-bold transition-all active:scale-95">
            <ClipboardList className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          title="Casual Balance (CPL)"
          value={employee.leaveBalance?.CPL ?? 0}
          description="Available for immediate use"
          icon={<ClipboardList className="h-6 w-6" />}
          color="emerald"
        />
        <DashboardStatCard
          title="Sick Balance (SL)"
          value={employee.leaveBalance?.SL ?? 0}
          description="Awaiting medical necessity"
          icon={<ActivityIcon className="h-6 w-6" />}
          color="rose"
        />
        {(() => {
          const joinDateStr = employee.dateOfJoining;
          const totalDays = Math.floor((new Date().getTime() - new Date(joinDateStr || new Date()).getTime()) / (1000 * 3600 * 24));
          let detailText = "";
          if (joinDateStr) {
            const joinDate = new Date(joinDateStr);
            const now = new Date();
            let y = now.getFullYear() - joinDate.getFullYear();
            let m = now.getMonth() - joinDate.getMonth();
            let d = now.getDate() - joinDate.getDate();
            if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
            if (m < 0) { y -= 1; m += 12; }
            const parts = [];
            if (y > 0) parts.push(`${y}Y`);
            if (m > 0) parts.push(`${m}M`);
            if (d > 0 || parts.length === 0) parts.push(`${d}D`);
            detailText = parts.join(" ");
          }
          return (
            <DashboardStatCard
              title="Days with the Team"
              value={totalDays}
              description={`${detailText} • Joined ${formatDate(joinDateStr)}`}
              icon={<Building2 className="h-6 w-6" />}
              color="blue"
            />
          );
        })()}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Personal Details Profile */}
        <Card className="lg:col-span-2 shadow-sm overflow-hidden bg-card">
          <CardHeader className="border-b border-border bg-muted/30 pb-4">
            <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              Professional Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground">Your core identity and organizational data</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6 space-y-6">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Primary Information
                </h3>
                <div className="space-y-4">
                  <DetailRow icon={<User />} label="Legal Name" value={employee.name?.replace(/[_ ]/g, " ")} />
                  <DetailRow icon={<Mail />} label="Email Address" value={employee.email} />
                  <DetailRow icon={<CalendarDays />} label="Birth Date" value={formatDate(employee.dob)} />
                  <DetailRow icon={<Users />} label="Biological Sex" value={employee.gender || "—"} />
                </div>
              </div>
              <div className="p-6 space-y-6">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Corporate Identity
                </h3>
                <div className="space-y-4">
                  <DetailRow icon={<Hash />} label="Employee ID" value={employeeCode || "—"} />
                  <DetailRow icon={<BadgeIcon />} label="PAN Identifier" value={employee.pan || "—"} />
                  <DetailRow icon={<Home />} label="Address" value={employee.address || "—"} />
                  {employee.uan && <DetailRow icon={<Award />} label="UAN Number" value={employee.uan} />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Sidebars */}
        <div className="space-y-6">
          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-card-foreground">
                <Briefcase className="h-5 w-5 text-primary" />
                Employment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">Current Tenure</span>
                {getInternalStatusBadge(employee.employmentStatus)}
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">TEAM LEAD</span>
                <Badge variant="secondary" className={`text-[10px] font-black uppercase ${employee.isTL ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {employee.isTL ? "YES" : "NO"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">Portal Registration</span>
                <Badge variant="secondary" className={`text-[10px] font-black uppercase ${employee.registrationComplete ? "bg-blue-100/20 text-blue-500" : "bg-amber-100/20 text-amber-500"}`}>
                  {employee.registrationComplete ? "Verified" : "Action Required"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Organization Unit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <OrgUnitRow label="Department" value={employee.department} />
              <OrgUnitRow label="Designation" value={employee.designation} />
              <OrgUnitRow label="Branch Name" value={employee.branch} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Holidays */}
        <Card className="shadow-sm overflow-hidden bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-card-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <div className="divide-y divide-border">
              {HOLIDAYS_2026.map((h, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-all group">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{h.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h.region} Sector</p>
                  </div>
                  <Badge variant="outline" className="font-bold text-xs border-primary/20 bg-primary/10 text-primary h-7">
                    {h.date}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account History */}
        <Card className="lg:col-span-2 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Account Journey
            </CardTitle>
            <CardDescription className="text-muted-foreground">Timeline of your profile activities</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[300px] relative">
            <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-border"></div>
            <div className="space-y-12">
              <TimelineItem
                title="Account Initialized"
                date={employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                icon={<Users />}
                subtitle="Your digital identity was registered in the workforce portal"
              />
              <TimelineItem
                title="Last Record Update"
                date={employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                icon={<TrendingUp />}
                subtitle="Your profile information was last synchronized with central HR"
                isActive
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="h-9 w-9 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary flex items-center justify-center transition-all duration-300 border border-border">
        {icon && <div className="h-4 w-4">{icon}</div>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold text-foreground transition-colors">{value || "—"}</span>
      </div>
    </div>
  );
}

function OrgUnitRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter group-hover:text-primary transition-colors">{label}</span>
      <span className="text-sm font-black text-foreground">{value || "—"}</span>
    </div>
  );
}

function DashboardStatCard({ title, value, description, icon, color }: any) {
  const colorMap: any = {
    emerald: "bg-primary shadow-primary/20",
    rose: "bg-rose-500 shadow-rose-500/20",
    blue: "bg-blue-500 shadow-blue-500/20",
  };

  return (
    <Card className="shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative border-b-4 border-b-border hover:border-b-primary bg-card">
      <div className="absolute -right-4 -bottom-4 h-24 w-24 opacity-5 group-hover:scale-150 transition-transform duration-700 text-foreground">
        {icon}
      </div>
      <CardHeader className="pb-2">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {icon}
        </div>
        <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest pt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <span className="text-4xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors uppercase italic">{value}</span>
          <span className="text-xs font-bold text-muted-foreground mt-1">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineItem({ title, date, subtitle, icon, isActive }: any) {
  return (
    <div className="relative pl-16 group">
      <div className={`absolute left-8 -translate-x-1/2 h-4 w-4 rounded-full border-4 border-card shadow-sm z-10 transition-all ${isActive ? "bg-blue-500 scale-125 ring-4 ring-blue-500/20" : "bg-muted-foreground group-hover:bg-foreground"}`}></div>
      <div className="absolute left-0 p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-500 transition-all border border-border">
        {icon && <div className="h-4 w-4">{icon}</div>}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h4 className={`text-sm font-black uppercase tracking-tight ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{title}</h4>
          <Badge variant="outline" className="text-[10px] font-bold border-border bg-muted h-5">{date}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function getInternalStatusBadge(status?: string) {
  const val = status?.toLowerCase();
  if (val === "probation") return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 border-none px-3 font-bold text-[10px] uppercase h-6">Probation</Badge>;
  if (val === "permanent") return <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none px-3 font-bold text-[10px] uppercase h-6">Permanent Member</Badge>;
  if (val === "contract") return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-none px-3 font-bold text-[10px] uppercase h-6">Contractor</Badge>;
  return <Badge variant="outline" className="px-3 font-bold text-[10px] uppercase h-6">{status || "Active"}</Badge>;
}
