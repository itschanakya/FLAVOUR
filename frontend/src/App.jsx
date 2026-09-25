import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SSEProvider } from './context/SSEContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RaiseDemandPage from './pages/RaiseDemandPage';
import MyDemandsList from './pages/MyDemandsList';
import ReviewDemandsQueue from './pages/ReviewDemandsQueue';
import ManageInstitutions from './pages/ManageInstitutions';
import ManageUnits from './pages/ManageUnits';
import ManageCatalog from './pages/ManageCatalog';
import InventoryPage from './pages/InventoryPage';
import ApprovedDemandsView from './pages/ApprovedDemandsView';
import RefreshmentReports from './pages/RefreshmentReports';
import AppSettings from './pages/AppSettings';
import SummaryWeeklyMonthly from './pages/SummaryWeeklyMonthly';
import SchoolAnnualSummary from './pages/SchoolAnnualSummary';
import BillSubmission from './pages/BillSubmission';
import BillCollection from './pages/BillCollection';
import DeliveryManagement from './pages/DeliveryManagement';
import DocumentationPage from './pages/DocumentationPage';
import DriverDeliverySummaryPage from './pages/DriverDeliverySummaryPage';
import UnitDemandPage from './pages/UnitDemandPage';
import AdminDeliveryTracking from './pages/AdminDeliveryTracking';
function SummaryRouter() {
  const { user } = useAuth();
  if (user?.role === 'DELIVERY') {
    return <DriverDeliverySummaryPage />;
  }
  return <SummaryWeeklyMonthly />;
}

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Authenticating user session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SSEProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/raise-demand" element={<ProtectedRoute allowedRoles={['INSTITUTION']}><RaiseDemandPage /></ProtectedRoute>} />
                <Route path="/unit-demand" element={<ProtectedRoute allowedRoles={['UNIT']}><UnitDemandPage /></ProtectedRoute>} />
                <Route path="/my-demands" element={<ProtectedRoute><MyDemandsList /></ProtectedRoute>} />
                <Route path="/demand-history" element={<ProtectedRoute><MyDemandsList /></ProtectedRoute>} />
                <Route path="/review-demands" element={<ProtectedRoute allowedRoles={['UNIT']}><ReviewDemandsQueue /></ProtectedRoute>} />
                <Route path="/institutions" element={<ProtectedRoute><ManageInstitutions /></ProtectedRoute>} />
                <Route path="/units" element={<Navigate to="/settings?tab=units" replace />} />
                <Route path="/catalog" element={<Navigate to="/settings?tab=inventory" replace />} />
                <Route path="/inventory" element={<Navigate to="/settings?tab=inventory" replace />} />
                <Route path="/stock" element={<ProtectedRoute allowedRoles={['ADMIN']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/approved-demands" element={<ProtectedRoute><ApprovedDemandsView /></ProtectedRoute>} />
                <Route path="/delivery" element={<ProtectedRoute><DeliveryManagement /></ProtectedRoute>} />
                <Route path="/admin/delivery-tracking" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDeliveryTracking /></ProtectedRoute>} />
                <Route path="/documentation" element={<ProtectedRoute><DocumentationPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><RefreshmentReports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppSettings /></ProtectedRoute>} />
                <Route path="/summary" element={<ProtectedRoute><SummaryRouter /></ProtectedRoute>} />
                <Route path="/driver-summary" element={<ProtectedRoute><DriverDeliverySummaryPage /></ProtectedRoute>} />
                <Route path="/school-summary" element={<ProtectedRoute><SchoolAnnualSummary /></ProtectedRoute>} />
                <Route path="/bills" element={<ProtectedRoute><BillSubmission /></ProtectedRoute>} />
                <Route path="/bill-collection" element={<ProtectedRoute><BillCollection /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </SSEProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
