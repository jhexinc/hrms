import { useState } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const DEPARTMENTS = [
  "HR",
  "Sales - Visnagar",
  "Sales - Ahmedabad",
  "Sales - Pune",
  "Marketing",
  "Technical",
  "Admin",
  "Utility",
  "Lead Generation",
  "Onboarding",
  "Accounts",
  "Customer Service Representative",
  "CV Expert",
] as const;

const GENDERS = ["Male", "Female", "Other"] as const;

export default function Register() {
  const { setEmployee } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    mobile: "+91",
    dob: "",
    gender: "",
    address: "",
    pan: "",
    department: "",
    designation: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    // Clear field error when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  /* ===========================
     FIELD VALIDATIONS
  =========================== */
  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2)
          return "Name must be at least 2 characters";
        return null;

      case "mobile":
        if (!value) return "Mobile number is required";
        if (!/^\+91\d{10}$/.test(value))
          return "Mobile must be +91 followed by 10 digits";
        return null;

      case "dob":
        if (!value) return "Date of birth is required";
        // Additional date validation
        const dobDate = new Date(value);
        const today = new Date();
        if (dobDate >= today) return "Date of birth must be in the past";
        return null;

      case "gender":
        if (!value) return "Please select gender";
        return null;

      case "address":
        if (!value.trim()) return "Address is required";
        if (value.trim().length < 10)
          return "Address must be at least 10 characters";
        return null;



      case "pan":
        if (!value.trim()) return "PAN is required";
        if (!/^[A-Z0-9]{10}$/i.test(value))
          return "PAN must be exactly 10 characters";
        return null;

      case "department":
        if (!value) return "Please select department";
        return null;

      case "designation":
        if (!value.trim()) return "Designation is required";
        if (value.trim().length < 2)
          return "Designation must be at least 2 characters";
        return null;

      default:
        return null;
    }
  };

  /* ===========================
     VALIDATE ALL FIELDS
  =========================== */
  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate each field
    Object.entries(form).forEach(([key, value]) => {
      const error = validateField(key, value as string);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  /* ===========================
     ORIGINAL VALIDATION (KEPT AS IS)
  =========================== */
  const validate = (): string | null => {
    if (!form.name) return "Name is required";

    if (!/^\+91\d{10}$/.test(form.mobile))
      return "Mobile number must be +91 followed by 10 digits";

    if (!form.dob) return "Date of birth is required";

    if (!form.gender) return "Please select gender";

    if (!form.department) return "Please select department";

    if (!/^[A-Z0-9]{10}$/i.test(form.pan))
      return "PAN must be exactly 10 characters";

    return null;
  };

  /* ===========================
     SUBMIT
  =========================== */
  const handleSubmit = async () => {
    // First validate all fields (frontend validation)
    if (!validateAllFields()) {
      setError("Please fix all errors before submitting");
      return;
    }

    // Then run the original validation
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.post("/profile/register", {
        ...form,
      });

      const res = await api.get("/profile/me");
      setEmployee(res.data);

      navigate("/");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="/image.png"
          alt="HRMS Logo"
          className="h-16 w-16 object-contain mb-4"
        />
        <h1 className="text-3xl font-bold text-emerald-900 tracking-tight">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xs">
          Welcome to HRMS. Please provide your professional details to get started.
        </p>
      </div>

      <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-emerald-800">
        <CardHeader className="border-b bg-white/50">
          <CardTitle className="text-xl text-emerald-950">Employee Information</CardTitle>
          <p className="text-xs text-muted-foreground">
            All fields marked with an asterisk (<span className="text-destructive">*</span>) are mandatory.
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          {/* SECTION: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NAME */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="John Doe"
                  className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                />
                {fieldErrors.name && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.name}</p>
                )}
              </div>

              {/* MOBILE */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Mobile Number *</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  className={fieldErrors.mobile ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                />
                {fieldErrors.mobile && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.mobile}</p>
                )}
              </div>

              {/* DOB */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Date of Birth *</Label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => update("dob", e.target.value)}
                  className={fieldErrors.dob ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                />
                {fieldErrors.dob && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.dob}</p>
                )}
              </div>

              {/* GENDER */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Gender *</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => update("gender", v)}
                >
                  <SelectTrigger
                    className={fieldErrors.gender ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.gender && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.gender}</p>
                )}
              </div>
            </div>

            {/* ADDRESS */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-tight">Residential Address *</Label>
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Unit No, Building, Area, City, PIN"
                className={fieldErrors.address ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
              />
              {fieldErrors.address && (
                <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.address}</p>
              )}
            </div>
          </div>

          {/* SECTION: Professional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">
              Professional Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DEPARTMENT */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Department *</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => update("department", v)}
                >
                  <SelectTrigger
                    className={fieldErrors.department ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.department && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.department}</p>
                )}
              </div>

              {/* DESIGNATION */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">Designation *</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g. Senior Associate"
                  className={fieldErrors.designation ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                />
                {fieldErrors.designation && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.designation}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">
              Financial Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PAN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-tight">PAN Card Number *</Label>
                <Input
                  value={form.pan}
                  onChange={(e) => update("pan", e.target.value.toUpperCase())}
                  placeholder="10-character alphanumeric"
                  className={fieldErrors.pan ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-700"}
                />
                {fieldErrors.pan && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{fieldErrors.pan}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Bank account details will be managed by HR after registration.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive font-medium text-center">
                {error}
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-emerald-800 hover:bg-emerald-900 h-11 text-base font-semibold transition-all shadow-md active:scale-[0.98]"
            >
              {loading ? "Registering Employee..." : "Finalize Registration"}
            </Button>
            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest">
              Secured by HRMS v4 Protocol
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
