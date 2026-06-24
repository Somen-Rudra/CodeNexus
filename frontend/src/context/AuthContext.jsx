import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API } from "../config/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Single helper that tries /auth/me, and if the access token is expired
  // attempts one silent refresh before giving up. Never redirects — that's
  // App.jsx's job via the user === null branch.
  const restoreSession = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      if (err.response?.status === 401) {
        // Access token expired — try a silent refresh once
        try {
          await API.post("/auth/refresh");
          const res = await API.get("/auth/me");
          setUser(res.data.user);
        } catch {
          // Refresh token also gone (logged out, expired, revoked)
          // Just clear the user — App.jsx will render the public routes
          setUser(null);
        }
      } else {
        // Network error or 5xx — don't log the user out, leave user as null
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const register = async (name, email, password) => {
    const res = await API.post("/auth/register", { name, email, password });
    return res.data;
  };

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await API.post("/auth/verify", { email, otp });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      // Even if the backend call fails (e.g. token already invalid),
      // clear the user locally so the UI goes to the login screen
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);