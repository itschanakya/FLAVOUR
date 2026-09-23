import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import UnitDashboard from './UnitDashboard';
import InstitutionDashboard from './InstitutionDashboard';
import DeliveryDashboard from './DeliveryDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (user?.role === 'UNIT') {
    return <UnitDashboard />;
  }

  if (user?.role === 'DELIVERY') {
    return <DeliveryDashboard />;
  }

  return <InstitutionDashboard />;
}

