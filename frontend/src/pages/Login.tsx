import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

const Login = () => {
  const { user, login, changePassword } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && !user.mustChangePassword) {
    return <Navigate to="/board" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      const stored = localStorage.getItem("labsync-auth");
      if (stored) {
        const parsed = JSON.parse(stored) as { mustChangePassword?: boolean };
        if (parsed.mustChangePassword) {
          setCurrentPassword(password);
          return;
        }
      }
      navigate("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nextPassword = newPassword.trim();
    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (nextPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-36 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-border/60 rounded-2xl bg-card/95 backdrop-blur-sm p-6 shadow-lg space-y-5">
          <div className="space-y-4">
            <img src="/tatneft.png" alt="Tatneft" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to continue.
              </p>
            </div>
          </div>

          {!user?.mustChangePassword ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={remember} onCheckedChange={(value) => setRemember(Boolean(value))} />
                  <span>Remember me</span>
                </label>
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              {!remember && (
                <p className="text-xs text-muted-foreground">
                  Session will end when you sign out or clear browser data.
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={onChangePassword} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You must set a new password before continuing.
              </p>
              <div className="space-y-1">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
