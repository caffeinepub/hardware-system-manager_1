import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, createContext, useContext, useState } from "react";

const SESSION_KEY = "hw_admin";
const ROLE_KEY = "hw_role";
const EMAIL_KEY = "hw_user_email";
const TOKEN_KEY = "hw_actor_token";
// This key is read by useActor.ts via getSecretParameter("caffeineAdminToken")
const ACTOR_TOKEN_KEY = "caffeineAdminToken";

export type UserRole = "admin" | "user" | null;

interface AdminContextType {
  isAdmin: boolean;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  role: UserRole;
  userEmail: string | null;
  login: (role: "admin" | "user", token: string, email?: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isLoggedIn: false,
  isAuthorized: false,
  role: null,
  userEmail: null,
  login: () => {},
  logout: () => {},
});

// Authorized user credentials
const AUTHORIZED_EMAIL = "anandsreedharamhome@gmail.com";
// Special marker for ICP Internet Identity logins
export const ICP_IDENTITY_MARKER = "icp-identity-authorized";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    // Restore sessionStorage token from localStorage on page load so useActor always has it
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      sessionStorage.setItem(ACTOR_TOKEN_KEY, savedToken);
    }
    return (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
  });

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem(EMAIL_KEY) ?? null;
  });

  const login = (newRole: "admin" | "user", token: string, email?: string) => {
    // Store token in both sessionStorage (for useActor) and localStorage (for persistence across reloads)
    sessionStorage.setItem(ACTOR_TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(ROLE_KEY, newRole);
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
      setUserEmail(email);
    }
    setRole(newRole);
  };

  const logout = () => {
    sessionStorage.removeItem(ACTOR_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setRole(null);
    setUserEmail(null);
  };

  const isAdmin = role === "admin";
  const isLoggedIn = role !== null;
  // Authorized = logged in as the specific authorized user (email or ICP identity)
  const isAuthorized =
    isAdmin ||
    (role === "user" && userEmail === AUTHORIZED_EMAIL) ||
    (role === "user" && userEmail === ICP_IDENTITY_MARKER);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isLoggedIn,
        isAuthorized,
        role,
        userEmail,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
