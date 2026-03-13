import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import CitizenMap from './pages/public/CitizenMap';

// Admin Layout and Pages
import AdminLayout from './layouts/AdminLayout';
import Overview from './pages/admin/Overview';
import Offices from './pages/admin/Offices';
import Industries from './pages/admin/Industries';
import AICopilot from './pages/admin/AICopilot';
import UserManagement from './pages/admin/UserManagement';
import PolicyLimits from './pages/admin/PolicyLimits';

// RO Layout and Pages
import ROLayout from './layouts/ROLayout';
import ROOverview from './pages/ro/ROOverview';
import ROLocations from './pages/ro/ROLocations';
import LogsView from './pages/ro/LogsView';
import ROTeam from './pages/ro/ROTeam';
import ROForecast from './pages/ro/ROForecast';

import IndustryLayout from './layouts/IndustryLayout';
import IndustryOverview from './pages/industry/IndustryOverview';
import IndustryLogs from './pages/industry/IndustryLogs';
import IndustryAlerts from './pages/industry/IndustryAlerts';

// Placeholder components for other dashboards
const MonitoringDashboard = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Monitoring Dashboard</h1></div>;
const PublicPortal = () => <div className="p-8 text-white min-h-screen bg-[#0b1114]"><h1>Public Portal (Citizens)</h1></div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/public-portal" element={<CitizenMap />} />

          {/* Protected Routes configured with their respective roles. */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<Overview />} />
              <Route path="/admin-dashboard/offices" element={<Offices />} />
              <Route path="/admin-dashboard/industries" element={<Industries />} />
              <Route path="/admin-dashboard/copilot" element={<AICopilot />} />
              {/* Placeholders for others */}
              <Route path="/admin-dashboard/policy" element={<PolicyLimits />} />
              <Route path="/admin-dashboard/policy" element={<PolicyLimits />} />
              <Route path="/admin-dashboard/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ro', 'super_admin']} />}>
            <Route element={<ROLayout />}>
              <Route path="/ro-dashboard" element={<ROOverview />} />
              <Route path="/ro-dashboard/locations" element={<ROLocations />} />
              <Route path="/ro-dashboard/logs" element={<LogsView />} />
              <Route path="/ro-dashboard/team" element={<ROTeam />} />
              <Route path="/ro-dashboard/forecast" element={<ROForecast />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['monitoring_team', 'super_admin']} />}>
            <Route path="/monitoring-dashboard" element={<MonitoringDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['industry']} />}>
            <Route element={<IndustryLayout />}>
              <Route path="/industry" element={<IndustryOverview />} />
              <Route path="/industry/logs" element={<IndustryLogs />} />
              <Route path="/industry/analytics" element={<IndustryAlerts />} />
              <Route path="/industry/settings" element={<div className="p-8 text-white">Settings Portal</div>} />
            </Route>
          </Route>

          {/* Catch all unhandled routes back to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
