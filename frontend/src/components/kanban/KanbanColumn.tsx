import { Plus } from 'lucide-react';
import { KanbanColumn as ColumnType, KanbanCard as CardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: ColumnType;
  onCardClick: (card: CardType) => void;
  onDropCard: (cardId: string) => void;
  showAdd?: boolean;
  onAdd?: () => void;
  onToggleMethod?: (methodId: number, done: boolean) => void;
  canToggleMethod?: (method: NonNullable<CardType['methods']>[number], card: CardType) => boolean;
  lockNeedsAttention?: boolean;
  showStatusActions?: boolean;
  statusBadgeMode?: 'sample' | 'analysis' | 'column';
  statusLineMode?: 'analysis' | 'sample' | 'both';
  analysisLabelMode?: 'analysis' | 'column';
  showConflictStatus?: boolean;
  conflictStatusLabel?: string;
  columnColorClass?: string;
  adminActions?: {
    onResolve?: (card: CardType) => void;
    onReturn?: (card: CardType) => void;
    onDelete?: (card: CardType) => void;
    onRestore?: (card: CardType) => void;
    onRestoreStored?: (card: CardType) => void;
    isDeleted?: (card: CardType) => boolean;
    isStored?: (card: CardType) => boolean;
  };
}

const columnColors = {
  new: 'border-t-status-new',
  progress: 'border-t-status-progress',
  review: 'border-t-status-review',
  done: 'border-t-status-done',
};

export function KanbanColumn({ column, onCardClick, onDropCard, showAdd = false, onAdd, onToggleMethod, canToggleMethod, lockNeedsAttention = false, adminActions, showStatusActions = false, statusBadgeMode = 'sample', statusLineMode = 'analysis', analysisLabelMode = 'analysis', showConflictStatus = false, conflictStatusLabel, columnColorClass }: KanbanColumnProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain');
    if (cardId) onDropCard(cardId);
  };

  return (
    <div
      className={cn('kanban-column flex flex-col border-t-2 h-full', columnColorClass ?? columnColors[column.id])}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between p-3 bg-column-header rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-foreground">{column.title}</h3>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
            {column.cards.length}
          </span>
        </div>
        {showAdd && (
          <button className="p-1 hover:bg-muted rounded transition-colors" onClick={onAdd} aria-label="Add new sample">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      
      <div
        className="flex-1 min-h-[80px] p-2 space-y-2 overflow-y-auto scrollbar-thin"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {column.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            onToggleMethod={onToggleMethod}
            canToggleMethod={canToggleMethod}
            readOnlyMethods={lockNeedsAttention && card.status === 'review'}
            showStatusActions={showStatusActions}
            statusBadgeMode={statusBadgeMode}
            statusLineMode={statusLineMode}
            analysisLabelMode={analysisLabelMode}
            showConflictStatus={showConflictStatus}
            conflictStatusLabel={conflictStatusLabel}
            adminActions={
              adminActions && card.analysisType === 'Sample'
                ? {
                    onResolve: card.adminStored ? undefined : () => adminActions.onResolve(card),
                    onReturn: card.adminStored ? undefined : () => adminActions.onReturn(card),
                    onDelete: adminActions.onDelete ? () => adminActions.onDelete!(card) : undefined,
                    onRestore: adminActions.onRestore ? () => adminActions.onRestore!(card) : undefined,
                    isDeleted: adminActions.isDeleted ? adminActions.isDeleted(card) : false,
                    onRestoreStored: adminActions.onRestoreStored ? () => adminActions.onRestoreStored!(card) : undefined,
                    isStored: adminActions.isStored ? adminActions.isStored(card) : false,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
