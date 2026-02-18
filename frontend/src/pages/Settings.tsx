import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BackToTopButton } from "@/components/layout/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n";

type HealthStatus = "idle" | "checking" | "ok" | "error";

const Settings = () => {
  const { language, t } = useI18n();
  const [health, setHealth] = useState<HealthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const languageLabel = language === "ru" ? t("common.russian") : t("common.english");

  const checkHealth = async () => {
    setHealth("checking");
    setErrorMessage("");
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { status?: string };
      if (data.status === "ok") {
        setHealth("ok");
      } else {
        setHealth("error");
        setErrorMessage(t("settings.unexpectedResponse"));
      }
    } catch (err) {
      setHealth("error");
      setErrorMessage(err instanceof Error ? err.message : t("settings.failedBackend"));
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const badgeTone =
    health === "ok"
      ? "bg-success/20 text-success"
      : health === "checking"
        ? "bg-muted text-muted-foreground"
        : health === "error"
          ? "bg-destructive/20 text-destructive"
          : "bg-muted text-muted-foreground";
  const statusMessage =
    health === "ok"
      ? t("settings.backendReachable")
      : health === "error"
      ? errorMessage
      : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-start justify-center p-8 text-foreground">
          <div className="w-full max-w-xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.title")}</p>
              <h2 className="text-2xl font-semibold">{t("settings.systemStatus")}</h2>
              <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t("common.language")}</span>
              <Badge variant="outline" className="h-8 px-3 text-sm">
                {languageLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={badgeTone}>
                {health === "checking" && t("settings.checking")}
                {health === "ok" && t("settings.healthy")}
                {health === "error" && t("settings.unavailable")}
                {health === "idle" && t("settings.idle")}
              </Badge>
              {statusMessage && <span className="text-sm text-muted-foreground">{statusMessage}</span>}
              <Button variant="outline" size="sm" onClick={checkHealth} className="ml-auto">
                {t("settings.retry")}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <BackToTopButton />
    </div>
  );
};

export default Settings;
