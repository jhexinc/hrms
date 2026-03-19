import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  AlertCircle,
  Clock,
  FileText,
} from "lucide-react";

export default function TeamLeadLeaveReview() {
  const { leaveId } = useParams();
  const navigate = useNavigate();

  const [leave, setLeave] = useState<any>(null);
  const [balance, setBalance] = useState<{ CPL: number; SL: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch from admin history (returns team data for TLs)
        const res = await api.get("/leave/admin/history");
        const allHistory = res.data || [];
        
        // Find the specific request
        const currentLeave = allHistory.find((x: any) => x.LeaveID === leaveId);

        if (currentLeave) {
          setLeave(currentLeave);
          if (currentLeave.tlComment) {
            setComment(currentLeave.tlComment);
          }

          // Balance Discovery:
          // Since the backend omits live balances for TLs in this endpoint, 
          // we search for the latest record for this employee that HAS a balance.
          let discoveredBalance = currentLeave.employeeLeaveBalance || currentLeave.leaveBalance;

          if (!discoveredBalance) {
            const hasData = allHistory
              .filter((l: any) => 
                l.EmployeeID === currentLeave.EmployeeID && 
                (l.employeeLeaveBalance || l.leaveBalance)
              )
              .sort((a: any, b: any) => 
                new Date(b.updatedAt || b.createdAt || 0).getTime() - 
                new Date(a.updatedAt || a.createdAt || 0).getTime()
              );

            if (hasData.length > 0) {
              discoveredBalance = hasData[0].employeeLeaveBalance || hasData[0].leaveBalance;
            }
          }

          setBalance(discoveredBalance || { CPL: 0, SL: 0 });
        } else {
          // Leave not found
          setErrorMessage("Leave request not found or already processed");
        }
      } catch (error: any) {
        console.error("Failed to fetch leave data:", error);
        setErrorMessage("Failed to load leave details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leaveId]);

  const approve = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      await api.post("/leave/approve-tl", {
        LeaveID: leave.LeaveID,
        action: "APPROVE",
        comment,
      });

      setSuccessMessage("Leave forwarded to HR for final approval");
      setTimeout(() => navigate("/tl/leave"), 1500);
    } catch (error: any) {
      console.error("Failed to approve leave:", error);
      setErrorMessage("Failed to approve leave");
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this leave request?",
    );

    if (!confirmed) return;

    setSubmitting(true);
    setErrorMessage("");
    try {
      await api.post("/leave/approve-tl", {
        LeaveID: leave.LeaveID,
        action: "REJECT",
        comment,
      });

      setSuccessMessage("Leave request rejected");
      setTimeout(() => navigate("/tl/leave"), 1500);
    } catch (error: any) {
      console.error("Failed to reject leave:", error);
      setErrorMessage("Failed to reject leave");
    } finally {
      setSubmitting(false);
    }
  };

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate if balance is sufficient
  const isBalanceSufficient = balance
    ? balance.CPL + balance.SL >= leave?.totalDays
    : false;

  // Calculate estimated LOP days
  const estimatedLOP =
    balance && leave
      ? Math.max(0, leave.totalDays - (balance.CPL + balance.SL))
      : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/tl/leave")}
            disabled
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-muted rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/tl/leave")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">Leave Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This leave request could not be found or has been processed.
            </p>
            <Button onClick={() => navigate("/tl/leave")}>
              Return to Leave Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/tl/leave")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Review Leave Request</h1>
        </div>
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-500 border-blue-500/20"
        >
          Pending TL Approval
        </Badge>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <Alert className="border-primary/20 bg-primary/10">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary/80">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="border-destructive/20 bg-destructive/10">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive/80">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Employee Information */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
            <User className="h-4 w-4" />
            Employee Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="font-medium text-foreground">{leave.employeeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Employee Code
              </p>
              <p className="font-medium text-foreground">
                {leave.employeeCode || leave.EmployeeID}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Details */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
            <Calendar className="h-4 w-4" />
            Leave Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Start Date
              </p>
              <p className="font-medium text-foreground">{formatDate(leave.startDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                End Date
              </p>
              <p className="font-medium text-foreground">{formatDate(leave.endDate)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Days
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-medium text-lg text-foreground">{leave.totalDays} days</p>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                <Clock className="h-3 w-3 mr-1" />
                {leave.startDate === leave.endDate
                  ? "Single day"
                  : "Multiple days"}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reason
            </p>
            <div className="mt-1 p-3 bg-muted rounded-md border border-border text-foreground">
              <p className="text-sm">{leave.reason || "No reason provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Leave Balance (View Only) */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-card-foreground">Employee Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balance ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-1">
                    Casual Paid Leave
                  </p>
                  <p className="font-bold text-lg text-primary">
                    {balance.CPL} days
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-500 mb-1">
                    Sick Leave
                  </p>
                  <p className="font-bold text-lg text-blue-500">
                    {balance.SL} days
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Balance
                    </p>
                    <p className="font-bold text-lg text-foreground">
                      {balance.CPL + balance.SL} days
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Requested
                    </p>
                    <p className="font-bold text-lg text-foreground">{leave.totalDays} days</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Estimated LOP
                    </p>
                    <p
                      className={`font-bold text-lg ${estimatedLOP > 0 ? "text-amber-500" : "text-primary"}`}
                    >
                      {estimatedLOP} days
                    </p>
                  </div>
                </div>
              </div>

              {!isBalanceSufficient && (
                <Alert className="border-amber-500/20 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-500/80 text-sm">
                    Employee may need {estimatedLOP} LOP days as balance is
                    insufficient.
                  </AlertDescription>
                </Alert>
              )}

              {isBalanceSufficient && (
                <Alert className="border-primary/20 bg-primary/10">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary/80 text-sm">
                    Sufficient leave balance available.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Balance information not available
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-card-foreground">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-blue-500/20 bg-blue-500/10">
            <AlertDescription className="text-blue-500/80 text-sm">
              As Team Lead, you can approve or reject leave requests. Final
              allocation will be done by HR.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-foreground">
              Team Lead Comment (Optional)
            </label>
            <Textarea
              placeholder="Add a remark for the employee or HR..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] border-border bg-background"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={approve}
              disabled={submitting}
              size="lg"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Approving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              onClick={reject}
              disabled={submitting}
              size="lg"
            >
              {submitting ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
