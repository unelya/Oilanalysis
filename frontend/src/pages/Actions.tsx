import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BackToTopButton } from "@/components/layout/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockActions } from "@/data/actions";
import { useI18n } from "@/i18n";

const Actions = () => {
  const { t } = useI18n();
  const [sortMode, setSortMode] = useState<
    | "none"
    | "well:asc"
    | "well:desc"
    | "action:asc"
    | "action:desc"
    | "start:asc"
    | "start:desc"
    | "end:asc"
    | "end:desc"
    | "incremental:asc"
    | "incremental:desc"
    | "rate:asc"
    | "rate:desc"
  >("none");
  const [sortDraft, setSortDraft] = useState<typeof sortMode>("none");
  const [sortOpen, setSortOpen] = useState(false);
  const [wellFilter, setWellFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");

  const parseSort = (value: typeof sortMode) => {
    if (value === "none") {
      return { field: "well" as const, direction: "asc" as const, isNone: true };
    }
    const [field, direction] = value.split(":") as [
      "well" | "action" | "start" | "end" | "incremental" | "rate",
      "asc" | "desc",
    ];
    return { field, direction, isNone: false };
  };
  const sortMeta = parseSort(sortDraft);

  const filteredActions = useMemo(() => {
    const wellQuery = wellFilter.trim().toLowerCase();
    const actionQuery = actionFilter.trim().toLowerCase();
    const startQuery = startFilter.trim().toLowerCase();
    const endQuery = endFilter.trim().toLowerCase();
    const actionTypeQuery = actionTypeFilter.trim().toLowerCase();
    return mockActions.filter((row) => {
      if (wellQuery && !row.wellId.toLowerCase().includes(wellQuery)) return false;
      if (actionQuery && !row.actionId.toString().toLowerCase().includes(actionQuery)) return false;
      if (startQuery && !row.startDate.toLowerCase().includes(startQuery)) return false;
      if (endQuery && !row.endDate.toLowerCase().includes(endQuery)) return false;
      if (actionTypeQuery && !row.actionType.toLowerCase().includes(actionTypeQuery)) return false;
      return true;
    });
  }, [wellFilter, actionFilter, startFilter, endFilter, actionTypeFilter]);

  const sortedActions = useMemo(() => {
    if (sortMode === "none") return filteredActions;
    const [field, direction] = sortMode.split(":") as [
      "well" | "action" | "start" | "end" | "incremental" | "rate",
      "asc" | "desc",
    ];
    const multiplier = direction === "asc" ? 1 : -1;
    const compare = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    const toDate = (value: string) => {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    const rowsWithIndex = filteredActions.map((row, index) => ({ row, index }));
    rowsWithIndex.sort((a, b) => {
      let result = 0;
      if (field === "well") {
        result = compare(a.row.wellId, b.row.wellId);
      } else if (field === "action") {
        result = a.row.actionId - b.row.actionId;
      } else if (field === "start") {
        result = toDate(a.row.startDate) - toDate(b.row.startDate);
      } else if (field === "end") {
        result = toDate(a.row.endDate) - toDate(b.row.endDate);
      } else if (field === "incremental") {
        result = a.row.incrementalOil - b.row.incrementalOil;
      } else if (field === "rate") {
        result = a.row.avgDailyRate - b.row.avgDailyRate;
      }
      if (result === 0) return a.index - b.index;
      return result * multiplier;
    });
    return rowsWithIndex.map(({ row }) => row);
  }, [filteredActions, sortMode]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{t("actionsPage.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("actionsPage.subtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Input
                  value={wellFilter}
                  onChange={(event) => setWellFilter(event.target.value)}
                  placeholder={t("actionsPage.filters.wellId")}
                  className="h-8 w-36"
                />
                <Input
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  placeholder={t("actionsPage.filters.actionId")}
                  className="h-8 w-36"
                />
                <Input
                  value={startFilter}
                  onChange={(event) => setStartFilter(event.target.value)}
                  placeholder={t("actionsPage.filters.startDate")}
                  className="h-8 w-40"
                />
                <Input
                  value={endFilter}
                  onChange={(event) => setEndFilter(event.target.value)}
                  placeholder={t("actionsPage.filters.endDate")}
                  className="h-8 w-40"
                />
                <Input
                  value={actionTypeFilter}
                  onChange={(event) => setActionTypeFilter(event.target.value)}
                  placeholder={t("actionsPage.filters.actionType")}
                  className="h-8 w-44"
                />
                <Popover
                  open={sortOpen}
                  onOpenChange={(open) => {
                    setSortOpen(open);
                    if (open) {
                      setSortDraft(sortMode);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {sortMode === "none" ? (
                        <ArrowUpDown className="w-4 h-4" />
                      ) : sortMode.endsWith(":desc") ? (
                        <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                      {t("actionsPage.sort.button")} {sortMode !== "none" ? "(1)" : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 w-80" align="end">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{t("actionsPage.sort.order")}</p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSortDraft("none")}>
                          {t("actionsPage.common.reset")}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t("actionsPage.sort.by")}</p>
                        <div className="flex items-center gap-2">
                          <Select
                            value={sortMeta.isNone ? "" : sortMeta.field}
                            onValueChange={(value) => {
                              if (!value) return;
                              const direction = sortMeta.direction;
                              setSortDraft(`${value}:${direction}` as typeof sortDraft);
                            }}
                          >
                            <SelectTrigger className="h-9 flex-1">
                              <SelectValue placeholder={t("actionsPage.sort.chooseField")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="well">{t("actionsPage.columns.wellId")}</SelectItem>
                              <SelectItem value="action">{t("actionsPage.columns.actionId")}</SelectItem>
                              <SelectItem value="start">{t("actionsPage.columns.startDate")}</SelectItem>
                              <SelectItem value="end">{t("actionsPage.columns.endDate")}</SelectItem>
                              <SelectItem value="incremental">{t("actionsPage.columns.incrementalOil")}</SelectItem>
                              <SelectItem value="rate">{t("actionsPage.columns.avgDailyRate")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1 rounded-md border border-border p-1">
                            <Button
                              type="button"
                              variant={sortMeta.direction === "asc" && !sortMeta.isNone ? "default" : "ghost"}
                              size="sm"
                              className="h-8 w-10"
                              onClick={() => {
                                const field = sortMeta.field;
                                setSortDraft(`${field}:asc` as typeof sortDraft);
                              }}
                              aria-label={t("actionsPage.sort.ascending")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant={sortMeta.direction === "desc" && !sortMeta.isNone ? "default" : "ghost"}
                              size="sm"
                              className="h-8 w-10"
                              onClick={() => {
                                const field = sortMeta.field;
                                setSortDraft(`${field}:desc` as typeof sortDraft);
                              }}
                              aria-label={t("actionsPage.sort.descending")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSortOpen(false)}>
                          {t("actionsPage.common.cancel")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSortMode(sortDraft);
                            setSortOpen(false);
                          }}
                        >
                          {t("actionsPage.common.apply")}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead>{t("actionsPage.columns.wellId")}</TableHead>
                  <TableHead>{t("actionsPage.columns.actionId")}</TableHead>
                  <TableHead>{t("actionsPage.columns.startDate")}</TableHead>
                  <TableHead>{t("actionsPage.columns.endDate")}</TableHead>
                  <TableHead>{t("actionsPage.columns.success")}</TableHead>
                  <TableHead>{t("actionsPage.columns.actionType")}</TableHead>
                  <TableHead>{t("actionsPage.columns.incrementalOil")}</TableHead>
                  <TableHead>{t("actionsPage.columns.avgDailyRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActions.map((row, index) => (
                  <TableRow key={row.actionId}>
                    <TableCell className="text-right text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{row.wellId}</TableCell>
                    <TableCell>{row.actionId}</TableCell>
                    <TableCell>{row.startDate}</TableCell>
                    <TableCell>{row.endDate}</TableCell>
                    <TableCell>{row.success.toFixed(2)}</TableCell>
                    <TableCell>{row.actionType}</TableCell>
                    <TableCell>{row.incrementalOil.toFixed(1)}</TableCell>
                    <TableCell>{row.avgDailyRate.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <BackToTopButton />
    </div>
  );
};

export default Actions;
