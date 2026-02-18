import { X, Calendar, User, MapPin, FlaskConical, ClipboardList, CircleDot, Users } from 'lucide-react';
import { KanbanCard, CommentThread, Role } from '@/types/kanban';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarCmp } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';
import { getMethodLabel } from '@/lib/method-labels';

interface DetailPanelProps {
  card: KanbanCard | null;
  isOpen: boolean;
  onClose: () => void;
  role?: Role;
  onPlanAnalysis?: (data: { analysisType: string; assignedTo?: string }) => void;
  onAssignOperator?: (method: string, operator?: string) => void;
  onResolveConflict?: (note?: string) => void;
  onUpdateSample?: (updates: Record<string, string>) => void;
  onUpdateAnalysis?: (updates: { assigned_to?: string }) => void;
  onToggleMethod?: (methodId: number, done: boolean) => void;
  readOnlyMethods?: boolean;
  adminActions?: {
    onResolve: () => void;
    onReturn: () => void;
  };
  availableMethods?: string[];
  operatorOptions?: { id: number; name: string; methodPermissions?: string[] }[];
  comments?: CommentThread[];
  issueHistoryTimestamps?: string[];
  returnNoteTimestamps?: string[];
  onAddComment?: (sampleId: string, author: string, text: string) => void;
  currentUserName?: string;
}

export function DetailPanel({ card: cardProp, isOpen, onClose, role = 'lab_operator', onPlanAnalysis, onAssignOperator, onResolveConflict, onUpdateSample, onUpdateAnalysis, onToggleMethod, readOnlyMethods, adminActions, availableMethods = ['SARA', 'IR', 'Mass Spectrometry', 'Viscosity'], operatorOptions = [], comments = [], issueHistoryTimestamps = [], returnNoteTimestamps = [], onAddComment, currentUserName }: DetailPanelProps) {
  const { t } = useI18n();
  const card: KanbanCard = cardProp ?? {
    id: '',
    status: 'new',
    statusLabel: '',
    sampleId: '',
    wellId: '',
    horizon: '',
    samplingDate: '',
    storageLocation: '',
    analysisType: '',
    analysisStatus: 'planned',
    sampleStatus: 'received',
  };
  const panelRef = useRef<HTMLDivElement | null>(null);
  const normalizeAssignees = (value?: string[] | string | null) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/[;,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const formatAssignees = (value?: string[] | string | null) => normalizeAssignees(value).join(' ');
  const canToggleMethod = (assignedTo?: string[] | string | null) => {
    if (role === 'admin') return true;
    const current = (currentUserName || '').trim();
    if (!current) return false;
    const list = normalizeAssignees(assignedTo);
    if (list.length > 0 && list.some((name) => name.trim().toLowerCase() === current.toLowerCase())) {
      return true;
    }
    const flattened = formatAssignees(assignedTo).toLowerCase();
    return flattened ? flattened.split(/\s+/).includes(current.toLowerCase()) : false;
  };
  const canToggleForMethod = (assignedTo?: string[] | string | null) =>
    canToggleMethod(assignedTo) || canToggleMethod(card.assignedTo);
  const isInteractive = Boolean(onToggleMethod) && !readOnlyMethods;
  const METHOD_ORDER = ['SARA', 'IR', 'Mass Spectrometry', 'Viscosity'];
  const methodRank = (name: string) => {
    const idx = METHOD_ORDER.findIndex((m) => m.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? idx : METHOD_ORDER.length + 100 + name.toLowerCase().charCodeAt(0);
  };
  const analysisBadge = (() => {
    const normalized = card.analysisStatus?.toLowerCase() ?? 'planned';
    switch (normalized) {
      case 'in_progress':
        return { status: 'progress', label: t("board.columns.in_progress") };
      case 'review':
        return { status: 'review', label: t("board.columns.needs_attention") };
      case 'completed':
        return { status: 'done', label: t("board.columns.completed") };
      case 'failed':
        return { status: 'review', label: t("board.card.failed") };
      default:
        return { status: 'new', label: t("board.columns.planned") };
    }
  })();
  const translateColumnLabel = (label?: string | null) => {
    if (!label) return '';
    const normalized = label.trim().toLowerCase();
    const keyByTitle: Record<string, string> = {
      planned: "board.columns.planned",
      "awaiting arrival": "board.columns.awaiting_arrival",
      stored: "board.columns.stored",
      issues: "board.columns.issues",
      "in progress": "board.columns.in_progress",
      "needs attention": "board.columns.needs_attention",
      completed: "board.columns.completed",
      "uploaded batch": "board.columns.uploaded_batch",
      conflicts: "board.columns.conflicts",
      deleted: "board.columns.deleted",
      resolved: "board.card.resolved",
    };
    const key = keyByTitle[normalized];
    return key ? t(key) : label;
  };
  const analysisBadgeDisplay = card.analysisLabel
    ? { ...analysisBadge, label: translateColumnLabel(card.analysisLabel) }
    : role === 'lab_operator'
    ? { status: card.status, label: translateColumnLabel(card.statusLabel) || t("board.columns.planned") }
    : analysisBadge;
  const conflictStatusMap: Record<KanbanCard['status'], { status: KanbanCard['status']; label: string }> = {
    new: { status: 'new', label: t("board.columns.uploaded_batch") },
    progress: { status: 'progress', label: t("board.columns.conflicts") },
    review: { status: 'progress', label: t("board.columns.conflicts") },
    done: { status: 'done', label: t("board.columns.stored") },
  };
  const conflictStatus = conflictStatusMap[card.status];
  const warehouseSampleLabelMap: Record<string, string> = {
    new: t("board.columns.planned"),
    progress: t("board.columns.awaiting_arrival"),
    review: t("board.columns.stored"),
    done: t("board.columns.issues"),
  };
  const toDigits = (value: string) => value.replace(/\D/g, '');
  const storageFormatRegex = /^Fridge\s+[A-Za-z0-9]+\s*·\s*Bin\s+[A-Za-z0-9]+\s*·\s*Place\s+[A-Za-z0-9]+$/;
  const parseStorageLocation = (value: string) => {
    const match = value.match(/^Fridge\s+([^·]+)\s*·\s*Bin\s+([^·]+)\s*·\s*Place\s+(.+)$/);
    if (!match) return { fridge: '', bin: '', place: '' };
    return { fridge: match[1].trim(), bin: match[2].trim(), place: match[3].trim() };
  };
  const formatStorageLocation = (parts: { fridge: string; bin: string; place: string }) =>
    `Fridge ${parts.fridge.trim()} · Bin ${parts.bin.trim()} · Place ${parts.place.trim()}`;
  const isValidStorageLocation = (value: string) => storageFormatRegex.test(value.trim());
  const isWarehouseStatusView = true;
  const UNASSIGNED_VALUE = 'Unassigned';
  const displayAssignedTo =
    card.assignedTo && card.assignedTo.trim().toLowerCase() === UNASSIGNED_VALUE.toLowerCase()
      ? t("board.card.unassigned")
      : card.assignedTo ?? t("board.card.unassigned");
  const sampleLabel = isWarehouseStatusView
    ? warehouseSampleLabelMap[card.status] ?? card.statusLabel
    : card.statusLabel;
  const sortMethods = (methods: NonNullable<KanbanCard['methods']>) =>
    [...methods].sort((a, b) => {
      const ia = methodRank(a.name);
      const ib = methodRank(b.name);
      if (ia === ib) return a.name.localeCompare(b.name);
      return ia - ib;
    });
  const [analysisType, setAnalysisType] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignMethod, setAssignMethod] = useState('');
  const [assignOperator, setAssignOperator] = useState('');
  const [resolution, setResolution] = useState('');
  const [planError, setPlanError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState(currentUserName ?? '');
  const [storageParts, setStorageParts] = useState(() => parseStorageLocation(card.storageLocation || ''));
  const isAdmin = Boolean(onPlanAnalysis);
  const normalizeMethodKey = (value: string) => value.trim().toLowerCase();
  const canAssignOnlySelf = role === 'lab_operator' && !isAdmin;
  const selfOperatorName = (currentUserName || '').trim();
  const selectedMethodKey = normalizeMethodKey(assignMethod);
  const hasMethodPermission = (op: { methodPermissions?: string[] }, methodKey: string) => {
    if (!methodKey) return true;
    const perms = op.methodPermissions || [];
    if (perms.length === 0) return true; // avoid false-negative UI filtering; backend still enforces
    return perms.some((m) => normalizeMethodKey(m) === methodKey);
  };
  const eligibleOperators = operatorOptions.filter((op) => hasMethodPermission(op, selectedMethodKey));
  const assignableOperators = canAssignOnlySelf
    ? (selfOperatorName
        ? eligibleOperators.filter((op) => op.name.trim().toLowerCase() === selfOperatorName.toLowerCase())
        : [])
    : (selectedMethodKey && eligibleOperators.length > 0 ? eligibleOperators : operatorOptions);

  useEffect(() => {
    if (currentUserName) {
      setCommentAuthor(currentUserName);
    }
  }, [currentUserName]);
  useEffect(() => {
    setAssignMethod('');
    setAssignOperator('');
    setAssignError('');
    setPlanError('');
  }, [card.sampleId]);
  useEffect(() => {
    if (!assignOperator) return;
    if (assignOperator === '__unassigned') return;
    const exists = assignableOperators.some((op) => op.name === assignOperator);
    if (!exists) {
      setAssignOperator('');
    }
  }, [assignOperator, assignableOperators]);
  useEffect(() => {
    setStorageParts(parseStorageLocation(card.storageLocation || ''));
  }, [card.storageLocation]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (!panelRef.current || !target || !panelRef.current.contains(target)) return;
      const tag = target.tagName.toLowerCase();
      const isTextEntry =
        tag === 'textarea' ||
        tag === 'select' ||
        (tag === 'input' && !['checkbox', 'radio', 'button', 'submit'].includes((target as HTMLInputElement).type)) ||
        target.isContentEditable;
      if (isTextEntry) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled'));
      if (focusables.length === 0) return;
      const currentIndex = focusables.indexOf(target);
      const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + delta + focusables.length) % focusables.length;
      event.preventDefault();
      focusables[nextIndex].focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  if (!cardProp) return null;
  const issueCount = Math.max(card.issueHistory?.length ?? 0, card.issueReason ? 1 : 0);
  const returnCount = Math.max(card.returnNotes?.length ?? 0, card.returnNote ? 1 : 0);
  const noteEntryCount = Math.max(issueCount, returnCount);
  const noteEntries = Array.from({ length: noteEntryCount })
    .map((_, idx) => ({
      issue: card.issueHistory?.[idx] ?? (idx === 0 ? card.issueReason : undefined),
      note: card.returnNotes?.[idx] ?? (idx === 0 ? card.returnNote : undefined),
      idx,
    }))
    .filter((entry) => Boolean(entry.issue || entry.note));
  const latestIssue = noteEntries.length > 0 ? noteEntries[noteEntries.length - 1].issue : undefined;
  const latestReturnNote = noteEntries.length > 0 ? noteEntries[noteEntries.length - 1].note : undefined;
  const formatNoteTime = (value?: string) => {
    if (!value) return t("panel.timeUnavailable");
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? t("panel.timeUnavailable") : parsed.toLocaleString();
  };
  const panelTitle =
    card.analysisType === 'Sample'
      ? card.sampleId
      : card.analysisType === 'Conflict'
      ? t("board.card.conflict")
      : card.analysisType === 'Batch'
      ? t("board.card.batch")
      : card.analysisType;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'detail-panel',
          isOpen ? 'detail-panel-visible' : 'detail-panel-hidden'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-none">
                {panelTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> {t("panel.sampleStatus")}:
                </span>
                {role === 'warehouse_worker' ? (
                  <StatusBadge status={card.status} label={sampleLabel} />
                ) : (
                  <span className="text-sm text-foreground">{sampleLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> {t("panel.analysisStatus")}:
                </span>
                {role === 'lab_operator' ? (
                  <StatusBadge status={analysisBadgeDisplay.status} label={analysisBadgeDisplay.label} />
                ) : (
                  <span className="text-sm text-foreground">{analysisBadgeDisplay.label}</span>
                )}
              </div>
              {noteEntries.length > 0 && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="truncate">{t("panel.latestIssue")}: {latestIssue ?? '—'}</p>
                  <p className="truncate">{t("panel.latestReturnNote")}: {latestReturnNote ?? '—'}</p>
                </div>
              )}
              {role === 'admin' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CircleDot className="w-3 h-3" /> {t("board.card.conflictStatus")}:
                  </span>
                  <span className="text-sm text-foreground">{conflictStatus.label}</span>
                </div>
              )}
            </div>
            {adminActions && !card.adminStored && (card.status === 'review' || card.status === 'done') && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="bg-emerald-900 text-emerald-100 hover:bg-emerald-800" onClick={() => adminActions.onResolve()}>
                  {t("board.card.storedAsNotResolved")}
                </Button>
                <Button size="sm" variant="secondary" className="bg-amber-900 text-amber-100 hover:bg-amber-800" onClick={() => adminActions.onReturn()}>
                  {t("board.card.returnForAnalysis")}
                </Button>
              </div>
            )}
            
            <Separator />
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" /> {t("panel.assignedTo")}
                </label>
                <EditableField
                  value={displayAssignedTo}
                  placeholder={t("panel.addAssignee")}
                  onSave={(val) => {
                    if (card.analysisType === 'Sample' && onUpdateSample) {
                      onUpdateSample({ assigned_to: val || UNASSIGNED_VALUE });
                    }
                    if (card.analysisType !== 'Sample' && onUpdateAnalysis) {
                      onUpdateAnalysis({ assigned_to: val || UNASSIGNED_VALUE });
                    }
                  }}
                  readOnly={!onUpdateSample && !onUpdateAnalysis}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {t("panel.samplingDate")}
                </label>
                <DateEditable
                  value={card.samplingDate}
                  onSave={(val) => onUpdateSample?.({ sampling_date: val })}
                  readOnly={!onUpdateSample}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {t("panel.storage")}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={storageParts.fridge}
                    onChange={(e) => setStorageParts((prev) => ({ ...prev, fridge: e.target.value }))}
                    onBlur={() => {
                      if (!onUpdateSample) return;
                      if (!storageParts.fridge || !storageParts.bin || !storageParts.place) return;
                      const formatted = formatStorageLocation(storageParts);
                      if (!isValidStorageLocation(formatted)) return;
                      onUpdateSample({ storage_location: formatted });
                    }}
                    placeholder="A1"
                    className="h-9 bg-muted/60 hover:bg-muted/70"
                    disabled={!onUpdateSample}
                  />
                  <span className="text-sm text-muted-foreground">·</span>
                  <Input
                    value={storageParts.bin}
                    onChange={(e) => setStorageParts((prev) => ({ ...prev, bin: e.target.value }))}
                    onBlur={() => {
                      if (!onUpdateSample) return;
                      if (!storageParts.fridge || !storageParts.bin || !storageParts.place) return;
                      const formatted = formatStorageLocation(storageParts);
                      if (!isValidStorageLocation(formatted)) return;
                      onUpdateSample({ storage_location: formatted });
                    }}
                    placeholder="B2"
                    className="h-9 bg-muted/60 hover:bg-muted/70"
                    disabled={!onUpdateSample}
                  />
                  <span className="text-sm text-muted-foreground">·</span>
                  <Input
                    value={storageParts.place}
                    onChange={(e) => setStorageParts((prev) => ({ ...prev, place: e.target.value }))}
                    onBlur={() => {
                      if (!onUpdateSample) return;
                      if (!storageParts.fridge || !storageParts.bin || !storageParts.place) return;
                      const formatted = formatStorageLocation(storageParts);
                      if (!isValidStorageLocation(formatted)) return;
                      onUpdateSample({ storage_location: formatted });
                    }}
                    placeholder="C3"
                    className="h-9 bg-muted/60 hover:bg-muted/70"
                    disabled={!onUpdateSample}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CircleDot className="w-3 h-3" /> {t("board.card.well")}
                </label>
                <div className="flex gap-2">
                  <EditableField
                    value={toDigits(card.wellId)}
                    placeholder={t("board.card.well")}
                    onSave={(val) => {
                      const digits = toDigits(val);
                      if (!digits) {
                        return;
                      }
                      onUpdateSample?.({ well_id: digits });
                    }}
                    readOnly={!onUpdateSample}
                  />
                  <span className="text-sm text-muted-foreground">·</span>
                  <EditableField
                    value={card.horizon}
                    placeholder={t("board.card.horizon")}
                    onSave={(val) => onUpdateSample?.({ horizon: val || card.horizon })}
                    readOnly={!onUpdateSample}
                  />
                </div>
              </div>
            {card.conflictResolutionNote && (
              <div className="space-y-2 col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("panel.resolutionNote")}</label>
                <div className="rounded border border-border bg-muted/40 p-2 space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{t("panel.systemNote")}</span>
                    <span>·</span>
                    <span>{formatNoteTime(card.conflictResolutionAt)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{card.conflictResolutionNote}</p>
                </div>
              </div>
            )}
          </div>

          {noteEntries.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("panel.issueAndReturnNotes")}</label>
                <span className="text-xs text-muted-foreground">{noteEntries.length}</span>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {noteEntries.map(({ issue, note, idx }) => {
                  const issueTimestamp = issueHistoryTimestamps[idx];
                  const returnTimestamp = returnNoteTimestamps[idx];
                  const displayTimestamp = issueTimestamp ?? returnTimestamp;
                  return (
                    <div key={`${issue ?? 'issue'}-${note ?? 'note'}-${idx}`} className="rounded border border-border bg-muted/40 p-2 space-y-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        <span className="font-semibold text-foreground">{t("panel.systemNote")}</span>
                        <span>·</span>
                        <span>{formatNoteTime(displayTimestamp)}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          <span className="text-muted-foreground">{t("panel.issue")}:</span> {issue ?? '—'}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          <span className="text-muted-foreground">{t("panel.returnNote")}:</span> {note ?? '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {card.methods && card.methods.length > 0 && (
            <div className="space-y-2 mt-4">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("board.methods")}</label>
              <div className="space-y-1">
                  {sortMethods(card.methods).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={m.status === 'completed'}
                        onCheckedChange={(val) => {
                          if (!isInteractive) return;
                          onToggleMethod?.(m.id, Boolean(val));
                        }}
                        className="h-4 w-4 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white data-[state=checked]:disabled:bg-primary data-[state=checked]:disabled:border-primary data-[state=checked]:disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
                        disabled={!isInteractive}
                      />
                      <span className="flex-1">
                        {getMethodLabel(m.name, t)}
                        {normalizeAssignees(m.assignedTo).length > 0 ? (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 ml-1">
                            <Users className="w-3 h-3" />
                            {formatAssignees(m.assignedTo)}
                          </span>
                        ) : null}
                      </span>
                      {m.status === 'completed' && <span className="text-[10px] text-destructive font-semibold">{t("board.card.done")}</span>}
                    </label>
                  ))}
                </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">{t("panel.comments")}</label>
              {comments.length > 0 && <span className="text-xs text-muted-foreground">{comments.length}</span>}
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {comments.length === 0 && <p className="text-sm text-muted-foreground">{t("panel.noCommentsYet")}</p>}
            {comments.map((c) => (
              <div key={c.id} className="rounded border border-border bg-muted/40 p-2 space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Users className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{c.author}</span>
                    <span>·</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.text}</p>
                </div>
              ))}
            </div>
            {onAddComment && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("panel.commentAs")} <span className="text-foreground font-semibold">{commentAuthor || t("panel.unknown")}</span></p>
                <Textarea
                  placeholder={t("panel.writeComment")}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const author = (currentUserName || commentAuthor || '').trim();
                    if (!commentText.trim() || !author) return;
                    onAddComment(card.sampleId, author, commentText.trim());
                    setCommentText('');
                  }}
                >
                  {t("panel.addComment")}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex flex-col gap-3">
            {onAssignOperator && role !== 'action_supervision' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("panel.assignOperatorToMethod")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={assignMethod}
                    onValueChange={(v) => {
                      setAssignMethod(v);
                      setAssignError('');
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("panel.selectMethod")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMethods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {getMethodLabel(m, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={assignOperator}
                    onValueChange={(v) => {
                      setAssignOperator(v);
                      setAssignError('');
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("panel.assignToLabOperator")} />
                    </SelectTrigger>
                    <SelectContent>
                      {!canAssignOnlySelf && <SelectItem value="__unassigned">{t("board.card.unassigned")}</SelectItem>}
                      {assignableOperators.map((op) => (
                        <SelectItem key={op.id} value={op.name}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {assignMethod && assignableOperators.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("panel.noOperatorsForMethod")}</p>
                )}
                {assignError && <p className="text-sm text-destructive">{assignError}</p>}
                <Button
                  size="sm"
                  onClick={() => {
                    if (!assignMethod) {
                      setAssignError(t("panel.methodRequired"));
                      return;
                    }
                    if (!assignOperator) {
                      setAssignError(t("panel.selectOperator"));
                      return;
                    }
                    const isUnassigned = assignOperator === '__unassigned';
                    if (canAssignOnlySelf && selfOperatorName && assignOperator.trim().toLowerCase() !== selfOperatorName.toLowerCase()) {
                      setAssignError(t("panel.labAssignOnlySelf"));
                      return;
                    }
                    if (!isUnassigned && assignableOperators.length === 0) {
                      setAssignError(t("panel.noEligibleOperators"));
                      return;
                    }
                    onAssignOperator?.(assignMethod, assignOperator);
                    setAssignMethod('');
                    setAssignOperator('');
                    setAssignError('');
                  }}
                >
                  {t("panel.assignOperator")}
                </Button>
              </div>
            )}
            {isAdmin && onPlanAnalysis && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("panel.addAnalysisAdmin")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t("panel.analysisPlaceholder")}
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value)}
                  />
                  <Select value={assignedTo || undefined} onValueChange={(v) => setAssignedTo(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("panel.assignOptional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((op) => (
                        <SelectItem key={op.id} value={op.name}>
                          {op.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__unassigned">{t("board.card.unassigned")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {planError && <p className="text-sm text-destructive">{planError}</p>}
                <Button
                  size="sm"
                  onClick={() => {
                    if (!analysisType.trim()) {
                      setPlanError(t("panel.analysisTypeRequired"));
                      return;
                    }
                    onPlanAnalysis({
                      analysisType: analysisType.trim(),
                      assignedTo: assignedTo === '__unassigned' ? undefined : assignedTo || undefined,
                    });
                    setAnalysisType('');
                    setAssignedTo('');
                    setPlanError('');
                  }}
                >
                  {t("panel.addAnalysis")}
                </Button>
              </div>
            )}
            {onResolveConflict && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("panel.resolveConflict")}</p>
                <Input placeholder={t("panel.resolutionNoteOptional")} value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <Button size="sm" onClick={() => onResolveConflict(resolution || undefined)}>
                  {t("panel.markResolved")}
                </Button>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{t("panel.old")}</p>
                    <pre className="whitespace-pre-wrap break-words bg-muted/40 rounded p-2 text-[11px]">{card.conflictOld ?? '—'}</pre>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{t("panel.new")}</p>
                    <pre className="whitespace-pre-wrap break-words bg-muted/40 rounded p-2 text-[11px]">{card.conflictNew ?? '—'}</pre>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

function EditableField({
  value,
  placeholder,
  onSave,
  readOnly = false,
}: {
  value: string;
  placeholder?: string;
  onSave?: (val: string) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    if (readOnly) return;
    setEditing(false);
    if (onSave && draft !== value) {
      onSave(draft.trim());
    }
  };

  return editing && !readOnly ? (
    <Input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
        }
        if (e.key === 'Escape') {
          setEditing(false);
          setDraft(value);
        }
      }}
      className="h-9 field-muted"
    />
  ) : (
    <p
      className="h-9 text-sm text-foreground cursor-text rounded px-2 flex items-center bg-muted/60 hover:bg-muted/70 transition-colors"
      onClick={() => {
        if (!readOnly) {
          setEditing(true);
        }
      }}
    >
      {value || <span className="text-muted-foreground">{placeholder ?? 'Add value'}</span>}
    </p>
  );
}

function DateEditable({
  value,
  onSave,
  readOnly = false,
}: {
  value: string;
  onSave?: (val: string) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initialDate = useMemo(() => {
    const parsed = parseISO(value);
    return isValidDate(parsed) ? parsed : new Date();
  }, [value]);
  const [selected, setSelected] = useState<Date>(initialDate);

  const save = (date: Date | undefined) => {
    if (!date || readOnly) return;
    setSelected(date);
    const formatted = format(date, 'yyyy-MM-dd');
    onSave?.(formatted);
    setOpen(false);
  };

  const label = format(selected, 'yyyy-MM-dd');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start px-2 h-9 w-full text-left font-normal bg-muted/60 hover:bg-muted/70"
          disabled={readOnly}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarCmp
          mode="single"
          selected={selected}
          onSelect={(date) => save(date ?? new Date())}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
