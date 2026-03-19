import { api } from "@/lib/api";
import { downloadPayslip } from "@/utils/downloadPayslip";
import { useEffect, useState } from "react";
import { getCurrentMonth } from "@/utils/dateHelpers";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Download, RefreshCw, Table as TableIcon } from "lucide-react";

export default function AdminSalaryHistory() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSlips();
  }, []);

  async function fetchSlips() {
    if (!month) return;

    setLoading(true);
    try {
      const res = await api.get("/salary/admin/history", {
        params: { month },
      });
      setSlips(res.data || []);
    } catch (err) {
      console.error("Failed to fetch admin salary history", err);
      setSlips([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 uppercase italic">
          Salary History
        </h1>
        <p className="text-muted-foreground mt-1 pl-5 font-medium italic flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Archives of all processed payroll records and slips
        </p>
      </div>

      {/* Filter */}
      <Card className="shadow-sm border-border overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
          <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-card-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Payroll History Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1 max-w-xs">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Select Month
              </label>
              <Input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setSlips([]);
                }}
                className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
              />
            </div>

            <Button
              onClick={fetchSlips}
              disabled={!month || loading}
              className="h-12 px-8 shadow-lg font-black uppercase tracking-widest text-xs transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Fetch Records
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-primary" />
            Payroll Records
          </CardTitle>
          {!loading && slips.length > 0 && (
            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-tighter">
              {slips.length} Records Found
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-1/3 text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Staff Member</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Payroll Month</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Amount Disbursed</TableHead>
                  <TableHead className="w-40 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Export</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-b border-border/50">
                      <TableCell colSpan={4} className="py-6 px-6">
                        <div className="flex items-center space-x-6">
                          <Skeleton className="h-4 w-64 rounded-full" />
                          <Skeleton className="h-4 w-24 rounded-full" />
                          <Skeleton className="h-4 w-32 ml-auto rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}

                {!loading && slips.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Calendar className="h-12 w-12 mb-4 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                          {month
                            ? "No payroll records found"
                            : "Awaiting month selection"}
                        </p>
                        <p className="text-[10px] font-medium mt-1">
                          {month
                            ? `No generated slips exist for ${new Date(month).toLocaleString('default', { month: 'long', year: 'numeric' })}`
                            : "Select a month above to load the history dossiers"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  slips.map((slip) => (
                    <TableRow key={slip.SlipID} className="group border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-black text-foreground group-hover:text-primary transition-colors italic uppercase leading-none mb-1 text-sm tracking-tight">
                            {slip.employeeName}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                            Identifier: {slip.EmployeeID}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-tighter bg-muted/80">
                          {slip.Month}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4 font-black text-sm text-foreground">
                        ₹{slip.netSalary.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 rounded-lg border-primary/20 text-primary hover:bg-primary/10 hover:border-primary transition-all active:scale-90"
                          title="Download PDF Slip"
                          onClick={() => downloadPayslip(slip)}
                        >
                          <Download className="h-4 w-4" />
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
