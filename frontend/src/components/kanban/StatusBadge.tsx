import { cn } from '@/lib/utils';
import { Status } from '@/types/kanban';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  new: { label: 'New', className: 'status-new' },
  progress: { label: 'In Progress', className: 'status-progress' },
  review: { label: 'Review', className: 'status-review' },
  done: { label: 'Done', className: 'status-done' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {label ?? config.label}
    </span>
  );
}
