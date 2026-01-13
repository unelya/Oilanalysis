import { CheckCircle2, Circle } from 'lucide-react';
import { AnalysisCheck } from '@/types/kanban';
import { cn } from '@/lib/utils';

interface AnalysisProgressProps {
  analyses: AnalysisCheck[];
  compact?: boolean;
}

export function AnalysisProgress({ analyses, compact = true }: AnalysisProgressProps) {
  const completed = analyses.filter(a => a.checked).length;
  const total = analyses.length;
  const allComplete = completed === total;
  
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                analysis.checked ? 'bg-success' : 'bg-muted-foreground/30'
              )}
              title={`${analysis.label}: ${analysis.checked ? 'Complete' : 'Pending'}`}
            />
          ))}
        </div>
        <span className={cn(
          'text-xs font-mono',
          allComplete ? 'text-success' : 'text-muted-foreground'
        )}>
          {completed}/{total}
        </span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {analyses.map((analysis) => (
        <div key={analysis.id} className="flex items-center gap-2">
          {analysis.checked ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground/50" />
          )}
          <span className={cn(
            'text-sm',
            analysis.checked ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {analysis.label}
          </span>
        </div>
      ))}
    </div>
  );
}
