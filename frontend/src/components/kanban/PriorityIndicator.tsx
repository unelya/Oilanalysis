import { cn } from '@/lib/utils';

interface PriorityIndicatorProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const priorityConfig = {
  low: { color: 'bg-muted-foreground/40', label: 'Low' },
  medium: { color: 'bg-primary', label: 'Medium' },
  high: { color: 'bg-warning', label: 'High' },
  critical: { color: 'bg-destructive', label: 'Critical' },
};

export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  const config = priorityConfig[priority];
  
  return (
    <div className="flex items-center gap-1.5" title={`${config.label} Priority`}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.color)} />
    </div>
  );
}
