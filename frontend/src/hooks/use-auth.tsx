import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Role } from "@/types/kanban";

interface AuthUser {
  token: string;
  role: Role;
  roles: Role[];
  fullName: string;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "labsync-auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function apiLogin(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return (await res.json()) as { token: string; role: Role; roles?: Role[]; full_name: string; must_change_password?: boolean };
}

async function apiChangePassword(token: string, currentPassword: string, newPassword: string) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    let message = "";
    try {
      const payload = (await res.json()) as { detail?: string };
      message = payload.detail || "";
    } catch {
      message = await res.text();
    }
    throw new Error(message || `Password change failed: ${res.status}`);
  }
  return (await res.json()) as { token: string; role: Role; roles?: Role[]; full_name: string; must_change_password?: boolean };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser({ ...parsed, roles: parsed.roles ?? [parsed.role], mustChangePassword: Boolean((parsed as any).mustChangePassword) });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    const authUser: AuthUser = {
      token: data.token,
      role: data.role,
      roles: data.roles ?? [data.role],
      fullName: data.full_name,
      mustChangePassword: Boolean(data.must_change_password),
    };
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error("Not authenticated");
    const data = await apiChangePassword(user.token, currentPassword, newPassword);
    const authUser: AuthUser = {
      token: data.token,
      role: data.role,
      roles: data.roles ?? [data.role],
      fullName: data.full_name,
      mustChangePassword: Boolean(data.must_change_password),
    };
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, login, changePassword, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
