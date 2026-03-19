import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  TrendingUp,
} from "lucide-react";

type DayType = "FULL" | "FIRST_HALF" | "SECOND_HALF";

export default function EmployeeLeave() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [balance, setBalance] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (startDate) {
      const [y, m, d] = startDate.split("-");
      setStartInput(`${d}/${m}/${y}`);
    } else {
      setStartInput("");
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      const [y, m, d] = endDate.split("-");
      setEndInput(`${d}/${m}/${y}`);
    } else {
      setEndInput("");
    }
  }, [endDate]);

  // Per-day selection state
  const [dateSelections, setDateSelections] = useState<{ date: string; type: DayType }[]>([]);

  useEffect(() => {
    api
      .get("/leave/me/balance")
      .then((res) => setBalance(res.data))
      .finally(() => setLoadingBalance(false));
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) {
      setDateSelections([]);
      return;
    }

    const parseLocal = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const start = parseLocal(startDate);
    const end = parseLocal(endDate);

    if (end < start) {
      setDateSelections([]);
      return;
    }

    const dates = [];
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");

      dates.push({
        date: `${year}-${month}-${day}`,
        type: "FULL" as DayType,
      });
      current.setDate(current.getDate() + 1);
    }

    setDateSelections(dates);
  }, [startDate, endDate]);

  const calculatedDays = useMemo(() => {
    return dateSelections.reduce((acc, d) => {
      if (d.type === "FULL") return acc + 1;
      return acc + 0.5;
    }, 0);
  }, [dateSelections]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/leave/request", {
        startDate,
        endDate,
        reason,
        month: startDate.slice(0, 7),
        dailyBreakdown: dateSelections,
      });

      setSuccess("Your leave request has been submitted to your Team Lead for approval.");
      setStartDate("");
      setEndDate("");
      setReason("");
      setDateSelections([]);

      // Refresh balance
      api.get("/leave/me/balance").then((res) => setBalance(res.data));
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to submit leave request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = startDate && endDate && reason.trim() && calculatedDays > 0;

  const formatDateLabel = (dateString: string) => {
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      weekday: "short",
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground border-l-4 border-primary pl-4 py-1">
            Request Time Off
          </h1>
          <p className="text-muted-foreground mt-1 pl-5 font-medium">
            Plan your absence and notify your team
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-tighter">Approval workflow active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Form */}
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-card-foreground">
                <ClipboardList className="h-5 w-5 text-primary" />
                Leave Application Details
              </CardTitle>
              <CardDescription className="text-muted-foreground">Fill in your desired dates and reason for leave</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Date Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Start Date</label>
                  <div className="relative group">
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={startInput}
                      readOnly
                      onClick={() => startRef.current?.showPicker()}
                      className="pl-10 h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-medium cursor-pointer bg-background"
                    />
                    <input
                      ref={startRef}
                      type="date"
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">End Date</label>
                  <div className="relative group">
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={endInput}
                      readOnly
                      onClick={() => endRef.current?.showPicker()}
                      className="pl-10 h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-medium cursor-pointer bg-background"
                    />
                    <input
                      ref={endRef}
                      type="date"
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                  </div>
                </div>
              </div>

              {startDate && endDate && new Date(endDate) < new Date(startDate) && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    Oops! The end date cannot be earlier than the start date.
                  </AlertDescription>
                </Alert>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Reason for Absence</label>
                <Textarea
                  placeholder="Please provide a brief reason for your leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[120px] border-border focus:border-primary focus:ring-primary/10 transition-all resize-none p-4 font-medium bg-background"
                />
              </div>

              {/* Alerts */}
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-black text-xs uppercase tracking-tight">Submission Error</AlertTitle>
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-primary/10 border-primary/20 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle className="font-black text-xs uppercase tracking-tight">Request Sent</AlertTitle>
                  <AlertDescription className="text-sm font-medium">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={submit}
                disabled={!isValid || submitting}
                className="w-full h-14 shadow-lg transition-all active:scale-95 disabled:opacity-50 font-black text-base"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 animate-spin" /> Processing...
                  </div>
                ) : (
                  "Submit Leave Request"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* HR Reminders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-500 uppercase">Policy Tip</h4>
                <p className="text-[11px] text-amber-500/80 font-medium mt-1">Leaves should ideally be requested at least 48 hours in advance for team planning.</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-500 uppercase">Pro-tip</h4>
                <p className="text-[11px] text-blue-500/80 font-medium mt-1">Check your current balance on the right to ensure sufficient credits are available.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Balance Cards */}
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-card-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <BalanceStat label="Casual Leave" value={balance?.CPL ?? 0} loading={loadingBalance} color="emerald" />
              <BalanceStat label="Sick Leave" value={balance?.SL ?? 0} loading={loadingBalance} color="rose" />
            </CardContent>
          </Card>

          {/* Breakdown Summary */}
          <Card className={`border-border shadow-sm overflow-hidden transition-all duration-500 bg-card ${dateSelections.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none'}`}>
            <CardHeader className="bg-muted p-5 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Request Summary</CardTitle>
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase px-2 py-0.5">{calculatedDays} DAYS</Badge>
              </div>
              {dateSelections.length > 0 && (
                <div className="mt-4 flex items-center gap-2.5 py-1.5 px-3 bg-background rounded-lg w-fit group-hover:bg-background/80 transition-colors border border-border">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">
                    {formatDateLabel(dateSelections[0].date)} — {formatDateLabel(dateSelections[dateSelections.length - 1].date)}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {dateSelections.length > 0 ? (
                <div className="divide-y divide-border max-h-[350px] overflow-y-auto custom-scrollbar">
                  {dateSelections.map((d, index) => (
                    <div key={d.date} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{formatDateLabel(d.date)}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Day {index + 1}</span>
                      </div>
                      <Select
                        value={d.type}
                        onValueChange={(val) => {
                          const updated = [...dateSelections];
                          updated[index].type = val as DayType;
                          setDateSelections(updated);
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-[11px] font-black border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">Full Day</SelectItem>
                          <SelectItem value="FIRST_HALF">1st Half</SelectItem>
                          <SelectItem value="SECOND_HALF">2nd Half</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground italic">Select a date range to see breakdown</p>
                </div>
              )}
            </CardContent>
            {dateSelections.length > 0 && (
              <div className="p-5 bg-muted/50 border-t border-border flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Total Consumption</span>
                  <span className="text-[11px] font-medium text-muted-foreground mt-1.5">Approved vs Balance</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground tracking-tighter leading-none">{calculatedDays}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase">Days</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function BalanceStat({ label, value, loading, color }: any) {
  const bg = color === 'emerald' ? 'bg-primary/10' : 'bg-rose-500/10';
  const text = color === 'emerald' ? 'text-primary' : 'text-rose-500';
  const border = color === 'emerald' ? 'border-primary/20' : 'border-rose-500/20';
  const accent = color === 'emerald' ? 'bg-primary' : 'bg-rose-500';

  return (
    <div className={`relative p-5 rounded-3xl border ${border} ${bg} transition-all hover:shadow-lg hover:shadow-black/5 group flex flex-col items-center text-center overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${accent} opacity-30`}></div>
      <span className="text-[10px] font-black text-foreground uppercase tracking-[0.15em] leading-none mb-3">{label}</span>
      {loading ? (
        <Skeleton className="h-10 w-16" />
      ) : (
        <span className={`text-4xl font-black ${text} tracking-tighter leading-none group-hover:scale-110 transition-transform duration-300`}>{value}</span>
      )}
    </div>
  );
}
