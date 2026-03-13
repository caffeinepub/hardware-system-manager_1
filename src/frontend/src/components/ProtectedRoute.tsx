import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";

export function ProtectedRoute() {
  const { isLoggedIn } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      void navigate({ to: "/login" });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;
  return <Outlet />;
}
