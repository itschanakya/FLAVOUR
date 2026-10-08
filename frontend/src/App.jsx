import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SSEProvider } from './context/SSEContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const RaiseDemandPage = React.lazy(() => import('./pages/RaiseDemandPage'));
const MyDemandsList = React.lazy(() => import('./pages/MyDemandsList'));
const ReviewDemandsQueue = React.lazy(() => import('./pages/ReviewDemandsQueue'));
const ManageInstitutions = React.lazy(() => import('./pages/ManageInstitutions'));
const ManageUnits = React.lazy(() => import('./pages/ManageUnits'));
const ManageCatalog = React.lazy(() => import('./pages/ManageCatalog'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const ApprovedDemandsView = React.lazy(() => import('./pages/ApprovedDemandsView'));
const RefreshmentReports = React.lazy(() => import('./pages/RefreshmentReports'));
const AppSettings = React.lazy(() => import('./pages/AppSettings'));
const SummaryWeeklyMonthly = React.lazy(() => import('./pages/SummaryWeeklyMonthly'));
const SchoolAnnualSummary = React.lazy(() => import('./pages/SchoolAnnualSummary'));
const BillSubmission = React.lazy(() => import('./pages/BillSubmission'));
const BillCollection = React.lazy(() => import('./pages/BillCollection'));
const DeliveryManagement = React.lazy(() => import('./pages/DeliveryManagement'));
const DocumentationPage = React.lazy(() => import('./pages/DocumentationPage'));
const DriverDeliverySummaryPage = React.lazy(() => import('./pages/DriverDeliverySummaryPage'));
const UnitDemandPage = React.lazy(() => import('./pages/UnitDemandPage'));
const AdminDeliveryTracking = React.lazy(() => import('./pages/AdminDeliveryTracking'));
const AdminDemandsPage = React.lazy(() => import('./pages/AdminDemandsPage'));
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
              <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">Loading modules...</div>}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />

                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/demands" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDemandsPage /></ProtectedRoute>} />
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
              </React.Suspense>
            </BrowserRouter>
          </SSEProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
