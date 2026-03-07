import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, createContext, useContext, useState } from "react";

const SESSION_KEY = "hw_admin";
const ROLE_KEY = "hw_role";
// This key is read by useActor.ts via getSecretParameter("caffeineAdminToken")
const ACTOR_TOKEN_KEY = "caffeineAdminToken";

export type UserRole = "admin" | "user" | null;

interface AdminContextType {
  isAdmin: boolean;
  isLoggedIn: boolean;
  role: UserRole;
  login: (role: "admin" | "user", token: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isLoggedIn: false,
  role: null,
  login: () => {},
  logout: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
  });

  const login = (newRole: "admin" | "user", token: string) => {
    // Store token in sessionStorage so useActor picks it up via getSecretParameter
    sessionStorage.setItem(ACTOR_TOKEN_KEY, token);
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(ROLE_KEY, newRole);
    setRole(newRole);
  };

  const logout = () => {
    sessionStorage.removeItem(ACTOR_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROLE_KEY);
    setRole(null);
  };

  const isAdmin = role === "admin";
  const isLoggedIn = role !== null;

  return (
    <AdminContext.Provider value={{ isAdmin, isLoggedIn, role, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
