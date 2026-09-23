import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * CustomDateInput: Enforces DD/MM/YYYY format with keyboard typing and native calendar picker.
 *
 * @param {string} value - Date string in ISO format (YYYY-MM-DD)
 * @param {function} onChange - Callback receiving ISO format (YYYY-MM-DD)
 * @param {string} className - Additional CSS classes
 * @param {boolean} required - Form validation flag
 * @param {string} id - HTML ID
 */
export default function CustomDateInput({
  value = '',
  onChange,
  className = '',
  required = false,
  id,
  compact = false
}) {
  const hiddenDateRef = useRef(null);

  // Convert YYYY-MM-DD to DD/MM/YYYY
  const isoToDDMMYYYY = (isoStr) => {
    if (!isoStr || typeof isoStr !== 'string') return '';
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(isoStr)) {
      return isoStr.replace(/-/g, '/');
    }
    const parts = isoStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return isoStr;
  };

  // Convert DD/MM/YYYY (or DD-MM-YYYY or DDMMYYYY) to YYYY-MM-DD
  const ddmmyyyyToIso = (str) => {
    if (!str) return '';
    const clean = str.replace(/[^\d]/g, '');
    if (clean.length === 8) {
      const day = clean.slice(0, 2);
      const month = clean.slice(2, 4);
      const year = clean.slice(4, 8);
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return null;
  };

  const [displayText, setDisplayText] = useState(() => isoToDDMMYYYY(value));

  useEffect(() => {
    setDisplayText(isoToDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (e) => {
    let raw = e.target.value;
    // Allow user to delete
    if (raw.length < displayText.length) {
      setDisplayText(raw);
      return;
    }

    // Strip non-digits
    const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }

    setDisplayText(formatted);

    if (digits.length === 8) {
      const iso = ddmmyyyyToIso(formatted);
      if (iso && onChange) {
        onChange(iso);
      }
    }
  };

  const handleBlur = () => {
    // If not full date, reset back to valid value
    if (displayText.length > 0 && displayText.length < 10) {
      setDisplayText(isoToDDMMYYYY(value));
    }
  };

  const openCalendar = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  return (
    <div className={`relative group w-full ${compact ? 'min-w-[110px]' : ''}`}>
      {/* Left Calendar Icon (hidden in compact table mode) */}
      {!compact && (
        <Calendar
          onClick={openCalendar}
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors cursor-pointer"
        />
      )}

      {/* Visible Input formatted strictly as DD/MM/YYYY */}
      <input
        id={id}
        type="text"
        required={required}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        className={compact 
          ? `w-full bg-slate-50 border border-slate-200 rounded-lg px-2 pr-7 py-1 text-xs text-slate-800 font-semibold text-center outline-none focus:border-blue-500 focus:bg-white transition-all tracking-normal ${className}`
          : `w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-800 tracking-wider focus:outline-none focus:border-indigo-500 transition-all hover:border-slate-200 ${className}`
        }
      />

      {/* Right Calendar Picker Trigger Button */}
      <button
        type="button"
        onClick={openCalendar}
        className={compact 
          ? "absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
          : "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
        }
        title="Open Calendar Picker"
      >
        <Calendar className={compact ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} />
      </button>

      {/* Hidden Native Date Input for Picker GUI */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value || ''}
        onChange={(e) => {
          if (e.target.value) {
            setDisplayText(isoToDDMMYYYY(e.target.value));
            if (onChange) onChange(e.target.value);
          }
        }}
        className="sr-only pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
