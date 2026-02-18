import { Calendar, ClipboardList, CircleDot, FlaskConical, MapPin, MessageSquare, User } from 'lucide-react';
import { KanbanCard as CardType } from '@/types/kanban';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/i18n';
import { getMethodLabel } from '@/lib/method-labels';

interface KanbanCardProps {
  card: CardType;
  onClick: () => void;
  onToggleMethod?: (methodId: number, done: boolean) => void;
  canToggleMethod?: (method: NonNullable<CardType['methods']>[number], card: CardType) => boolean;
  readOnlyMethods?: boolean;
  showStatusActions?: boolean;
  statusBadgeMode?: 'sample' | 'analysis' | 'column';
  statusLineMode?: 'analysis' | 'sample' | 'both';
  analysisLabelMode?: 'analysis' | 'column';
  showConflictStatus?: boolean;
  conflictStatusLabel?: string;
  adminActions?: {
    onResolve?: () => void;
    onReturn?: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
    onRestoreStored?: () => void;
    isDeleted?: boolean;
    isStored?: boolean;
  };
}

export function KanbanCard({ card, onClick, onToggleMethod, canToggleMethod, readOnlyMethods, adminActions, showStatusActions = false, statusBadgeMode = 'sample', statusLineMode = 'analysis', analysisLabelMode = 'analysis', showConflictStatus = false, conflictStatusLabel }: KanbanCardProps) {
  const { t } = useI18n();
  const translateColumnLabel = (label?: string | null) => {
    if (!label) return '';
    const keyByTitle: Record<string, string> = {
      Planned: "board.columns.planned",
      "Awaiting arrival": "board.columns.awaiting_arrival",
      Stored: "board.columns.stored",
      Issues: "board.columns.issues",
      "In progress": "board.columns.in_progress",
      "Needs attention": "board.columns.needs_attention",
      Completed: "board.columns.completed",
      "Uploaded batch": "board.columns.uploaded_batch",
      Conflicts: "board.columns.conflicts",
      Deleted: "board.columns.deleted",
    };
    const key = keyByTitle[label];
    return key ? t(key) : label;
  };
  const assigneeLabel = card.assignedTo?.trim().toLowerCase() === 'unassigned'
    ? t("board.card.unassigned")
    : card.assignedTo;
  const translateStorageLocation = (value?: string | null) => {
    if (!value) return '';
    return value
      .replace(/\bFridge\b/g, t("board.card.fridge"))
      .replace(/\bBin\b/g, t("board.card.bin"))
      .replace(/\bPlace\b/g, t("board.card.place"));
  };
  const storageLocationLabel = translateStorageLocation(card.storageLocation);
  const displayAnalysisType = (() => {
    if (card.analysisType === 'Conflict') return t("board.card.conflict");
    if (card.analysisType === 'Batch') return t("board.card.batch");
    return card.analysisType;
  })();
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick?.();
    }
  };
  const METHOD_ORDER = ['SARA', 'IR', 'Mass Spectrometry', 'Viscosity', 'Electrophoresis'];
  const methodRank = (name: string) => {
    const idx = METHOD_ORDER.findIndex((m) => m.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? idx : METHOD_ORDER.length + 100 + name.toLowerCase().charCodeAt(0);
  };
  const sortMethods = (methods: NonNullable<CardType['methods']>) =>
    [...methods].sort((a, b) => {
      const ia = methodRank(a.name);
      const ib = methodRank(b.name);
      if (ia === ib) return a.name.localeCompare(b.name);
      return ia - ib;
    });
  const analysisBadge = (() => {
    if (analysisLabelMode === 'column') {
      return { status: card.status, label: translateColumnLabel(card.analysisLabel ?? card.statusLabel) };
    }
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
  const warehouseSampleLabelMap: Record<string, string> = {
    new: t("board.columns.planned"),
    progress: t("board.columns.awaiting_arrival"),
    review: t("board.columns.stored"),
    done: t("board.columns.issues"),
  };
  const toDigits = (value: string) => value.replace(/\D/g, '');
  const wellValue = toDigits(card.wellId);
  const warehouseSampleLabel = warehouseSampleLabelMap[card.status] ?? translateColumnLabel(card.statusLabel);
  const sampleLabel = statusBadgeMode === 'sample' ? warehouseSampleLabel : translateColumnLabel(card.statusLabel);
  const badgeStatus = statusBadgeMode === 'analysis' ? analysisBadge.status : card.status;
  const badgeLabel =
    statusBadgeMode === 'analysis'
      ? analysisBadge.label
      : statusBadgeMode === 'column'
      ? translateColumnLabel(card.statusLabel)
      : sampleLabel;
  const statusLineLabel = statusLineMode === 'sample' ? t("board.card.sample") : t("board.card.analysis");
  const statusLineValue = statusLineMode === 'sample' ? warehouseSampleLabel : analysisBadge.label;
  const showBothStatusLines = statusLineMode === 'both';
  const conflictStatusMap: Record<CardType['status'], { status: CardType['status']; label: string }> = {
    new: { status: 'new', label: t("board.card.uploadedBatch") },
    progress: { status: 'progress', label: t("board.card.conflicts") },
    review: { status: 'progress', label: t("board.card.conflicts") },
    done: { status: 'done', label: t("board.card.stored") },
  };
  const resolvedConflictStatusLabel = conflictStatusLabel ?? t("board.card.conflictStatus");
  const conflictStatus = conflictStatusMap[card.status];

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', card.id);
  };

  const allMethodsDone =
    card.status === 'progress' &&
    (card.allMethodsDone ||
      (card.methods && card.methods.length > 0 && card.methods.every((m) => m.status === 'completed')));
  const hasAdminActions =
    adminActions &&
    (adminActions.onDelete ||
      adminActions.onRestore ||
      adminActions.onRestoreStored ||
      adminActions.onResolve ||
      adminActions.onReturn);

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      draggable
      onDragStart={handleDragStart}
      tabIndex={0}
      data-card-id={card.id}
      className={cn(
        'kanban-card',
        'border-border/60',
        allMethodsDone
          ? 'bg-emerald-900/70 border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]'
          : card.returnedFromAdmin
          ? 'bg-sky-900/50 border-sky-400 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
          : card.returnedToWarehouse
          ? 'bg-amber-900/50 border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
          : '',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {card.analysisType === 'Sample' ? card.sampleId : displayAnalysisType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {card.comments && card.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>{card.comments.length}</span>
            </div>
          )}
          <span className="flex items-center gap-1">
            <ClipboardList className="w-3 h-3 text-primary" />
            <StatusBadge status={badgeStatus} label={badgeLabel} />
          </span>
        </div>
      </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="space-y-1">
            {showBothStatusLines ? (
            <>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-3 h-3 text-primary" />
                <span className="text-foreground font-medium">{t("board.card.sample")}: {warehouseSampleLabel}</span>
                {assigneeLabel && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{assigneeLabel}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-3 h-3 text-primary" />
                <span className="text-foreground font-medium">{t("board.card.analysis")}: {analysisBadge.label}</span>
              </div>
            </>
            ) : (
              <div className="flex items-center gap-2">
                {statusLineMode === 'sample' ? (
                  <ClipboardList className="w-3 h-3 text-primary" />
                ) : (
                  <FlaskConical className="w-3 h-3 text-primary" />
                )}
                <span className="text-foreground font-medium">{statusLineLabel}: {statusLineValue}</span>
                {assigneeLabel && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{assigneeLabel}</span>
                  </span>
                )}
              </div>
            )}
            {showConflictStatus && (
              <div className="flex items-center gap-2">
                <CircleDot className="w-3 h-3 text-primary" />
                <span className="text-foreground font-medium">{resolvedConflictStatusLabel}: {conflictStatus.label}</span>
              </div>
            )}
          </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-foreground font-medium">{storageLocationLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>{t("board.card.sampling")} {card.samplingDate}</span>
          <span className="flex items-center gap-1 text-foreground font-semibold">
            <CircleDot className="w-3 h-3 text-primary" />
            {t("board.card.well")} {wellValue}
          </span>
          <span className="text-muted-foreground">{t("board.card.horizon")} {card.horizon}</span>
        </div>
        {card.deletedReason && card.statusLabel?.toLowerCase().includes('deleted') && (
          <div className="text-[11px] text-destructive leading-snug">
            {t("board.card.reason")}: {card.deletedReason}
          </div>
        )}
        {card.returnNote ? (
          <div className="text-[11px] text-destructive leading-snug">
            {t("board.card.returnNote")}: {card.returnNote}
          </div>
        ) : card.issueReason ? (
          <div className="text-[11px] text-destructive leading-snug">
            {t("board.card.issue")}: {card.issueReason}
          </div>
        ) : null}
        {card.methods && card.methods.length > 0 && (
          <div className="space-y-1">
            {sortMethods(card.methods).map((m) => (
              (() => {
                const isAllowed = canToggleMethod ? canToggleMethod(m, card) : true;
                const isDisabled = !onToggleMethod || readOnlyMethods;
                return (
              <label
                key={m.id}
                className="flex items-center gap-2 text-[11px] text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={m.status === 'completed'}
                  onCheckedChange={(val) => {
                    if (readOnlyMethods) return;
                    onToggleMethod?.(m.id, Boolean(val));
                  }}
                  disabled={isDisabled}
                  className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white data-[state=checked]:disabled:bg-primary data-[state=checked]:disabled:border-primary data-[state=checked]:disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
                />
                <span className="truncate flex-1">{getMethodLabel(m.name, t)}</span>
                {m.status === 'completed' && <span className="text-[10px] text-destructive font-semibold">{t("board.card.done")}</span>}
              </label>
                );
              })()
            ))}
          </div>
        )}
      </div>

      {hasAdminActions && (
        <div className="mt-2 flex items-center gap-2">
          <div className="ml-auto flex gap-2">
            <div className="flex gap-2">
              {!adminActions.isDeleted && (
                <>
                  {adminActions.onDelete && (
                    <button
                      className="text-[10px] px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminActions.onDelete?.();
                      }}
                    >
                      {t("board.card.delete")}
                    </button>
                  )}
                  {adminActions.isStored && adminActions.onRestoreStored && (
                    <button
                      className="text-[10px] px-2 py-1 rounded bg-emerald-900 text-emerald-100 hover:bg-emerald-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminActions.onRestoreStored?.();
                      }}
                    >
                      {t("board.card.restore")}
                    </button>
                  )}
                  {showStatusActions && adminActions.onResolve && (
                    <button
                      className="text-[10px] px-2 py-1 rounded bg-emerald-900 text-emerald-100 hover:bg-emerald-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminActions.onResolve?.();
                      }}
                    >
                      {t("board.card.storedAsNotResolved")}
                    </button>
                  )}
                  {showStatusActions && adminActions.onReturn && (
                    <button
                      className="text-[10px] px-2 py-1 rounded bg-amber-900 text-amber-100 hover:bg-amber-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminActions.onReturn?.();
                      }}
                    >
                      {t("board.card.returnForAnalysis")}
                    </button>
                  )}
                </>
              )}
              {adminActions.isDeleted && (
                <button
                  className="text-[10px] px-2 py-1 rounded bg-emerald-900 text-emerald-100 hover:bg-emerald-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    adminActions.onRestore?.();
                  }}
                >
                  {t("board.card.restore")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
