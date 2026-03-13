import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// Admin Layout and Pages
import AdminLayout from './layouts/AdminLayout';
import Overview from './pages/admin/Overview';
import Offices from './pages/admin/Offices';
import Industries from './pages/admin/Industries';
import AICopilot from './pages/admin/AICopilot';
import UserManagement from './pages/admin/UserManagement';
import PolicyLimits from './pages/admin/PolicyLimits';

// Placeholder components
// const RODashboard = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Regional Officer Dashboard</h1></div>;
import RODashboard from './pages/RODashboard';

// Placeholder components
const AdminDashboard = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Super Admin Dashboard</h1></div>;
const MonitoringDashboard = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Monitoring Dashboard</h1></div>;
const IndustryDashboard = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Industry Dashboard</h1></div>;
const PublicPortal = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Public Portal (Citizens)</h1></div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default redirect to admin dashboard */}
          <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/public-portal" element={<PublicPortal />} />

          {/* Protected Routes configured with their respective roles. */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<Overview />} />
              <Route path="/admin-dashboard/offices" element={<Offices />} />
              <Route path="/admin-dashboard/industries" element={<Industries />} />
              <Route path="/admin-dashboard/copilot" element={<AICopilot />} />
              {/* Placeholders for others */}
              <Route path="/admin-dashboard/policy" element={<PolicyLimits />} />
              <Route path="/admin-dashboard/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ro', 'super_admin']} />}>
            <Route path="/ro-dashboard" element={<RODashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['monitoring_team', 'super_admin']} />}>
            <Route path="/monitoring-dashboard" element={<MonitoringDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['industry']} />}>
            <Route path="/industry-dashboard" element={<IndustryDashboard />} />
          </Route>

          {/* Catch all unhandled routes back to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
