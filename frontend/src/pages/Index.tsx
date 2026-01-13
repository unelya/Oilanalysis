import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Role } from '@/types/kanban';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const [role, setRole] = useState<Role>('lab_operator');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<{ id: string; title: string; description?: string }[]>([]);
  const [notificationClickId, setNotificationClickId] = useState<string | null>(null);
  const [markAllReadToken, setMarkAllReadToken] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
    }
  }, [user]);

  const allowedRoles = user?.role === 'admin' ? undefined : user?.roles ?? (user?.role ? [user.role] : undefined);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        role={role}
        onRoleChange={setRole}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        allowedRoles={allowedRoles}
        showNotificationDot={(role === 'warehouse_worker' || role === 'lab_operator' || role === 'action_supervision' || role === 'admin') && notifications.length > 0}
        notifications={notifications}
        onNotificationClick={(id) => setNotificationClickId(id)}
        onMarkAllRead={() => setMarkAllReadToken((prev) => prev + 1)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <KanbanBoard
          role={role}
          searchTerm={searchTerm}
          onNotificationsChange={setNotifications}
          notificationClickId={notificationClickId}
          markAllReadToken={markAllReadToken}
          onNotificationConsumed={() => setNotificationClickId(null)}
        />
      </div>
    </div>
  );
};

export default Index;
