import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { columnConfigByRole } from "@/data/mockData";
import { fetchFilterMethods, fetchPlannedAnalyses, fetchSamples, mapApiAnalysis } from "@/lib/api";
import { KanbanCard, PlannedAnalysisCard, Role, Status } from "@/types/kanban";

const DEFAULT_ANALYSIS_TYPES = ["SARA", "IR", "Mass Spectrometry", "Viscosity"];
const ADMIN_STORED_KEY = "labsync-admin-stored";
const DELETED_KEY = "labsync-deleted";
const LAB_OVERRIDES_KEY = "labsync-lab-overrides";

const MOCK_NGDUS = ["NGDU-01", "NGDU-07", "NGDU-12", "NGDU-19"];
const MOCK_WELLS = ["W-112", "W-204", "W-318", "W-421", "W-510"];
const MOCK_SHOPS = ["Shop North", "Shop East", "Shop South", "Shop West"];
const MOCK_FIELDS = ["Field A", "Field B", "Field C", "Field D"];

const hashSeed = (value?: string) =>
  (value ?? "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const addDays = (dateStr: string, days: number) => {
  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) return "—";
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const sampleLabelForRole = (role: Role, status: Status, adminStored?: boolean, deleted?: boolean) => {
  if (role === "admin") {
    if (deleted) return "Deleted";
    if (adminStored) return "Stored";
    if (status === "review") return "Needs attention";
    if (status === "done") return "Issues";
    return "Issues";
  }
  return columnConfigByRole[role].find((col) => col.id === status)?.title ?? "—";
};

const mergeMethods = (
  methods: { name: string; status: PlannedAnalysisCard["status"]; assignedTo?: string[] }[],
) => {
  const priority: Record<PlannedAnalysisCard["status"], number> = {
    completed: 4,
    review: 3,
    in_progress: 2,
    planned: 1,
    failed: 0,
  };
  const map = new Map<string, { name: string; status: PlannedAnalysisCard["status"]; assignedTo?: string[] }>();
  methods.forEach((method) => {
    const name = method.name ?? "Unknown";
    const key = name.toLowerCase();
    const existing = map.get(key);
    const nextAssignees = Array.from(
      new Set([...(existing?.assignedTo ?? []), ...(method.assignedTo ?? [])]),
    ).filter(Boolean);
    if (!existing || priority[method.status] > priority[existing.status]) {
      map.set(key, { ...method, name, assignedTo: nextAssignees });
      return;
    }
    map.set(key, { ...existing, name, assignedTo: nextAssignees });
  });
  return Array.from(map.values());
};

const aggregateStatus = (methods: { status: PlannedAnalysisCard["status"] }[], fallback: Status) => {
  if (methods.length === 0) return fallback;
  const allDone = methods.every((m) => m.status === "completed");
  if (fallback === "review") return "review";
  if (fallback === "done" && allDone) return "done";
  const hasReview = methods.some((m) => m.status === "review" || m.status === "failed");
  const hasProgress = methods.some((m) => m.status === "in_progress");
  if (hasReview) return "review";
  if (allDone) return fallback === "review" ? "review" : "progress";
  if (hasProgress) return "progress";
  return fallback ?? "new";
};

const Samples = () => {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [analyses, setAnalyses] = useState<PlannedAnalysisCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethodWhitelist, setFilterMethodWhitelist] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<
    | "none"
    | "sample:asc"
    | "sample:desc"
    | "well:asc"
    | "well:desc"
    | "sampling:asc"
    | "sampling:desc"
    | "arrival:asc"
    | "arrival:desc"
  >("none");
  const [sortDraft, setSortDraft] = useState<typeof sortMode>("none");
  const [sortOpen, setSortOpen] = useState(false);
  const [sampleIdFilter, setSampleIdFilter] = useState("");
  const [wellIdFilter, setWellIdFilter] = useState("");
  const [samplingDateFilter, setSamplingDateFilter] = useState("");
  const [arrivalDateFilter, setArrivalDateFilter] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");
  const [methodFilterOpen, setMethodFilterOpen] = useState(false);
  const [methodFilterValue, setMethodFilterValue] = useState<{ method: string; status: "any" | "done" | "not_done" }>({
    method: "",
    status: "any",
  });
  const [methodFilterDraft, setMethodFilterDraft] = useState<{ method: string; status: "any" | "done" | "not_done" }>({
    method: "",
    status: "any",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [samples, planned, filterMethods] = await Promise.all([
          fetchSamples(),
          fetchPlannedAnalyses(),
          fetchFilterMethods().catch(() => []),
        ]);
        setCards(samples);
        const normalized = planned.map((item) => mapApiAnalysis(item as any));
        setAnalyses(normalized);
        setFilterMethodWhitelist(filterMethods);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => {
    const adminStoredRaw = typeof window !== "undefined" ? localStorage.getItem(ADMIN_STORED_KEY) : null;
    const deletedRaw = typeof window !== "undefined" ? localStorage.getItem(DELETED_KEY) : null;
    const labOverridesRaw = typeof window !== "undefined" ? localStorage.getItem(LAB_OVERRIDES_KEY) : null;
    const adminStored = (adminStoredRaw ? JSON.parse(adminStoredRaw) : {}) as Record<string, boolean>;
    const deleted = (deletedRaw ? JSON.parse(deletedRaw) : {}) as Record<string, { reason: string }>;
    const labOverrides = (labOverridesRaw ? JSON.parse(labOverridesRaw) : {}) as Record<string, Status>;
    const sampleMap = new Map<string, KanbanCard>();
    const sampleIdsFromCards = new Set<string>();
    cards
      .filter((card) => card.sampleId && card.sampleId.trim())
      .forEach((card) => {
        sampleMap.set(card.sampleId, card);
        sampleIdsFromCards.add(card.sampleId);
      });
    analyses.forEach((analysis) => {
      if (!analysis.sampleId || !analysis.sampleId.trim()) return;
      if (!sampleMap.has(analysis.sampleId)) {
        sampleMap.set(analysis.sampleId, {
          id: analysis.sampleId,
          status: "new",
          statusLabel: "Planned",
          sampleId: analysis.sampleId,
          wellId: "—",
          horizon: "—",
          samplingDate: "—",
          storageLocation: "Unassigned",
          analysisType: "Sample",
          assignedTo: "Unassigned",
          analysisStatus: "planned",
          sampleStatus: "new",
        });
      }
    });

    const analysesBySample = new Map<string, PlannedAnalysisCard[]>();
    analyses.forEach((analysis) => {
      const list = analysesBySample.get(analysis.sampleId) ?? [];
      list.push(analysis);
      analysesBySample.set(analysis.sampleId, list);
    });

    return Array.from(sampleMap.values()).map((card) => {
      const seed = hashSeed(card.sampleId);
      const plannedList = analysesBySample.get(card.sampleId) ?? [];
      const merged = mergeMethods(
        plannedList.map((method) => ({
          name: method.analysisType,
          status: method.status,
          assignedTo: method.assignedTo ?? [],
        })),
      );
      const methodNames = new Set<string>([
        ...DEFAULT_ANALYSIS_TYPES,
        ...merged.map((m) => m.name),
      ]);
      const methods = Array.from(methodNames).map((name) => {
        const existing = merged.find((m) => m.name.toLowerCase() === name.toLowerCase());
        const status = existing?.status ?? "planned";
        const assignees = existing?.assignedTo?.filter(Boolean) ?? [];
        return {
          name,
          status,
          done: status === "completed",
          assignees,
        };
      });
      const methodSortKey =
        methods
          .map((m) => m.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))[0] ?? "";
      const operatorSortKey =
        methods
          .flatMap((m) => m.assignees)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))[0] ?? "";

      const labStatus = aggregateStatus(methods, card.status);
      const analysisBadge = columnConfigByRole.lab_operator.find((col) => col.id === labStatus)?.title ?? "Planned";
      const hasSampleCard = sampleIdsFromCards.has(card.sampleId);
      const warehouseVisible = hasSampleCard && !deleted[card.sampleId] && !adminStored[card.sampleId];
      const labVisible = warehouseVisible && (card.status === "review" || labOverrides[card.sampleId] !== undefined);
      const adminVisible =
        hasSampleCard &&
        (Boolean(deleted[card.sampleId]) ||
          Boolean(adminStored[card.sampleId]) ||
          card.status === "review" ||
          card.status === "done");

      return {
        card,
        adminStored: Boolean(adminStored[card.sampleId]),
        deleted: Boolean(deleted[card.sampleId]),
        hasSampleCard,
        warehouseVisible,
        labVisible,
        adminVisible,
        ngdu: MOCK_NGDUS[seed % MOCK_NGDUS.length],
        wellNumber: MOCK_WELLS[seed % MOCK_WELLS.length],
        shop: MOCK_SHOPS[seed % MOCK_SHOPS.length],
        field: MOCK_FIELDS[seed % MOCK_FIELDS.length],
        injectionWell: seed % 2 === 0,
        arrivalDate: card.samplingDate && card.samplingDate !== "—" ? addDays(card.samplingDate, (seed % 5) + 1) : "—",
        methods,
        analysisBadge,
      };
    });
  }, [cards, analyses]);

  const methodOptions = useMemo(() => {
    const allowList = new Set<string>([
      ...DEFAULT_ANALYSIS_TYPES,
      ...filterMethodWhitelist.filter((method) => !DEFAULT_ANALYSIS_TYPES.includes(method)),
    ]);
    return Array.from(allowList).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [filterMethodWhitelist]);

  const hasActiveMethodFilter = Boolean(methodFilterValue.method);

  const filteredRows = useMemo(() => {
    const sampleQuery = sampleIdFilter.trim().toLowerCase();
    const wellQuery = wellIdFilter.trim().toLowerCase();
    const samplingQuery = samplingDateFilter.trim().toLowerCase();
    const arrivalQuery = arrivalDateFilter.trim().toLowerCase();
    const operatorQuery = operatorFilter.trim().toLowerCase();
    return rows.filter((row) => {
      if (sampleQuery && !row.card.sampleId.toLowerCase().includes(sampleQuery)) return false;
      if (wellQuery && !row.card.wellId.toLowerCase().includes(wellQuery)) return false;
      if (samplingQuery && !row.card.samplingDate.toLowerCase().includes(samplingQuery)) return false;
      if (arrivalQuery && !row.arrivalDate.toLowerCase().includes(arrivalQuery)) return false;
      if (operatorQuery) {
        const matchesOperator = row.methods.some((method) =>
          method.assignees.some((assignee) => assignee.toLowerCase().includes(operatorQuery)),
        );
        if (!matchesOperator) return false;
      }
      if (methodFilterValue.method) {
        const method = row.methods.find((m) => m.name.toLowerCase() === methodFilterValue.method.toLowerCase());
        if (!method) return false;
        if (methodFilterValue.status === "done" && !method.done) return false;
        if (methodFilterValue.status === "not_done" && method.done) return false;
      }
      return true;
    });
  }, [
    rows,
    sampleIdFilter,
    wellIdFilter,
    samplingDateFilter,
    arrivalDateFilter,
    operatorFilter,
    methodFilterValue,
  ]);

  const sortedRows = useMemo(() => {
    if (sortMode === "none") return filteredRows;
    const [field, direction] = sortMode.split(":") as [
      "sample" | "well" | "sampling" | "arrival",
      "asc" | "desc",
    ];
    const multiplier = direction === "asc" ? 1 : -1;
    const toDate = (value: string) => {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    };
    const compare = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    const rowsWithIndex = filteredRows.map((row, index) => ({ row, index }));
    rowsWithIndex.sort((a, b) => {
      let result = 0;
      if (field === "sample") {
        result = compare(a.row.card.sampleId ?? "", b.row.card.sampleId ?? "");
      } else if (field === "well") {
        result = compare(a.row.card.wellId ?? "", b.row.card.wellId ?? "");
      } else if (field === "sampling") {
        const aDate = toDate(a.row.card.samplingDate ?? "") ?? 0;
        const bDate = toDate(b.row.card.samplingDate ?? "") ?? 0;
        result = aDate - bDate;
      } else if (field === "arrival") {
        const aDate = toDate(a.row.arrivalDate ?? "") ?? 0;
        const bDate = toDate(b.row.arrivalDate ?? "") ?? 0;
        result = aDate - bDate;
      }
      if (result === 0) {
        return a.index - b.index;
      }
      return result * multiplier;
    });
    return rowsWithIndex.map(({ row }) => row);
  }, [filteredRows, sortMode]);

  const parseSort = (value: typeof sortMode) => {
    if (value === "none") {
      return { field: "sample" as const, direction: "asc" as const, isNone: true };
    }
    const [field, direction] = value.split(":") as [
      "sample" | "well" | "sampling" | "arrival",
      "asc" | "desc",
    ];
    return { field, direction, isNone: false };
  };
  const sortMeta = parseSort(sortDraft);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Sample registry</h2>
                <p className="text-sm text-muted-foreground">All unique samples and analysis statuses.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Input
                  value={sampleIdFilter}
                  onChange={(event) => setSampleIdFilter(event.target.value)}
                  placeholder="Filter Sample ID"
                  className="h-8 w-40"
                />
                <Input
                  value={wellIdFilter}
                  onChange={(event) => setWellIdFilter(event.target.value)}
                  placeholder="Filter Well ID"
                  className="h-8 w-40"
                />
                <Input
                  value={samplingDateFilter}
                  onChange={(event) => setSamplingDateFilter(event.target.value)}
                  placeholder="Filter sampling date"
                  className="h-8 w-44"
                />
                <Input
                  value={arrivalDateFilter}
                  onChange={(event) => setArrivalDateFilter(event.target.value)}
                  placeholder="Filter arrival date"
                  className="h-8 w-44"
                />
                <Input
                  value={operatorFilter}
                  onChange={(event) => setOperatorFilter(event.target.value)}
                  placeholder="Filter operator"
                  className="h-8 w-40"
                />
                <Popover
                  open={methodFilterOpen}
                  onOpenChange={(open) => {
                    setMethodFilterOpen(open);
                    if (open) {
                      setMethodFilterDraft(methodFilters);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="w-4 h-4" />
                      Methods {hasActiveMethodFilter ? "(1)" : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 w-80" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Methods filter</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMethodFilterDraft({ method: "", status: "any" })}
                        >
                          Reset
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Select
                          value={methodFilterDraft.method}
                          onValueChange={(value) => {
                            setMethodFilterDraft((prev) => ({ ...prev, method: value }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose method" />
                          </SelectTrigger>
                          <SelectContent>
                            {methodOptions.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={methodFilterDraft.status}
                          onValueChange={(value: "any" | "done" | "not_done") => {
                            setMethodFilterDraft((prev) => ({ ...prev, status: value }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="not_done">Not done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMethodFilterDraft(methodFilterValue);
                            setMethodFilterOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setMethodFilterValue(methodFilterDraft);
                            setMethodFilterOpen(false);
                          }}
                          disabled={
                            methodFilterDraft.method === methodFilterValue.method &&
                            methodFilterDraft.status === methodFilterValue.status
                          }
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
                      Sort {sortMode !== "none" ? "(1)" : ""}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 w-80" align="end">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Sort order</p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSortDraft("none")}>
                          Reset
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Sort by</p>
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
                              <SelectValue placeholder="Choose field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sample">Sample ID</SelectItem>
                              <SelectItem value="well">Well ID</SelectItem>
                              <SelectItem value="sampling">Sampling date</SelectItem>
                              <SelectItem value="arrival">Arrival date</SelectItem>
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
                              aria-label="Ascending"
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
                              aria-label="Descending"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSortOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSortMode(sortDraft);
                            setSortOpen(false);
                          }}
                        >
                          Apply
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
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Well ID</TableHead>
                  <TableHead>NGDU</TableHead>
                  <TableHead>Well number</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Injection well</TableHead>
                  <TableHead>Horizon</TableHead>
                  <TableHead>Sampling date</TableHead>
                  <TableHead>Arrival date</TableHead>
                  <TableHead>Storage location</TableHead>
                  <TableHead>Warehouse status</TableHead>
                  <TableHead>Lab status</TableHead>
                  <TableHead>Admin status</TableHead>
                  <TableHead>Analyses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-muted-foreground">
                      Loading samples…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-muted-foreground">
                      No samples yet.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  sortedRows.map((row, index) => (
                    <TableRow key={row.card.sampleId}>
                      <TableCell className="text-right text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium text-foreground">{row.card.sampleId}</TableCell>
                      <TableCell>{row.card.wellId}</TableCell>
                      <TableCell>{row.ngdu}</TableCell>
                      <TableCell>{row.wellNumber}</TableCell>
                      <TableCell>{row.shop}</TableCell>
                      <TableCell>{row.field}</TableCell>
                      <TableCell>{row.injectionWell ? "Yes" : "No"}</TableCell>
                      <TableCell>{row.card.horizon}</TableCell>
                      <TableCell>{row.card.samplingDate}</TableCell>
                      <TableCell>{row.arrivalDate}</TableCell>
                      <TableCell>{row.card.storageLocation}</TableCell>
                      <TableCell>
                        {row.warehouseVisible
                          ? sampleLabelForRole("warehouse_worker", row.card.status)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {row.labVisible
                          ? sampleLabelForRole("lab_operator", aggregateStatus(row.methods, row.card.status))
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {row.adminVisible
                          ? sampleLabelForRole("admin", row.card.status, row.adminStored, row.deleted)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="min-w-[520px]">
                        <div className="grid grid-cols-[minmax(140px,1.2fr)_60px_minmax(140px,1fr)] gap-2 text-[11px] text-muted-foreground pb-2 border-b border-border">
                          <span>Method</span>
                          <span>Done</span>
                          <span>Operators</span>
                        </div>
                        <div className="space-y-2 pt-2">
                          {row.methods.map((method) => (
                            <div
                              key={method.name}
                              className="grid grid-cols-[minmax(140px,1.2fr)_60px_minmax(140px,1fr)] gap-2 text-xs"
                            >
                              <span className="font-medium text-foreground">{method.name}</span>
                              <span>{method.done ? "Yes" : "No"}</span>
                              <span className="text-muted-foreground">
                                {method.assignees.length > 0 ? method.assignees.join(", ") : "Unassigned"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Samples;
