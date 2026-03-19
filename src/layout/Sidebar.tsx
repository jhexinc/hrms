import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  History,
  Users2,
  User,
  ClipboardList,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: any;
};

type NavGroup = {
  label: string;
  icon: any;
  items: NavItem[];
};

/* ===========================
   NAV CONFIG
=========================== */

const adminNavGroups: NavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [{ label: "Overview", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "Employee Management",
    icon: Users2,
    items: [
      { label: "Employees", to: "/admin/employees", icon: Users2 },
      {
        label: "Team Assignments",
        to: "/admin/team-assignments",
        icon: Users2,
      },
    ],
  },
  {
    label: "Leave Management",
    icon: ClipboardList,
    items: [
      {
        label: "Leave Management",
        to: "/admin/leave",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Attendance",
    icon: Calendar,
    items: [
      {
        label: "Apply Leave",
        to: "/admin/attendance",
        icon: Calendar,
      },
    ],
  },
  {
    label: "Payroll",
    icon: IndianRupee,
    items: [
      {
        label: "Generate Salary",
        to: "/admin/salary/generate",
        icon: IndianRupee,
      },
      {
        label: "Performance Bonus",
        to: "/performance/bonus",
        icon: DollarSign,
      },
      {
        label: "Other Deductions",
        to: "/performance/deductions",
        icon: DollarSign,
      },
      {
        label: "Salary History",
        to: "/admin/salary/history",
        icon: History,
      },
      {
        label: "CA Salary Calculation",
        to: "/admin/ca-salary-calculation",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    label: "Personal",
    icon: User,
    items: [{ label: "Profile", to: "/profile", icon: User }],
  },
];

const employeeNavItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Apply Leave", to: "/leave", icon: Calendar },
  { label: "Leave History", to: "/leave/history", icon: History },
  { label: "Salary History", to: "/salary/history", icon: IndianRupee },
  { label: "Profile", to: "/profile", icon: User },
];

const teamLeadNavItems: NavItem[] = [
  { label: "Team Leave Approvals", to: "/tl/leave", icon: ClipboardList },
];

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { roles } = useAuth();
  const location = useLocation();

  const [isTeamLead, setIsTeamLead] = useState(false);
  const [loadingTL, setLoadingTL] = useState(true);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const isAdmin = roles.includes("v4-admin") || roles.includes("v4-hr");

  /* ===========================
     AUTO-EXPAND ACTIVE GROUP
  =========================== */

  useEffect(() => {
    if (isAdmin) {
      const activeGroup = adminNavGroups.find((group) =>
        group.items.some((item) => {
          if (item.to === "/") return location.pathname === "/";
          return location.pathname.startsWith(item.to);
        }),
      );
      if (activeGroup) {
        setExpandedGroups((prev) => ({
          ...prev,
          [activeGroup.label]: true,
        }));
      }
    }
  }, [location.pathname, isAdmin]);

  /* ===========================
     LOAD PROFILE (TL CHECK)
  =========================== */

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/employee/me");
        setIsTeamLead(res.data?.isTL === true);
      } catch {
        setIsTeamLead(false);
      } finally {
        setLoadingTL(false);
      }
    };

    if (!isAdmin) {
      loadProfile();
    } else {
      setLoadingTL(false);
    }
  }, [isAdmin]);

  /* ===========================
     LOAD PENDING LEAVE COUNT
  =========================== */

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        if (isAdmin) {
          const res = await api.get("/count/leave/adminPending");
          setPendingLeaveCount(res.data?.count || 0);
        } else if (isTeamLead) {
          const res = await api.get("/count/leave/tlPending");
          setPendingLeaveCount(res.data?.count || 0);
        } else {
          setPendingLeaveCount(0);
        }
      } catch {
        setPendingLeaveCount(0);
      }
    };

    if (!loadingTL) {
      loadPendingCount();
    }
  }, [isAdmin, isTeamLead, loadingTL]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };


  /* ===========================
     BADGE COMPONENT
  =========================== */

  const Badge = ({ count }: { count: number }) => {
    if (!count || count <= 0) return null;

    return (
      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold px-2 py-0.5">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  /* ===========================
     RENDER
  =========================== */

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64",
          "bg-emerald-900 text-emerald-50",
          "transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0",
          "flex flex-col",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-emerald-800 px-4 py-4 shrink-0">
          <img src="/image.png" alt="logo" className="h-8 w-8" />
          <span className="font-semibold tracking-wide">HRMS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!loadingTL && (
            <div className="space-y-1">
              {isAdmin ? (
                adminNavGroups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-emerald-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <group.icon size={18} />
                        <span className="font-medium">{group.label}</span>
                      </div>
                      {expandedGroups[group.label] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {expandedGroups[group.label] && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-emerald-800 pl-3">
                        {group.items.map((item) => {
                          const showBadge =
                            item.to === "/admin/leave" &&
                            pendingLeaveCount > 0;

                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                                isActive(item.to)
                                  ? "bg-emerald-800 font-semibold"
                                  : "hover:bg-emerald-800/70",
                              )}
                            >
                              <item.icon size={16} />
                              <span className="flex-1">{item.label}</span>
                              {showBadge && (
                                <Badge count={pendingLeaveCount} />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <>
                  {employeeNavItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm mb-1",
                        isActive(item.to)
                          ? "bg-emerald-800 font-semibold"
                          : "hover:bg-emerald-800/70",
                      )}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  ))}

                  {isTeamLead && (
                    <div className="mt-4 pt-4 border-t border-emerald-800">
                      <div className="px-3 py-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                        Team Lead
                      </div>

                      {teamLeadNavItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                            isActive(item.to)
                              ? "bg-emerald-800 font-semibold"
                              : "hover:bg-emerald-800/70",
                          )}
                        >
                          <item.icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          <Badge count={pendingLeaveCount} />
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-emerald-800 px-4 py-3 shrink-0">
          <div className="text-xs text-emerald-300 mb-1">Role</div>
          <div className="text-sm font-medium">
            {isAdmin
              ? "Administrator"
              : isTeamLead
              ? "Team Lead"
              : "Employee"}
          </div>
        </div>
      </aside>
    </>
  );
}