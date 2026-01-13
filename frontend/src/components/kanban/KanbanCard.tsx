import { Calendar, ClipboardList, CircleDot, FlaskConical, MapPin, MessageSquare, User } from 'lucide-react';
import { KanbanCard as CardType } from '@/types/kanban';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

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

export function KanbanCard({ card, onClick, onToggleMethod, canToggleMethod, readOnlyMethods, adminActions, showStatusActions = false, statusBadgeMode = 'sample', statusLineMode = 'analysis', analysisLabelMode = 'analysis', showConflictStatus = false, conflictStatusLabel = 'Conflict status' }: KanbanCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick?.();
    }
  };
  const METHOD_ORDER = ['SARA', 'IR', 'Mass Spectrometry', 'Viscosity'];
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
      return { status: card.status, label: card.analysisLabel ?? card.statusLabel };
    }
    const normalized = card.analysisStatus?.toLowerCase() ?? 'planned';
    switch (normalized) {
      case 'in_progress':
        return { status: 'progress', label: 'In progress' };
      case 'review':
        return { status: 'review', label: 'Needs attention' };
      case 'completed':
        return { status: 'done', label: 'Completed' };
      case 'failed':
        return { status: 'review', label: 'Failed' };
      default:
        return { status: 'new', label: 'Planned' };
    }
  })();
  const warehouseSampleLabelMap: Record<string, string> = {
    new: 'Planned',
    progress: 'Awaiting arrival',
    review: 'Stored',
    done: 'Issues',
  };
  const toDigits = (value: string) => value.replace(/\D/g, '');
  const wellValue = toDigits(card.wellId);
  const warehouseSampleLabel = warehouseSampleLabelMap[card.status] ?? card.statusLabel;
  const sampleLabel = statusBadgeMode === 'sample' ? warehouseSampleLabel : card.statusLabel;
  const badgeStatus = statusBadgeMode === 'analysis' ? analysisBadge.status : card.status;
  const badgeLabel =
    statusBadgeMode === 'analysis'
      ? analysisBadge.label
      : statusBadgeMode === 'column'
      ? card.statusLabel
      : sampleLabel;
  const statusLineLabel = statusLineMode === 'sample' ? 'Sample' : 'Analysis';
  const statusLineValue = statusLineMode === 'sample' ? warehouseSampleLabel : analysisBadge.label;
  const showBothStatusLines = statusLineMode === 'both';
  const conflictStatusMap: Record<CardType['status'], { status: CardType['status']; label: string }> = {
    new: { status: 'new', label: 'Uploaded batch' },
    progress: { status: 'progress', label: 'Conflicts' },
    review: { status: 'progress', label: 'Conflicts' },
    done: { status: 'done', label: 'Stored' },
  };
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
            {card.analysisType === 'Sample' ? card.sampleId : card.analysisType}
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
                <span className="text-foreground font-medium">Sample: {warehouseSampleLabel}</span>
                {card.assignedTo && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{card.assignedTo}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-3 h-3 text-primary" />
                <span className="text-foreground font-medium">Analysis: {analysisBadge.label}</span>
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
                {card.assignedTo && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{card.assignedTo}</span>
                  </span>
                )}
              </div>
            )}
            {showConflictStatus && (
              <div className="flex items-center gap-2">
                <CircleDot className="w-3 h-3 text-primary" />
                <span className="text-foreground font-medium">{conflictStatusLabel}: {conflictStatus.label}</span>
              </div>
            )}
          </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-foreground font-medium">{card.storageLocation}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>Sampling {card.samplingDate}</span>
          <span className="flex items-center gap-1 text-foreground font-semibold">
            <CircleDot className="w-3 h-3 text-primary" />
            Well {wellValue}
          </span>
          <span className="text-muted-foreground">Horizon {card.horizon}</span>
        </div>
        {card.deletedReason && card.statusLabel?.toLowerCase().includes('deleted') && (
          <div className="text-[11px] text-destructive leading-snug">
            Reason: {card.deletedReason}
          </div>
        )}
        {card.issueReason && (
          <div className="text-[11px] text-destructive leading-snug">
            Issue: {card.issueReason}
          </div>
        )}
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
                <span className="truncate flex-1">{m.name}</span>
                {m.status === 'completed' && <span className="text-[10px] text-destructive font-semibold">Done</span>}
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
                      Delete
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
                      Restore
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
                      Stored as not-resolved
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
                      Return for analysis
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
                  Restore
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
