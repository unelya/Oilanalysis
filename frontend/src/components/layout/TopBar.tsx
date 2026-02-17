import { ChangeEvent, useMemo } from 'react';
import { Bell, Search, LogOut, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Role } from '@/types/kanban';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/i18n';

const allRoleOptionIds: Role[] = ['warehouse_worker', 'lab_operator', 'action_supervision', 'admin'];

interface TopBarProps {
  role?: Role;
  onRoleChange?: (role: Role) => void;
  searchTerm?: string;
  onSearch?: (value: string) => void;
  allowedRoles?: Role[];
  showNotificationDot?: boolean;
  notifications?: { id: string; title: string; description?: string; createdAt?: string }[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export function TopBar({ role, onRoleChange, searchTerm, onSearch, allowedRoles, showNotificationDot = false, notifications = [], onNotificationClick, onMarkAllRead }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const allRoleOptions: { id: Role; label: string }[] = [
    { id: 'warehouse_worker', label: t("common.warehouse") },
    { id: 'lab_operator', label: t("common.labOperator") },
    { id: 'action_supervision', label: t("common.actionSupervision") },
    { id: 'admin', label: t("common.admin") },
  ];
  const selectableRoles: Role[] =
    user?.role === 'admin'
      ? allRoleOptionIds
      : (allowedRoles && allowedRoles.length > 0 ? allowedRoles : user?.roles ?? (user?.role ? [user.role] : []));
  const selectedRole = role && selectableRoles.includes(role)
    ? role
    : selectableRoles[0] ?? user?.role ?? 'lab_operator';
  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const at = Date.parse(a.createdAt || '') || 0;
        const bt = Date.parse(b.createdAt || '') || 0;
        return bt - at;
      }),
    [notifications],
  );

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <div className="flex items-center">
          <img src="/tatneft.png" alt="Tatneft" className="h-9 w-auto max-w-[220px] object-contain" />
        </div>
        
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("topBar.searchPlaceholder")} 
            className="pl-9 bg-muted border-border/50 h-9 text-sm placeholder:text-muted-foreground/60"
            value={searchTerm ?? ''}
            onChange={handleSearch}
            aria-label={t("topBar.searchAria")}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Select value={selectedRole} onValueChange={(val) => onRoleChange?.(val as Role)}>
          <SelectTrigger className="w-64 h-9 text-sm bg-muted border-border/50">
            <SelectValue placeholder={t("topBar.rolePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {(user?.role === 'admin' ? allRoleOptions : allRoleOptions.filter((opt) => selectableRoles.includes(opt.id))).map(
              (opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <button
          type="button"
          className="p-2 rounded-md hover:bg-muted transition-colors"
          onClick={toggleTheme}
          aria-label={t("topBar.toggleTheme")}
          title={t("topBar.toggleTheme")}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label={t("topBar.notifications")}>
              <Bell className="h-5 w-5 text-muted-foreground" />
              {showNotificationDot && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{t("topBar.notifications")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{sortedNotifications.length}</span>
                {sortedNotifications.length > 0 && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={onMarkAllRead}
                  >
                    {t("topBar.markAllRead")}
                  </button>
                )}
              </div>
            </div>
            {sortedNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("topBar.noNotifications")}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sortedNotifications.map((note) => (
                  <button
                    key={note.id}
                    className="w-full text-left rounded-md border border-border/60 bg-muted/40 p-2 hover:bg-muted/70 transition-colors"
                    onClick={() => onNotificationClick?.(note.id)}
                  >
                    <p className="text-sm font-medium text-foreground">{note.title}</p>
                    {note.description && <p className="text-xs text-muted-foreground mt-1">{note.description}</p>}
                    {note.createdAt && (
                      <p className="text-[11px] text-muted-foreground/80 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.fullName ?? t("common.guest")}</p>
          </div>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
              {(user?.fullName ?? "G").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user ? (
            <button className="p-2 rounded-md hover:bg-muted transition-colors" onClick={logout} aria-label={t("topBar.logout")} title={t("topBar.logout")}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/login">{t("topBar.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
