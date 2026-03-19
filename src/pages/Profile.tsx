import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import {
  User,
  Pencil,
  Save,
  X,
  Mail,
  CalendarDays,
  Users,
  MapPin,
  Hash,
  Building2,
  Briefcase,
  CreditCard,
  ShieldCheck,
  Activity
} from "lucide-react";

export default function Profile() {
  const { employee } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || "",
        dob: employee.dob || "",
        gender: employee.gender || "",
        address: employee.address || "",

        bankName: employee.bankAccount?.bankName || "",
        bankAcc: employee.bankAccount?.accountNumber || "",
        ifsc: employee.bankAccount?.ifsc || "",

        pan: employee.pan || "",
        uan: employee.uan || "",
        department: employee.department || "",
        designation: employee.designation || "",
      });
    }
  }, [employee]);

  if (!employee) return null;

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const getInitials = () => {
    if (!employee?.name) return "U";
    return employee.name
      .split(/[_ ]/)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDateLabel = (dateString?: string) => {
    if (!dateString) return "Not specified";
    const isDateOnly = dateString.length === 10;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(isDateOnly && { timeZone: "UTC" }),
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await api.post("/profile/register", {
        ...form,
        bankAccount: {
          bankName: form.bankName,
          accountNumber: form.bankAcc,
          ifsc: form.ifsc,
        },
      });

      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Profile update failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const bank = employee.bankAccount || {};
  const employeeCode = employee.employeeCode || employee.employeeID || employee.EmployeeID;

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 ring-4 ring-primary/10 ring-offset-4 ring-offset-slate-50 shadow-xl">
            <AvatarFallback className="bg-linear-to-br from-primary to-emerald-700 text-white font-black text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground border-l-4 border-primary pl-4 uppercase italic">
              Employee Profile
            </h1>
            <p className="text-muted-foreground font-medium pl-5 flex items-center gap-2 italic">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Employee Code - {employeeCode}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="h-11 px-6 shadow-lg font-black uppercase tracking-widest text-xs transition-all active:scale-95">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="h-11 px-6 shadow-lg font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="h-11 px-6 border-border font-black uppercase tracking-widest text-xs">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
          <Activity className="h-4 w-4" />
          <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Details */}
          <Card className="shadow-sm border-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-lg font-black flex items-center gap-3 text-card-foreground">
                <User className="h-5 w-5 text-primary" />
                Personal Details
              </CardTitle>
              <CardDescription className="text-xs font-medium italic">Your basic personal information</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                {!isEditing ? (
                  <>
                    <DetailItem icon={<User />} label="Full Name" value={employee.name} />
                    <DetailItem icon={<Mail />} label="Email" value={employee.email} />
                    <DetailItem icon={<CalendarDays />} label="DOB" value={formatDateLabel(employee.dob)} />
                    <DetailItem icon={<Users />} label="Gender" value={employee.gender} />
                    <div className="md:col-span-2">
                      <DetailItem icon={<MapPin />} label="Address" value={employee.address} />
                    </div>
                  </>
                ) : (
                  <>
                    <EditItem name="name" label="Full Name" value={form.name} onChange={handleChange} />
                    <EditItem name="dob" label="Birth Date" type="date" value={form.dob} onChange={handleChange} />
                    <EditItem name="gender" label="Gender" value={form.gender} onChange={handleChange} />
                    <div className="md:col-span-2">
                      <EditItem name="address" label="Home Address" value={form.address} onChange={handleChange} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Banking Info (Moved here to eliminate gap) */}
          <Card className="shadow-lg border-border overflow-hidden bg-card border-b-4 border-b-primary">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-lg font-black flex items-center gap-3 text-card-foreground">
                <CreditCard className="h-5 w-5 text-primary" />
                Banking Info
              </CardTitle>
              <CardDescription className="text-xs font-medium italic">Salary disbursement details</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {!isEditing ? (
                  <>
                    <DetailItem icon={<Building2 />} label="Bank Name" value={bank.bankName} />
                    <DetailItem icon={<Hash />} label="Account Number" value={bank.accountNumber} />
                    <DetailItem icon={<ShieldCheck />} label="IFSC" value={bank.ifsc} />
                    <DetailItem icon={<CreditCard />} label="PAN" value={employee.pan} />
                    <DetailItem icon={<Badge />} label="UAN" value={employee.uan} />
                  </>
                ) : (
                  <>
                    <EditItem name="bankName" label="Bank Name" value={form.bankName} onChange={handleChange} />
                    <EditItem name="bankAcc" label="Account Number" value={form.bankAcc} onChange={handleChange} />
                    <EditItem name="ifsc" label="IFSC Code" value={form.ifsc} onChange={handleChange} />
                    <EditItem name="pan" label="PAN Number" value={form.pan} onChange={handleChange} />
                    <EditItem name="uan" label="UAN Number" value={form.uan} onChange={handleChange} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Secondary Info */}
        <div className="space-y-8">
          {/* Corporate Status */}
          <Card className="shadow-sm border-border bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Employment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!isEditing ? (
                <>
                  <DetailItem icon={<Building2 />} label="Department" value={employee.department} />
                  <DetailItem icon={<Briefcase />} label="Designation" value={employee.designation} />
                </>
              ) : (
                <>
                  <EditItem name="department" label="Department" value={form.department} onChange={handleChange} />
                  <EditItem name="designation" label="Designation" value={form.designation} onChange={handleChange} />
                </>
              )}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="shadow-sm border-border bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> System Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Created At</span>
                <span className="text-xs font-bold text-foreground">{formatDateTime(employee.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Updated At</span>
                <span className="text-xs font-bold text-foreground">{formatDateTime(employee.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
          {icon && typeof icon !== "string"
            ? Object.assign({}, icon, {
              props: { ...icon.props, className: "h-3.5 w-3.5" },
            })
            : icon}
        </div>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none">
          {label}
        </span>
      </div>
      <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors pl-6.5">
        {value || "—"}
      </p>
    </div>
  );
}

function EditItem({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
        {label}
      </Label>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="h-12 border-border focus:border-primary focus:ring-primary/10 transition-all font-bold bg-background shadow-sm"
      />
    </div>
  );
}

