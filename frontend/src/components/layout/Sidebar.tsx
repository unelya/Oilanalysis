import { useEffect, useState } from 'react';
import { LayoutGrid, FlaskConical, BarChart3, Settings, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { fetchPlannedAnalyses, fetchSamples } from '@/lib/api';
import { mockActions } from '@/data/actions';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function NavItem({ icon, label, to, count }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className="nav-item w-full"
      activeClassName="nav-item-active"
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const roles = user?.roles ?? (user?.role ? [user.role] : []);
  const canSeeActions = roles.includes('action_supervision') || roles.includes('admin');
  const canSeeAdmin = roles.includes('admin');
  const [sampleCount, setSampleCount] = useState<number | undefined>(undefined);
  const [actionCount] = useState<number>(mockActions.length);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [samples, analyses] = await Promise.all([fetchSamples(), fetchPlannedAnalyses()]);
        const ids = new Set<string>();
        samples.forEach((sample) => {
          const id = sample.sampleId?.trim();
          if (id) ids.add(id);
        });
        analyses.forEach((analysis) => {
          const id = analysis.sampleId?.trim();
          if (id) ids.add(id);
        });
        if (active) setSampleCount(ids.size);
      } catch {
        if (active) setSampleCount(undefined);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        <NavItem 
          to="/board"
          icon={<LayoutGrid className="h-4 w-4" />} 
          label={t("common.board")}
        />
        <NavItem 
          to="/samples"
          icon={<FlaskConical className="h-4 w-4" />} 
          label={t("common.samples")} 
          count={sampleCount}
        />
        {canSeeActions && (
          <NavItem 
            to="/actions"
            icon={<ClipboardList className="h-4 w-4" />} 
            label={t("common.actions")} 
            count={actionCount}
          />
        )}
        {canSeeAdmin && (
          <NavItem 
            to="/admin"
            icon={<BarChart3 className="h-4 w-4" />} 
            label={t("common.admin")} 
          />
        )}
        {canSeeAdmin && (
          <NavItem 
            to="/settings"
            icon={<Settings className="h-4 w-4" />} 
            label={t("common.settings")} 
          />
        )}
      </nav>
    </aside>
  );
}
