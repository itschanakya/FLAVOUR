import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { getItemPhoto, formatExpiryDate } from '../pages/ManageCatalog';

export default function StandardPacketViewer({ defaultOpen = false, className = '' }) {
  const { token } = useAuth();
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (token) {
      fetchPacket();
    }
  }, [token]);

  const fetchPacket = async () => {
    try {
      const res = await fetch('/api/packets/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPacket(data);
      }
    } catch (err) {
      console.error('Fetch packet error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !packet || !packet.items || packet.items.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 rounded-2xl border border-amber-200/90 shadow-xs overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                Standard Refreshment Packet
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                ₹{packet.grand_total?.toFixed(2)} (Incl. 5% GST)
              </span>
              <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">
                • {packet.items.length} Refreshment Items Included
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Approved per-cadet refreshment allocation with verified batch expiry dates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-800 hidden md:inline">
            {isOpen ? 'Collapse Details' : 'View Packet Items & Expiry'}
          </span>
          <div className="p-1 rounded-lg bg-white border border-amber-200 text-amber-700">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Items & Expiry Details */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-amber-200/60 space-y-3 bg-white/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {packet.items.map((it, idx) => {
              const isExpired = it.is_expired;
              const photo = getItemPhoto(it.item_name, it.image_url);
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-2xs ${
                    isExpired
                      ? 'bg-rose-50/80 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={photo}
                      alt={it.item_name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/items/samosa.jpg';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {it.item_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span>Qty: <strong className="text-slate-800">{it.quantity}</strong></span>
                        <span>•</span>
                        <span>₹{it.unit_price} / {it.unit_of_measure}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-emerald-700">
                      ₹{it.line_total?.toFixed(2)}
                    </div>
                    {it.expiry_date ? (
                      <div
                        className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 ${
                          isExpired
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Calendar className="w-2.5 h-2.5" />
                        <span>Exp: {formatExpiryDate(it.expiry_date)}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 italic">No expiry</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget Breakdown Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-semibold text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3">
              <span>Base Subtotal: <strong className="text-slate-900">₹{packet.subtotal}</strong></span>
              <span>•</span>
              <span>GST @ 5%: <strong className="text-slate-900">₹{packet.gst_amount}</strong></span>
              <span>•</span>
              <span className="text-amber-950 font-black">Grand Total: ₹{packet.grand_total} / Cadet</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Government Sanctioned Quality & Expiry Compliant</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
