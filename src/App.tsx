import { Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";

import MainLayout from "./layout/MainLayout";

import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Profile from "./pages/Profile";


import { useAuth } from "./context/AuthContext";
import AdminEmployeeEdit from "./pages/Admin/AdminEmployeeEdit";
import AdminEmployeeList from "./pages/Admin/AdminEmployeeList";
import AdminTeamAssignments from "./pages/Admin/AdminTeamAssignments";
import AdminAttendance from "./pages/Attendance/AdminAttendance";
import AdminLeaveRequests from "./pages/Leave/AdminLeaveRequests";
import AdminLeaveReview from "./pages/Leave/AdminLeaveReview";
import EmployeeLeave from "./pages/Leave/EmployeeLeave";
import LeaveHistory from "./pages/Leave/LeaveHistory";
import TeamLeadLeaveRequests from "./pages/Leave/TeamLeadLeaveRequests";
import TeamLeadLeaveReview from "./pages/Leave/TeamLeadLeaveReview";
import OtherDeductions from "./pages/OtherDeductions/OtherDeductions";
import PerformanceBonus from "./pages/Performance/PerformanceBonus";
import AdminSalaryGenerate from "./pages/salary/AdminSalaryGenerate";
import AdminSalaryHistory from "./pages/salary/AdminSalaryHistory";
import CASalaryCalculation from "./pages/salary/CASalaryCalculator";
import SalaryHistory from "./pages/salary/SalaryHistory";

export default function App() {
  const { roles } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              {roles.includes("v4-admin") || roles.includes("v4-hr") ? (
                <AdminDashboard />
              ) : (
                <EmployeeDashboard />
              )}
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employees"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminEmployeeList />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/team-assignments"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminTeamAssignments />
            </MainLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/admin/employees/:employeeId"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminEmployeeEdit />
            </MainLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/admin/attendance"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminAttendance />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/performance/bonus"
        element={
          <AdminRoute>
            <MainLayout>
              <PerformanceBonus />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/performance/deductions"
        element={
          <AdminRoute>
            <MainLayout>
              <OtherDeductions />
            </MainLayout>
          </AdminRoute>
        }
      />

      {/* Employee Salary History */}
      <Route
        path="/salary/history"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SalaryHistory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin / HR Salary History */}
      <Route
        path="/admin/salary/history"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminSalaryHistory />
            </MainLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/admin/salary/generate"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminSalaryGenerate />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ca-salary-calculation"
        element={
          <AdminRoute>
            <MainLayout>
              <CASalaryCalculation />
            </MainLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <MainLayout>
              <EmployeeLeave />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave/history"
        element={
          <ProtectedRoute>
            <MainLayout>
              <LeaveHistory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/leave"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminLeaveRequests />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/leave/:leaveId"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminLeaveReview />
            </MainLayout>
          </AdminRoute>
        }
      />

      <Route
        path="/tl/leave"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TeamLeadLeaveRequests />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tl/leave/:leaveId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TeamLeadLeaveReview />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}