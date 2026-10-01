import React from 'react';
import { Clock, CheckCircle2, XCircle, Ban, Truck, MapPin, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status, deliveryStatus, demand, onClick }) {
  const dStatus = deliveryStatus || demand?.delivery_status;
  const mainStatus = status || demand?.status;

  const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs transition-all";
  const clickClasses = onClick ? " cursor-pointer hover:scale-105 hover:shadow-md" : "";

  // Real-time Logistics Movement Status Priority
  if (dStatus === 'DELIVERED' || mainStatus === 'DELIVERED' || mainStatus === 'FULFILLED') {
    return (
      <span onClick={onClick} className={`${baseClasses} ${clickClasses} font-black bg-emerald-50 text-emerald-800 border border-emerald-200`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Delivered
      </span>
    );
  }

  if (dStatus === 'REJECTED') {
    return (
      <span onClick={onClick} className={`${baseClasses} ${clickClasses} font-black bg-rose-50 text-rose-800 border border-rose-200`}>
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Delivery Rejected
      </span>
    );
  }

  if (dStatus === 'ARRIVED') {
    return (
      <span onClick={onClick} className={`${baseClasses} ${clickClasses} font-black bg-indigo-50 text-indigo-800 border border-indigo-200 animate-bounce`}>
        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
        At Gate
      </span>
    );
  }

  if (dStatus === 'OUT_FOR_DELIVERY' || mainStatus === 'OUT_FOR_DELIVERY') {
    return (
      <span onClick={onClick} className={`${baseClasses} ${clickClasses} font-black bg-blue-50 text-blue-800 border border-blue-200 animate-pulse`}>
        <Truck className="w-3.5 h-3.5 text-blue-600" />
        In Transit
      </span>
    );
  }

  switch (mainStatus) {
    case 'PENDING':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-amber-500/10 text-amber-600 border border-amber-500/20`}>
          <Clock className="w-3.5 h-3.5" />
          Pending Review
        </span>
      );
    case 'APPROVED':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-blue-500/10 text-blue-600 border border-blue-500/20`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-rose-500/10 text-rose-600 border border-rose-500/20`}>
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    case 'ACCEPTED':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-indigo-500/10 text-indigo-600 border border-indigo-500/20`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Accepted
        </span>
      );
    case 'PREPARING':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-emerald-500/10 text-emerald-600 border border-emerald-500/20`}>
          <Clock className="w-3.5 h-3.5" />
          Preparing
        </span>
      );
    case 'READY_FOR_DISPATCH':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} font-black bg-amber-50 text-amber-800 border border-amber-200`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Ready for Dispatch
        </span>
      );
    case 'CANCELLED':
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-slate-500/10 text-slate-500 border border-slate-500/20`}>
          <Ban className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    default:
      return (
        <span onClick={onClick} className={`${baseClasses} ${clickClasses} bg-slate-100 text-slate-700`}>
          {mainStatus}
        </span>
      );
  }
}
