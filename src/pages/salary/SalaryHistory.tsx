import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { getCurrentMonth } from "@/utils/dateHelpers";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadPayslip } from "@/utils/downloadPayslip";
import { Calendar, Download, IndianRupee, RefreshCcw } from "lucide-react";

export default function SalaryHistory() {
  const [slips, setSlips] = useState<any[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await api.get("/salary/me/history");
      setSlips(res.data || []);
    } catch (e) {
      console.error(e);
      setSlips([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (slips.length > 0) {
      handleView();
    }
  }, [slips, month]);

  function handleView() {
    const slip = slips.find((s) => s.Month === month);
    setSelectedSlip(slip || null);
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 py-1 uppercase italic">
            My Salary
          </h1>
          <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            View and download your monthly salary slips
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={loadHistory}
          disabled={loading}
          className="h-10 w-10 border-border bg-background shadow-sm hover:bg-muted transition-all active:scale-95"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selector Card */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Select Month
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Month</label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setSelectedSlip(null);
                  }}
                  className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background text-sm"
                />
              </div>
              <Button
                onClick={handleView}
                disabled={!month || loading}
                className="w-full h-12 shadow-md font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                View Salary
              </Button>
            </CardContent>
          </Card>

          {/* Quick Overview Stats */}
          {selectedSlip && (
            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-3xl bg-primary/10 border border-primary/20 shadow-sm group hover:shadow-md transition-all">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Net Salary</p>
                <p className="text-3xl font-black text-foreground tracking-tighter group-hover:scale-105 transition-transform duration-300">
                  ₹{selectedSlip.netSalary.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 shadow-sm group hover:shadow-md transition-all">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Generated On</p>
                <p className="text-xl font-black text-foreground tracking-tight">
                  {new Date(selectedSlip.generatedAt).toLocaleDateString("en-US", { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Details Card */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card className="h-[400px] border-border shadow-sm bg-card animate-pulse">
              <CardContent className="h-full flex flex-col justify-center items-center gap-4 opacity-20">
                <IndianRupee className="h-16 w-16" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ) : selectedSlip ? (
            <Card className="border-border shadow-lg overflow-hidden bg-card border-b-4 border-b-primary h-full flex flex-col">
              <CardHeader className="bg-muted/30 border-b border-border py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-card-foreground uppercase tracking-tight italic">
                    Salary Details
                  </CardTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">{selectedSlip.Month}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Download className="h-6 w-6" />
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-8 space-y-8">
                    <div>
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Salary Info
                      </h3>
                      <div className="space-y-4">
                        <SalaryDataRow label="Net Salary" value={`₹${selectedSlip.netSalary.toLocaleString("en-IN")}`} isHighlight />
                        <SalaryDataRow label="Reporting Cycle" value={selectedSlip.Month} />
                        <SalaryDataRow label="Status" value="Generated" />
                      </div>
                    </div>
                  </div>
                  <div className="p-8 space-y-8 bg-muted/10">
                    <div>
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Details
                      </h3>
                      <div className="space-y-4">
                        <SalaryDataRow label="Month" value={selectedSlip.Month} />
                        <SalaryDataRow label="Generated On" value={new Date(selectedSlip.generatedAt).toLocaleDateString()} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-8 border-t border-border bg-muted/20">
                <Button
                  onClick={() => downloadPayslip(selectedSlip)}
                  className="w-full h-14 shadow-xl font-black uppercase tracking-[0.2em] text-sm group transition-all active:scale-95"
                >
                  <Download className="mr-3 h-5 w-5 group-hover:animate-bounce" />
                  Download Salary Slip
                </Button>
              </div>
            </Card>
          ) : month ? (
            <div className="h-[400px] rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-10 bg-muted/5">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Calendar className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-black text-card-foreground uppercase tracking-tight">Not Generated</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs font-medium">Salary for <span className="font-bold text-foreground">{month}</span> has not been generated yet.</p>
            </div>
          ) : (
            <div className="h-[400px] rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-10 bg-muted/5">
              <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Select a period to begin inspection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryDataRow({ label, value, isHighlight }: any) {
  return (
    <div className="flex flex-col gap-0.5 group">
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`font-black tracking-tight transition-colors ${isHighlight ? 'text-2xl text-primary' : 'text-base text-foreground group-hover:text-primary'}`}>
        {value || "—"}
      </span>
    </div>
  );
}

