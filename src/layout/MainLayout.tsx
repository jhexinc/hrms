import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <Navbar setOpen={setOpen} />

        <main className="flex-1 overflow-auto px-4 py-6 md:px-6 page-transition">
          {children}
        </main>
      </div>
    </div>
  );
}
