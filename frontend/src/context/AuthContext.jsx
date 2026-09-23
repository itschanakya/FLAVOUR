import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ncc_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(sessionStorage.getItem('ncc_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Validate session with backend
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
            try {
              sessionStorage.setItem('ncc_user', JSON.stringify(data.user));
            } catch (e) {}
          }
        })
        .catch(err => {
          console.warn('Session verification error (logout suppressed):', err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password, expectedRole) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole })
      });
    } catch (networkErr) {
      throw new Error('Unable to connect to the backend server. Please ensure the backend is running.');
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error(`Server returned unexpected response (${res.status} ${res.statusText}).`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (data.requires_otp) {
      return data;
    }

    sessionStorage.setItem('ncc_token', data.token);
    try {
      sessionStorage.setItem('ncc_user', JSON.stringify(data.user));
    } catch (e) {}
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const verifyOtp = async (login_id, otp) => {
    let res;
    try {
      res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id, otp })
      });
    } catch (networkErr) {
      throw new Error('Unable to connect to the backend server.');
    }
    
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error(`Server returned unexpected response (${res.status} ${res.statusText}).`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'OTP Verification failed');
    }

    sessionStorage.setItem('ncc_token', data.token);
    try {
      sessionStorage.setItem('ncc_user', JSON.stringify(data.user));
    } catch (e) {}
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // Demo Quick Switcher Helper
  const loginAsDemoRole = async (roleType) => {
    let credentials = { email: 'ADMIN', password: 'Admin@123' };
    if (roleType === 'UNIT') {
      // 2 Delhi Arty Bty NCC
      credentials = { email: '2DABNCC', password: 'Unit@123' };
    } else if (roleType === 'INSTITUTION') {
      // APS Shankar Vihar
      credentials = { email: 'APS_SV', password: 'Inst@123' };
    } else if (roleType === 'DELIVERY') {
      credentials = { email: '9876543210', password: 'Driver@123' };
    }
    return login(credentials.email, credentials.password, roleType);
  };

  const logout = () => {
    sessionStorage.removeItem('ncc_token');
    sessionStorage.removeItem('ncc_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verifyOtp, loginAsDemoRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
