import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

const Login = () => {
  const { user, login, changePassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState<"request" | "confirm" | null>(null);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (user && !user.mustChangePassword) {
    return <Navigate to="/board" replace />;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("resetToken");
    if (!token) return;
    setForgotToken(token);
    setForgotMode("confirm");
  }, []);

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
      setError(err instanceof Error ? err.message : t("login.errors.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nextPassword = newPassword.trim();
    if (!currentPassword) {
      setError(t("login.errors.currentPasswordRequired"));
      return;
    }
    if (nextPassword.length < 8) {
      setError(t("login.errors.newPasswordMin"));
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError(t("login.errors.passwordMismatch"));
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
      setError(err instanceof Error ? err.message : t("login.errors.passwordChangeFailed"));
    } finally {
      setChangingPassword(false);
    }
  };

  const requestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotMessage("");
    if (!forgotUsername.trim()) {
      setError(t("login.errors.usernameRequired"));
      return;
    }
    if (!forgotEmail.trim()) {
      setError(t("login.errors.emailRequired"));
      return;
    }
    if (!isValidEmail(forgotEmail.trim())) {
      setError(t("login.errors.emailInvalid"));
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername.trim(), email: forgotEmail.trim().toLowerCase() }),
      });
      const payload = (await res.json()) as { message?: string; reset_token?: string; detail?: string };
      if (!res.ok) {
        throw new Error(payload.detail || t("login.errors.requestFailedWithStatus", { status: res.status }));
      }
      setForgotMessage(payload.message || t("login.messages.requestSuccess"));
      if (payload.reset_token) {
        setForgotToken(payload.reset_token);
      }
      setForgotMode("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errors.requestFailed"));
    } finally {
      setForgotLoading(false);
    }
  };

  const confirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotMessage("");
    const token = forgotToken.trim();
    const nextPassword = forgotNewPassword.trim();
    if (!token) {
      setError(t("login.errors.resetTokenRequired"));
      return;
    }
    if (nextPassword.length < 8) {
      setError(t("login.errors.newPasswordMin"));
      return;
    }
    if (nextPassword !== forgotConfirmPassword) {
      setError(t("login.errors.passwordMismatch"));
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: nextPassword }),
      });
      const payload = (await res.json()) as { detail?: string };
      if (!res.ok) {
        throw new Error(payload.detail || t("login.errors.resetFailedWithStatus", { status: res.status }));
      }
      setForgotMessage(t("login.messages.resetSuccess"));
      setForgotMode(null);
      setPassword("");
      setShowPassword(false);
      setForgotToken("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errors.resetFailed"));
    } finally {
      setForgotLoading(false);
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
              <h1 className="text-2xl font-semibold text-foreground">{t("login.signIn")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("login.subtitle")}
              </p>
            </div>
          </div>

          {!user?.mustChangePassword && !forgotMode ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username">{t("login.username")}</Label>
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
                <Label htmlFor="password">{t("login.password")}</Label>
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
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={remember} onCheckedChange={(value) => setRemember(Boolean(value))} />
                  <span>{t("login.rememberMe")}</span>
                </label>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setForgotMode("request");
                    setForgotMessage("");
                    setError("");
                    setForgotUsername("");
                    setForgotEmail("");
                  }}
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("login.signingIn") : t("login.signIn")}
              </Button>
              {!remember && (
                <p className="text-xs text-muted-foreground">
                  {t("login.sessionHint")}
                </p>
              )}
            </form>
          ) : !user?.mustChangePassword && forgotMode === "request" ? (
            <form onSubmit={requestPasswordReset} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("login.requestSubtitle")}
              </p>
              <div className="space-y-1">
                <Label htmlFor="forgot-username">{t("login.username")}</Label>
                <Input
                  id="forgot-username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="forgot-email">{t("login.email")}</Label>
                <Input
                  id="forgot-email"
                  type="text"
                  inputMode="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {forgotMessage && <p className="text-sm text-muted-foreground">{forgotMessage}</p>}
              <Button type="submit" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? t("login.sending") : t("login.sendResetToken")}
              </Button>
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  setForgotMode(null);
                  setForgotMessage("");
                  setError("");
                }}
              >
                {t("login.backToSignIn")}
              </Button>
            </form>
          ) : !user?.mustChangePassword && forgotMode === "confirm" ? (
            <form onSubmit={confirmPasswordReset} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("login.confirmSubtitle")}
              </p>
              <div className="space-y-1">
                <Label htmlFor="forgot-token">{t("login.resetToken")}</Label>
                <Input
                  id="forgot-token"
                  value={forgotToken}
                  onChange={(e) => setForgotToken(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="forgot-new-password">{t("login.newPassword")}</Label>
                <Input
                  id="forgot-new-password"
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="forgot-confirm-password">{t("login.confirmNewPassword")}</Label>
                <Input
                  id="forgot-confirm-password"
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {forgotMessage && <p className="text-sm text-muted-foreground">{forgotMessage}</p>}
              <Button type="submit" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? t("login.resetting") : t("login.resetPassword")}
              </Button>
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  setForgotMode(null);
                  setForgotMessage("");
                  setError("");
                }}
              >
                {t("login.backToSignIn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={onChangePassword} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("login.mustChangeSubtitle")}
              </p>
              <div className="space-y-1">
                <Label htmlFor="current-password">{t("login.currentPassword")}</Label>
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
                <Label htmlFor="new-password">{t("login.newPassword")}</Label>
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
                <Label htmlFor="confirm-password">{t("login.confirmPassword")}</Label>
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
                {changingPassword ? t("login.updating") : t("login.updatePassword")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
