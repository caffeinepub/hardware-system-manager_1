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
import { AlertCircle, KeyRound, Loader2, LogIn, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "../contexts/AdminContext";

const USER_PASSKEY = "Mainuser123";

export default function UserLogin() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAdmin();
  const [passkey, setPasskey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      void navigate({ to: "/" });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (passkey === USER_PASSKEY) {
      setNavigating(true);
      login("user", USER_PASSKEY);
      toast.success("Welcome!");
      await navigate({ to: "/" });
    } else {
      setErrorMsg("Incorrect passkey. Please try again.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-[calc(100vh-8rem)]"
      data-ocid="userlogin.section"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <User className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            User Login
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your passkey to access the system
          </p>
        </div>

        <Card
          className="shadow-section border-border"
          data-ocid="userlogin.card"
        >
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Authentication
            </CardTitle>
            <CardDescription>
              Enter your passkey to log in as a user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" data-ocid="userlogin.error_state">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="user-passkey">Passkey</Label>
                <Input
                  id="user-passkey"
                  type="password"
                  placeholder="Enter your passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  autoComplete="current-password"
                  disabled={navigating}
                  data-ocid="userlogin.input"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={navigating || !passkey}
                data-ocid="userlogin.primary_button"
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
          Keep your passkey secure and do not share it.
        </p>
      </div>
    </div>
  );
}
