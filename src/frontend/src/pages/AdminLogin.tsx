import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "../contexts/AdminContext";

const ADMIN_PASSKEY = "Kpsckkdadmin";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAdmin, login } = useAdmin();
  const [passkey, setPasskey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [navigating, setNavigating] = useState(false);

  // If already admin, redirect to dashboard
  useEffect(() => {
    if (isAdmin) {
      void navigate({ to: "/" });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (passkey === ADMIN_PASSKEY) {
      setNavigating(true);
      login("admin", ADMIN_PASSKEY);
      toast.success("Welcome, Admin!");
      await navigate({ to: "/" });
    } else {
      setErrorMsg("Incorrect passkey. Please try again.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-[calc(100vh-8rem)]"
      data-ocid="admin.section"
    >
      <div className="w-full max-w-md">
        {/* Decorative header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Admin Login
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your admin passkey to access the admin panel
          </p>
        </div>

        <Card className="shadow-section border-border" data-ocid="admin.card">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Authentication
            </CardTitle>
            <CardDescription>
              Enter your secure passkey to authenticate as administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" data-ocid="admin.error_state">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="passkey">Admin Passkey</Label>
                <Input
                  id="passkey"
                  type="password"
                  placeholder="Enter admin passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  autoComplete="current-password"
                  disabled={navigating}
                  data-ocid="admin.passkey.input"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={navigating || !passkey}
                data-ocid="admin.primary_button"
              >
                {navigating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {navigating ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Keep your passkey secure. <br className="hidden sm:block" />
          Admin access grants full data management privileges.
        </p>
      </div>
    </div>
  );
}
