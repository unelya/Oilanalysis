import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export const BackToTopButton = () => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("navigation.backToTop")}
      title={t("navigation.backToTop")}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
};
