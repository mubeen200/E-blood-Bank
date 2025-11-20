import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "@/api/axiosClient";

type Role = "ADMIN" | "DONOR" | "RECIPIENT";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bloodType?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, check if we already have a session via cookie
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data?.user) {
          setUser(res.data.user);
        }
      } catch {
        // ignore – not logged in
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/"; // full reset
  };

  const value: AuthContextValue = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
