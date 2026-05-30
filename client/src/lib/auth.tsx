import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // Placeholder — Supabase Auth will be wired in later.
  signIn: () => void;
  signOut: () => void;
  setDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STUB_USER: AuthUser = { id: "user-demo", displayName: "Athlete" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(STUB_USER);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    signIn: () => setUser(STUB_USER),
    signOut: () => setUser(null),
    setDisplayName: (name: string) => setUser((u) => (u ? { ...u, displayName: name } : u)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
