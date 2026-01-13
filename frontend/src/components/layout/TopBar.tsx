import { ChangeEvent } from 'react';
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

const allRoleOptions: { id: Role; label: string }[] = [
  { id: 'warehouse_worker', label: 'Warehouse' },
  { id: 'lab_operator', label: 'Lab Operator' },
  { id: 'action_supervision', label: 'Action Supervision' },
  { id: 'admin', label: 'Admin' },
];

interface TopBarProps {
  role?: Role;
  onRoleChange?: (role: Role) => void;
  searchTerm?: string;
  onSearch?: (value: string) => void;
  allowedRoles?: Role[];
  showNotificationDot?: boolean;
  notifications?: { id: string; title: string; description?: string }[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export function TopBar({ role, onRoleChange, searchTerm, onSearch, allowedRoles, showNotificationDot = false, notifications = [], onNotificationClick, onMarkAllRead }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const selectableRoles: Role[] =
    user?.role === 'admin'
      ? allRoleOptions.map((r) => r.id)
      : (allowedRoles && allowedRoles.length > 0 ? allowedRoles : user?.roles ?? (user?.role ? [user.role] : []));
  const selectedRole = role && selectableRoles.includes(role)
    ? role
    : selectableRoles[0] ?? user?.role ?? 'lab_operator';

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-mono font-bold text-sm">LS</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">LabSync</span>
        </div>
        
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search samples, analyses, or IDs..." 
            className="pl-9 bg-muted border-border/50 h-9 text-sm placeholder:text-muted-foreground/60"
            value={searchTerm ?? ''}
            onChange={handleSearch}
            aria-label="Search samples and analyses"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Select value={selectedRole} onValueChange={(val) => onRoleChange?.(val as Role)}>
          <SelectTrigger className="w-48 h-9 text-sm bg-muted border-border/50">
            <SelectValue placeholder="Role" />
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
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {showNotificationDot && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{notifications.length}</span>
                {notifications.length > 0 && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={onMarkAllRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new notifications.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((note) => (
                  <button
                    key={note.id}
                    className="w-full text-left rounded-md border border-border/60 bg-muted/40 p-2 hover:bg-muted/70 transition-colors"
                    onClick={() => onNotificationClick?.(note.id)}
                  >
                    <p className="text-sm font-medium text-foreground">{note.title}</p>
                    {note.description && <p className="text-xs text-muted-foreground mt-1">{note.description}</p>}
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.fullName ?? "Guest"}</p>
            <p className="text-xs text-muted-foreground">{user?.role ?? "Not signed in"}</p>
          </div>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
              {(user?.fullName ?? "G").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user ? (
            <button className="p-2 rounded-md hover:bg-muted transition-colors" onClick={logout}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
