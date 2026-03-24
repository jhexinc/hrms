import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  User,
  Building,
  Calendar,
  CreditCard,
  Banknote,
  Database,
  FileText,
  Fingerprint,
  Trash2,
} from "lucide-react";

export default function AdminEmployeeEdit() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [employee, setEmployee] = useState<any>(null);

  const [form, setForm] = useState({
    baseSalary: 0,
    pfApplicable: true,

    bankName: "",
    bankAccount: "",
    ifsc: "",

    employmentStatus: "REGULAR",
    leaveCPL: 4,
    leaveSL: 2,

    employeeCode: "",
    branch: "",
    dateOfJoining: "",
    isTL: false,

    // New fields
    pan: "",
    uan: "",
  });

  useEffect(() => {
    loadEmployee();
  }, []);

  async function loadEmployee() {
    try {
      const res = await api.get("/admin/employees");

      const emp = res.data.find((e: any) => e.EmployeeID === employeeId);

      if (!emp) {
        setMessage({
          type: "error",
          text: "Employee not found",
        });
        return;
      }

      setEmployee(emp);

      setForm({
        baseSalary: emp.baseSalary || 0,
        pfApplicable: emp.pfApplicable !== false,

        bankName: emp.bankAccount?.bankName || "",
        bankAccount: emp.bankAccount?.accountNumber || "",
        ifsc: emp.bankAccount?.ifsc || "",

        employmentStatus: emp.employmentStatus || "REGULAR",
        leaveCPL: emp.leaveBalance?.CPL ?? 4,
        leaveSL: emp.leaveBalance?.SL ?? 2,

        employeeCode: emp.employeeCode || "",
        branch: emp.branch || "",
        dateOfJoining: emp.dateOfJoining || "",
        isTL: emp.isTL === true,

        // New fields
        pan: emp.pan || "",
        uan: emp.uan || "",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Failed to load employee details",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    // Validate bank account number (11 to 18 digits)
    if (form.bankAccount && form.bankAccount.trim() !== "") {
      if (!/^\d{11,18}$/.test(form.bankAccount)) {
        setMessage({
          type: "error",
          text: "Bank account number must be between 11 and 18 digits",
        });
        setSaving(false);
        return;
      }
    }

    try {
      await api.put(`/admin/employees/${employeeId}`, {
        baseSalary: form.baseSalary,
        pfApplicable: form.pfApplicable,

        employmentStatus: form.employmentStatus,
        leaveBalance:
          form.employmentStatus === "REGULAR"
            ? { CPL: form.leaveCPL, SL: form.leaveSL }
            : { CPL: 0, SL: 0 },

        employeeCode: form.employeeCode,
        branch: form.branch,
        dateOfJoining: form.dateOfJoining,

        bankAccount: {
          bankName: form.bankName,
          accountNumber: form.bankAccount,
          ifsc: form.ifsc,
        },
        isTL: form.isTL,

        // New fields
        pan: form.pan,
        uan: form.uan,
      });

      setMessage({
        type: "success",
        text: "Employee updated successfully",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error || "Failed to update employee",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            disabled
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive text-lg font-medium">
              {message?.text}
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/admin/employees")}
            >
              Return to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Employee Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Update official information, leave balance, and payroll details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              form.employmentStatus === "REGULAR"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }
          >
            {form.employmentStatus === "REGULAR"
              ? "Regular Employee"
              : "Probation"}
          </Badge>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Name</div>
                  <div className="text-lg font-medium">{employee.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Email</div>
                  <div className="text-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {employee.email || employee.Email || "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Designation</div>
                  <div className="text-lg font-medium">
                    {employee.designation}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Department</div>
                  <div className="text-lg font-medium">
                    {employee.department}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">
                    Employment Status
                  </div>
                  <Select
                    value={form.employmentStatus}
                    onValueChange={(v) =>
                      setForm({ ...form, employmentStatus: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROBATION">Probation</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
              </div>

              {/* New row for PAN and UAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    PAN
                  </div>
                  <Input
                    value={form.pan}
                    onChange={(e) =>
                      setForm({ ...form, pan: e.target.value.toUpperCase() })
                    }
                    placeholder="Enter PAN"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    10-character PAN
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Fingerprint className="h-3 w-3" />
                    UAN
                  </div>
                  <Input
                    value={form.uan}
                    onChange={(e) => setForm({ ...form, uan: e.target.value })}
                    placeholder="Enter UAN"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    12-digit UAN number
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Official Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Official Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Employee Code
                  </label>
                  <Input
                    value={form.employeeCode}
                    onChange={(e) =>
                      setForm({ ...form, employeeCode: e.target.value })
                    }
                    placeholder="Enter employee code"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Official employee identifier
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Date of Joining
                  </label>
                  <Input
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(e) =>
                      setForm({ ...form, dateOfJoining: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Branch</label>
                <Select
                  value={form.branch}
                  onValueChange={(v) => setForm({ ...form, branch: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visnagar, Gujarat">
                      Visnagar, Gujarat
                    </SelectItem>
                    <SelectItem value="Ahmedabad, Gujarat">
                      Ahmedabad, Gujarat
                    </SelectItem>
                    <SelectItem value="Pune, Maharashtra">
                      Pune, Maharashtra
                    </SelectItem>
                    <SelectItem value="Visnagar New, Gujarat">
                      Visnagar New, Gujarat
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <Checkbox
                  checked={form.isTL}
                  onCheckedChange={(checked: any) =>
                    setForm({ ...form, isTL: Boolean(checked) })
                  }
                  id="is-tl"
                />
                <div>
                  <label htmlFor="is-tl" className="text-sm font-medium">
                    Team Lead
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Can manage team members and approve leave requests
                  </p>

                  {/* ⚠️ Warning when removing TL */}
                  {!form.isTL && employee.isTL === true && (
                    <p className="text-xs text-red-600 mt-1">
                      Removing Team Lead access will unassign all team members
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Salary & Payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Base Salary (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.baseSalary}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      baseSalary: Math.max(0, Number(e.target.value)),
                    })
                  }
                  placeholder="Enter base salary"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={form.pfApplicable}
                  onCheckedChange={(checked: any) =>
                    setForm({
                      ...form,
                      pfApplicable: Boolean(checked),
                    })
                  }
                  id="pf-applicable"
                />
                <div>
                  <label
                    htmlFor="pf-applicable"
                    className="text-sm font-medium"
                  >
                    Provident Fund (PF) Applicable
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Enable PF deductions for this employee
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Additional Details */}
        <div className="space-y-6">
          {/* Leave Balance Card */}
          {form.employmentStatus === "REGULAR" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Leave Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Casual Paid Leave (CPL)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.leaveCPL}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leaveCPL: Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="CPL balance"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available casual leave days
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Sick Leave (SL)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.leaveSL}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leaveSL: Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="SL balance"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available sick leave days
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">
                    Current Allocation
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CPL:</span>
                    <span className="font-medium">{form.leaveCPL} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SL:</span>
                    <span className="font-medium">{form.leaveSL} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bank Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Bank Name
                </label>
                <Input
                  placeholder="e.g., HDFC Bank"
                  value={form.bankName}
                  onChange={(e) =>
                    setForm({ ...form, bankName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Account Number
                </label>
                <Input
                  placeholder="Enter 11-18 digit account number"
                  value={form.bankAccount}
                  onChange={(e) =>
                    setForm({ ...form, bankAccount: e.target.value.replace(/\D/g, '') })
                  }
                  className={`font-mono ${form.bankAccount && !/^\d{11,18}$/.test(form.bankAccount) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {form.bankAccount && !/^\d{11,18}$/.test(form.bankAccount) && (
                  <p className="text-xs text-destructive mt-1">
                    Must be 11 to 18 digits
                  </p>
                )}
                {!form.bankAccount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    11 to 18 digit account number
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  IFSC Code
                </label>
                <Input
                  placeholder="HDFC0000123"
                  value={form.ifsc}
                  onChange={(e) => setForm({ ...form, ifsc: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Database ID
                </div>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded truncate">
                  {employee.EmployeeID}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cognito UUID - For system reference only
                </p>
              </div>

              <div className="pt-3 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Last Updated
                </div>
                <div className="text-sm">Just now</div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Cancel
            </Button>

            <div className="pt-6 mt-6 border-t border-red-100">
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("WARNING: This will permanently delete this user from AWS Cognito and DynamoDB. This action cannot be undone. Proceed?")) {
                    setSaving(true);
                    api.put(`/admin/employees/${employeeId}`, { action: "DELETE" })
                      .then(() => {
                        alert("Employee permanently deleted.");
                        navigate("/admin/employees");
                      })
                      .catch((err) => {
                        alert("Failed to delete employee: " + (err.response?.data?.error || err.message));
                        setSaving(false);
                      });
                  }
                }}
                disabled={saving}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Permanently Delete Employee
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Removes record completely from the system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
