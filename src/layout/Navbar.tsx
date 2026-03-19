import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ESTClock from "./ESTClock";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar({ setOpen }: { setOpen: (v: boolean) => void }) {
  const { employee } = useAuth();

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden rounded-md p-2 hover:bg-muted transition-colors"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-4">
          <span className="hidden lg:block text-sm font-semibold tracking-wide">
            HRMS Dashboard
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* EST Clock */}
        <div className="hidden md:flex items-center">
          <div className="h-4 w-px bg-border mx-3" />
          <ESTClock />
        </div>

        {/* Mobile EST Clock */}
        <div className="md:hidden text-xs font-mono">
          <ESTClock />
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">{employee?.name}</span>
            <span className="text-xs text-muted-foreground">
              {employee?.department || "Employee"}
            </span>
          </div>

          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
              {getInitials(employee?.name)}
            </AvatarFallback>
          </Avatar>

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>

          {/* Mobile logout button */}
          <button
            className="sm:hidden rounded-md p-2 hover:bg-muted transition-colors"
            onClick={logout}
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}