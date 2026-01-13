import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type HealthStatus = "idle" | "checking" | "ok" | "error";

const Settings = () => {
  const [health, setHealth] = useState<HealthStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const checkHealth = async () => {
    setHealth("checking");
    setMessage("");
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { status?: string };
      if (data.status === "ok") {
        setHealth("ok");
        setMessage("Backend reachable");
      } else {
        setHealth("error");
        setMessage("Unexpected response");
      }
    } catch (err) {
      setHealth("error");
      setMessage(err instanceof Error ? err.message : "Failed to reach backend");
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-start justify-center p-8 text-foreground">
          <div className="w-full max-w-xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Settings</p>
              <h2 className="text-2xl font-semibold">System status</h2>
              <p className="text-sm text-muted-foreground">Frontend still uses mock data; backend is used for health only.</p>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Badge className={badgeTone}>
                {health === "checking" && "Checking..."}
                {health === "ok" && "Healthy"}
                {health === "error" && "Unavailable"}
                {health === "idle" && "Idle"}
              </Badge>
              {message && <span className="text-sm text-muted-foreground">{message}</span>}
              <Button variant="outline" size="sm" onClick={checkHealth} className="ml-auto">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
