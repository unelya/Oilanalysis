import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BackToTopButton } from "@/components/layout/BackToTopButton";
import { AdminEvent, createUser, deleteUser, fetchAdminEvents, fetchUsers, updateUser, updateUserMethodPermissions, updateUserRole } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ChevronDown, ChevronsUpDown, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { getMethodLabel } from "@/lib/method-labels";

const roleIds = ["warehouse_worker", "lab_operator", "action_supervision", "admin"] as const;
const methodOptions = ["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"];
const userGridCols = "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_120px]";
const eventEntityTypes = ["sample", "planned_analysis", "conflict", "user"];
const eventActions = [
  "created",
  "updated",
  "delete",
  "deleted",
  "status_change",
  "operator_assigned",
  "operator_unassigned",
  "role_changed",
  "method_permissions_changed",
  "password_reset_requested",
  "password_reset_completed",
  "password_changed",
];
const defaultUserPassword = "Tatneft123";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Admin = () => {
  const [users, setUsers] = useState<{ id: number; username: string; full_name: string; email?: string | null; role: string; roles: string[]; method_permissions: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("lab_operator");
  const [usernameEditorOpen, setUsernameEditorOpen] = useState(false);
  const [usernameConfirmOpen, setUsernameConfirmOpen] = useState(false);
  const [fullNameEditorOpen, setFullNameEditorOpen] = useState(false);
  const [fullNameConfirmOpen, setFullNameConfirmOpen] = useState(false);
  const [emailEditorOpen, setEmailEditorOpen] = useState(false);
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; username: string; currentUsername: string; currentFullName: string; currentEmail: string }>({
    id: 0,
    username: "",
    currentUsername: "",
    currentFullName: "",
    currentEmail: "",
  });
  const [editingUsername, setEditingUsername] = useState("");
  const [editingFullName, setEditingFullName] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventQuery, setEventQuery] = useState("");
  const [eventEntityType, setEventEntityType] = useState("");
  const [eventAction, setEventAction] = useState("");
  const [eventSort, setEventSort] = useState<"desc" | "asc">("desc");
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const roles = roleIds.map((id) => ({
    id,
    label:
      id === "warehouse_worker"
        ? t("common.warehouse")
        : id === "lab_operator"
        ? t("common.labOperator")
        : id === "action_supervision"
        ? t("common.actionSupervision")
        : t("common.admin"),
  }));
  const eventEntityLabels: Record<string, string> = {
    sample: t("admin.page.event.entities.sample"),
    planned_analysis: t("admin.page.event.entities.planned_analysis"),
    conflict: t("admin.page.event.entities.conflict"),
    user: t("admin.page.event.entities.user"),
  };
  const eventActionLabels: Record<string, string> = {
    created: t("admin.page.event.actions.created"),
    updated: t("admin.page.event.actions.updated"),
    delete: t("admin.page.event.actions.delete"),
    deleted: t("admin.page.event.actions.deleted"),
    status_change: t("admin.page.event.actions.status_change"),
    operator_assigned: t("admin.page.event.actions.operator_assigned"),
    operator_unassigned: t("admin.page.event.actions.operator_unassigned"),
    role_changed: t("admin.page.event.actions.role_changed"),
    method_permissions_changed: t("admin.page.event.actions.method_permissions_changed"),
    password_reset_requested: t("admin.page.event.actions.password_reset_requested"),
    password_reset_completed: t("admin.page.event.actions.password_reset_completed"),
    password_changed: t("admin.page.event.actions.password_changed"),
  };
  const eventDetailKeyLabels: Record<string, string> = {
    username: t("admin.page.event.details.keys.username"),
    email: t("admin.page.event.details.keys.email"),
    roles: t("admin.page.event.details.keys.roles"),
    methods: t("admin.page.event.details.keys.methods"),
    status: t("admin.page.event.details.keys.status"),
    well_id: t("admin.page.event.details.keys.well_id"),
    horizon: t("admin.page.event.details.keys.horizon"),
    sampling_date: t("admin.page.event.details.keys.sampling_date"),
    storage_location: t("admin.page.event.details.keys.storage_location"),
    assigned_to: t("admin.page.event.details.keys.assigned_to"),
    sample: t("admin.page.event.details.keys.sample"),
    method: t("admin.page.event.details.keys.method"),
    assignees: t("admin.page.event.details.keys.assignees"),
    target: t("admin.page.event.details.keys.target"),
    resolution_note: t("admin.page.event.details.keys.resolution_note"),
  };
  const localizeStatusValue = (value: string) => {
    const normalized = (value || "").trim().toLowerCase();
    const map: Record<string, string> = {
      planned: t("board.columns.planned"),
      in_progress: t("board.columns.in_progress"),
      review: t("board.columns.needs_attention"),
      completed: t("board.columns.completed"),
      failed: t("board.card.failed"),
      new: t("board.columns.planned"),
      progress: t("board.columns.in_progress"),
      done: t("board.columns.stored"),
      resolved: t("board.card.resolved"),
    };
    return map[normalized] ?? value;
  };
  const localizeRoleValue = (value: string) => {
    const normalized = (value || "").trim().toLowerCase();
    const map: Record<string, string> = {
      warehouse_worker: t("common.warehouse"),
      lab_operator: t("common.labOperator"),
      action_supervision: t("common.actionSupervision"),
      admin: t("common.admin"),
    };
    return map[normalized] ?? value;
  };
  const formatEventDetails = (event: AdminEvent) => {
    const raw = (event.details || "").trim();
    if (!raw) return "-";
    if (raw === "self_service") return t("admin.page.event.details.self_service");
    if (raw === "email_flow") return t("admin.page.event.details.email_flow");
    const segments = raw.split(";").map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) return raw;
    const formatValue = (key: string, value: string) => {
      const clean = value.trim();
      if (!clean) return "—";
      if (key === "status") return localizeStatusValue(clean);
      if (key === "roles") {
        return clean
          .split(",")
          .map((item) => localizeRoleValue(item.trim()))
          .join(", ");
      }
      return clean;
    };
    const formatted = segments.map((segment) => {
      const arrowIdx = segment.indexOf("->");
      if (arrowIdx > -1) {
        const left = segment.slice(0, arrowIdx).trim();
        const right = segment.slice(arrowIdx + 2).trim();
        const colonIdx = left.indexOf(":");
        if (colonIdx > -1) {
          const key = left.slice(0, colonIdx).trim();
          const oldValue = left.slice(colonIdx + 1).trim();
          const label = eventDetailKeyLabels[key] ?? key;
          return `${label}: ${formatValue(key, oldValue)} -> ${formatValue(key, right)}`;
        }
        return `${localizeStatusValue(left)} -> ${localizeStatusValue(right)}`;
      }
      const eqIdx = segment.indexOf("=");
      if (eqIdx > -1) {
        const key = segment.slice(0, eqIdx).trim();
        const value = segment.slice(eqIdx + 1).trim();
        const label = eventDetailKeyLabels[key] ?? key;
        return `${label}: ${formatValue(key, value)}`;
      }
      return segment;
    });
    return formatted.join("; ");
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      toast({
        title: t("admin.toast.failedLoadUsers"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    void loadEvents();
  }, []);

  const loadEvents = async (opts?: {
    eventQuery?: string;
    eventEntityType?: string;
    eventAction?: string;
    eventSort?: "desc" | "asc";
  }) => {
    const nextQuery = opts?.eventQuery ?? eventQuery;
    const nextEntityType = opts?.eventEntityType ?? eventEntityType;
    const nextAction = opts?.eventAction ?? eventAction;
    const nextSort = opts?.eventSort ?? eventSort;
    setEventsLoading(true);
    try {
      const data = await fetchAdminEvents({
        q: nextQuery || undefined,
        entityType: nextEntityType || undefined,
        action: nextAction || undefined,
        sort: nextSort,
        limit: 300,
      });
      setEvents(data);
    } catch (err) {
      toast({
        title: t("admin.toast.failedLoadEventLog"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setEventsLoading(false);
    }
  };

  const toggleRole = async (id: number, roleId: string, checked: boolean) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const nextRoles = checked ? Array.from(new Set([...user.roles, roleId])) : user.roles.filter((r) => r !== roleId);
    setSavingId(id);
    try {
      const updated = await updateUserRole(id, nextRoles);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role: updated.role, roles: updated.roles, method_permissions: updated.method_permissions || [] } : u
        )
      );
      void loadEvents();
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    const username = newUsername.trim();
    const fullName = newFullName.trim();
    const email = newEmail.trim().toLowerCase();
    const role = newRole.trim();
    if (!username) {
      toast({ title: t("admin.toast.usernameRequired"), variant: "destructive" });
      return;
    }
    if (!fullName) {
      toast({ title: t("admin.toast.fullNameRequired"), variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: t("admin.toast.defaultRoleRequired"), variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: t("admin.toast.emailRequired"), variant: "destructive" });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: t("admin.toast.invalidEmail"), variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createUser({
        username,
        fullName,
        email,
        role,
      });
      setUsers((prev) => [
        ...prev,
        {
          id: created.id,
          username: created.username,
          full_name: created.full_name,
          email: created.email,
          role: created.role,
          roles: created.roles,
          method_permissions: created.method_permissions || [],
        },
      ]);
      setNewUsername("");
      setNewFullName("");
      setNewEmail("");
      setNewRole("lab_operator");
      void loadEvents();
      toast({
        title: t("admin.toast.userCreated"),
        description: t("admin.toast.defaultPassword", { password: created.default_password }),
      });
    } catch (err) {
      toast({
        title: t("admin.toast.failedCreateUser"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSavingId(id);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      void loadEvents();
    } catch (err) {
      toast({
        title: t("admin.toast.failedDeleteUser"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openUsernameEditor = (user: { id: number; username: string; full_name: string; email?: string | null }) => {
    const currentEmail = (user.email ?? "").trim().toLowerCase();
    setEditingUser({
      id: user.id,
      username: user.username,
      currentUsername: user.username,
      currentFullName: user.full_name,
      currentEmail,
    });
    setEditingUsername(user.username);
    setUsernameEditorOpen(true);
  };

  const requestUsernameUpdate = () => {
    const nextUsername = editingUsername.trim();
    if (!nextUsername) {
      toast({ title: t("admin.toast.usernameRequired"), variant: "destructive" });
      return;
    }
    if (nextUsername === editingUser.currentUsername) {
      setUsernameEditorOpen(false);
      return;
    }
    setUsernameConfirmOpen(true);
  };

  const confirmUsernameUpdate = async () => {
    const nextUsername = editingUsername.trim();
    if (!nextUsername) return;
    setUsernameConfirmOpen(false);
    setSavingId(editingUser.id);
    try {
      const updated = await updateUser(editingUser.id, { username: nextUsername });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                username: updated.username,
                full_name: updated.full_name,
                email: updated.email,
                role: updated.role,
                roles: updated.roles,
                method_permissions: updated.method_permissions || u.method_permissions,
              }
            : u
        )
      );
      setUsernameEditorOpen(false);
      void loadEvents();
      toast({ title: t("admin.toast.usernameUpdated") });
    } catch (err) {
      toast({
        title: t("admin.toast.failedUpdateUsername"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openFullNameEditor = (user: { id: number; username: string; full_name: string; email?: string | null }) => {
    const currentEmail = (user.email ?? "").trim().toLowerCase();
    setEditingUser({
      id: user.id,
      username: user.username,
      currentUsername: user.username,
      currentFullName: user.full_name,
      currentEmail,
    });
    setEditingFullName(user.full_name);
    setFullNameEditorOpen(true);
  };

  const requestFullNameUpdate = () => {
    const nextFullName = editingFullName.trim();
    if (!nextFullName) {
      toast({ title: t("admin.toast.fullNameRequired"), variant: "destructive" });
      return;
    }
    if (nextFullName === editingUser.currentFullName) {
      setFullNameEditorOpen(false);
      return;
    }
    setFullNameConfirmOpen(true);
  };

  const confirmFullNameUpdate = async () => {
    const nextFullName = editingFullName.trim();
    if (!nextFullName) return;
    setFullNameConfirmOpen(false);
    setSavingId(editingUser.id);
    try {
      const updated = await updateUser(editingUser.id, { full_name: nextFullName });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                username: updated.username,
                full_name: updated.full_name,
                email: updated.email,
                role: updated.role,
                roles: updated.roles,
                method_permissions: updated.method_permissions || u.method_permissions,
              }
            : u
        )
      );
      setFullNameEditorOpen(false);
      void loadEvents();
      toast({ title: t("admin.toast.fullNameUpdated") });
    } catch (err) {
      toast({
        title: t("admin.toast.failedUpdateFullName"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openEmailEditor = (user: { id: number; username: string; full_name: string; email?: string | null }) => {
    const currentEmail = (user.email ?? "").trim().toLowerCase();
    setEditingUser({
      id: user.id,
      username: user.username,
      currentUsername: user.username,
      currentFullName: user.full_name,
      currentEmail,
    });
    setEditingEmail(currentEmail);
    setEmailEditorOpen(true);
  };

  const requestEmailUpdate = () => {
    const nextEmail = editingEmail.trim().toLowerCase();
    if (!nextEmail) {
      toast({ title: t("admin.toast.emailRequired"), variant: "destructive" });
      return;
    }
    if (!isValidEmail(nextEmail)) {
      toast({ title: t("admin.toast.invalidEmail"), variant: "destructive" });
      return;
    }
    if (nextEmail === editingUser.currentEmail) {
      setEmailEditorOpen(false);
      return;
    }
    setEmailConfirmOpen(true);
  };

  const confirmEmailUpdate = async () => {
    const nextEmail = editingEmail.trim().toLowerCase();
    if (!nextEmail) return;
    setEmailConfirmOpen(false);
    setSavingId(editingUser.id);
    try {
      const updated = await updateUser(editingUser.id, { email: nextEmail });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                email: updated.email,
                role: updated.role,
                roles: updated.roles,
                method_permissions: updated.method_permissions || u.method_permissions,
              }
            : u
        )
      );
      setEmailEditorOpen(false);
      void loadEvents();
      toast({ title: t("admin.toast.emailUpdated") });
    } catch (err) {
      toast({
        title: t("admin.toast.failedUpdateEmail"),
        description: err instanceof Error ? err.message : t("admin.toast.backendUnreachable"),
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleMethodPermission = async (id: number, methodName: string, checked: boolean) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const nextMethods = checked
      ? Array.from(new Set([...(user.method_permissions || []), methodName]))
      : (user.method_permissions || []).filter((m) => m !== methodName);
    setSavingId(id);
    try {
      const updated = await updateUserMethodPermissions(id, nextMethods);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, role: updated.role, roles: updated.roles, method_permissions: updated.method_permissions || [] }
            : u
        )
      );
      void loadEvents();
    } finally {
      setSavingId(null);
    }
  };

  const visibleEvents = eventLogOpen ? events : events.slice(0, 10);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="space-y-2 mb-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("common.admin")}</p>
            <h2 className="text-2xl font-semibold text-foreground">{t("admin.page.usersRolesTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.page.usersRolesSubtitle")}</p>
          </div>
          <Separator />
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70 p-4">
            <div className={`grid ${userGridCols} gap-3`}>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{t("login.username")}</label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder={t("admin.page.placeholders.username")} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{t("admin.page.fullName")}</label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder={t("admin.page.placeholders.fullName")} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{t("login.email")}</label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t("admin.page.placeholders.email")} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{t("admin.page.defaultRole")}</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-end">
                <Button onClick={handleCreate} disabled={creating || !newUsername.trim() || !newFullName.trim() || !newEmail.trim() || !newRole.trim()}>
                  {creating ? t("admin.page.creating") : t("admin.page.createUser")}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("admin.page.defaultPasswordForNewUsers")} <span className="font-mono text-foreground">{defaultUserPassword}</span>.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70">
            <div className={`grid ${userGridCols} gap-3 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/60`}>
              <div>{t("login.username")}</div>
              <div>{t("admin.page.fullName")}</div>
              <div>{t("login.email")}</div>
              <div>{t("admin.page.roles")}</div>
              <div className="text-right">{t("admin.page.actions")}</div>
            </div>
            <div className="divide-y divide-border/60">
              {users.map((user) => (
                <div key={user.id} className={`grid ${userGridCols} gap-3 items-start px-4 py-3 text-sm text-foreground`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-mono text-primary">{user.username}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openUsernameEditor(user)}
                      disabled={savingId === user.id}
                      aria-label={t("admin.page.aria.changeUsername", { username: user.username })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">{user.full_name}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openFullNameEditor(user)}
                      disabled={savingId === user.id}
                      aria-label={t("admin.page.aria.changeFullName", { username: user.username })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-muted-foreground">{user.email || "—"}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEmailEditor(user)}
                      disabled={savingId === user.id}
                      aria-label={t("admin.page.aria.changeEmail", { username: user.username })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => {
                          const label = roles.find((opt) => opt.id === r)?.label ?? r;
                          return (
                            <Badge key={r} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          );
                        })}
                        {user.roles.length === 0 && <span className="text-xs text-muted-foreground">{t("admin.page.noRolesYet")}</span>}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>{t("admin.page.selectRoles")}</span>
                            <ChevronsUpDown className="h-4 w-4 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandEmpty>{t("admin.page.noRolesFound")}</CommandEmpty>
                            <CommandGroup>
                              {roles.map((r) => {
                                const selected = user.roles.includes(r.id);
                                return (
                                  <CommandItem
                                    key={r.id}
                                    onSelect={() => toggleRole(user.id, r.id, !selected)}
                                    className="flex items-center gap-2"
                                  >
                                    <div
                                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                                        selected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                                      }`}
                                    >
                                      {selected && <Check className="h-3 w-3" />}
                                    </div>
                                    <span>{r.label}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {user.roles.includes("lab_operator") && (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {(user.method_permissions || []).map((m) => (
                              <Badge key={m} variant="outline" className="text-xs">
                                {getMethodLabel(m, t)}
                              </Badge>
                            ))}
                            {(user.method_permissions || []).length === 0 && (
                              <span className="text-xs text-muted-foreground">{t("admin.page.noMethodPermissions")}</span>
                            )}
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between">
                                <span>{t("admin.page.methodPermissions")}</span>
                                <ChevronsUpDown className="h-4 w-4 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <Command>
                                <CommandEmpty>{t("admin.page.noMethodsFound")}</CommandEmpty>
                                <CommandGroup>
                                  {methodOptions.map((methodName) => {
                                    const selected = (user.method_permissions || []).includes(methodName);
                                    return (
                                      <CommandItem
                                        key={methodName}
                                        onSelect={() => toggleMethodPermission(user.id, methodName, !selected)}
                                        className="flex items-center gap-2"
                                      >
                                        <div
                                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                                            selected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                                          }`}
                                        >
                                          {selected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span>{getMethodLabel(methodName, t)}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      disabled={savingId === user.id}
                    >
                      {t("board.card.delete")}
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">{loading ? t("admin.page.loadingUsers") : t("admin.page.noUsersFound")}</div>
              )}
            </div>
          </div>
          <div className="space-y-2 mb-4 mt-8">
            <h2 className="text-2xl font-semibold text-foreground">{t("admin.page.eventLogTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.page.eventLogSubtitle")}</p>
            <div className="pt-1">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-2">
                <Input
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder={t("admin.page.searchEventsPlaceholder")}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventEntityType}
                  onChange={(e) => setEventEntityType(e.target.value)}
                >
                  <option value="">{t("admin.page.allEntities")}</option>
                  {eventEntityTypes.map((entity) => (
                    <option key={entity} value={entity}>
                      {eventEntityLabels[entity] ?? entity}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventAction}
                  onChange={(e) => setEventAction(e.target.value)}
                >
                  <option value="">{t("admin.page.allActions")}</option>
                  {eventActions.map((actionName) => (
                    <option key={actionName} value={actionName}>
                      {eventActionLabels[actionName] ?? actionName}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventSort}
                  onChange={(e) => setEventSort(e.target.value as "desc" | "asc")}
                >
                  <option value="desc">{t("admin.page.newestFirst")}</option>
                  <option value="asc">{t("admin.page.oldestFirst")}</option>
                </select>
                <Button size="sm" className="h-10" onClick={() => loadEvents()} disabled={eventsLoading}>
                  {t("admin.page.applyFilters")}
                </Button>
                <Button
                  size="sm"
                  className="h-10"
                  variant="outline"
                  onClick={() => {
                    setEventQuery("");
                    setEventEntityType("");
                    setEventAction("");
                    setEventSort("desc");
                    void loadEvents({
                      eventQuery: "",
                      eventEntityType: "",
                      eventAction: "",
                      eventSort: "desc",
                    });
                  }}
                  disabled={eventsLoading}
                >
                  {t("board.reset")}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  {eventsLoading ? t("admin.page.loading") : t("admin.page.showingCount", { shown: visibleEvents.length, total: events.length })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setEventLogOpen((prev) => !prev)}
                  aria-label={eventLogOpen ? t("admin.page.collapseEventLog") : t("admin.page.expandEventLog")}
                  title={eventLogOpen ? t("admin.page.showTop10") : t("admin.page.showFullList")}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${eventLogOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
          </div>
          <Separator />
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70">
            <div className="grid grid-cols-[180px_140px_140px_160px_minmax(0,1fr)] gap-3 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/60">
              <div>{t("admin.page.timestamp")}</div>
              <div>{t("admin.page.actor")}</div>
              <div>{t("admin.page.entity")}</div>
              <div>{t("admin.page.action")}</div>
              <div className="pl-3">{t("admin.page.details")}</div>
            </div>
            <div className={`${eventLogOpen ? "divide-y divide-border/60" : "max-h-96 overflow-auto divide-y divide-border/60"}`}>
              {visibleEvents.map((event) => (
                <div key={event.id} className="grid grid-cols-[180px_140px_140px_160px_minmax(0,1fr)] gap-3 items-start px-4 py-2 text-sm text-foreground">
                  <div className="text-xs text-muted-foreground">{new Date(event.performed_at).toLocaleString()}</div>
                  <div className="truncate">{event.performed_by || t("admin.page.system")}</div>
                  <div className="truncate">
                    {event.entity_type}:{event.entity_id}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {eventActionLabels[event.action] ?? event.action}
                    </Badge>
                  </div>
                  <div className="pl-3 whitespace-pre-wrap break-words text-muted-foreground">{formatEventDetails(event)}</div>
                </div>
              ))}
              {visibleEvents.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  {eventsLoading ? t("admin.page.loadingEvents") : t("admin.page.noEventsForFilters")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BackToTopButton />
      <Dialog open={usernameEditorOpen} onOpenChange={setUsernameEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.page.dialogs.updateUsername.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.page.dialogs.updateUsername.description")} <span className="font-medium text-foreground">{editingUser.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-user-username">{t("login.username")}</Label>
            <Input
              id="edit-user-username"
              value={editingUsername}
              onChange={(e) => setEditingUsername(e.target.value)}
              placeholder={t("admin.page.placeholders.username")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsernameEditorOpen(false)}>
              {t("board.cancel")}
            </Button>
            <Button onClick={requestUsernameUpdate} disabled={savingId === editingUser.id}>
              {t("admin.page.dialogs.updateUsername.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={usernameConfirmOpen} onOpenChange={setUsernameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.page.dialogs.confirmUsername.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.page.dialogs.confirmUsername.description")} <span className="font-medium text-foreground">{editingUser.currentUsername}</span> {t("admin.page.dialogs.to")}{" "}
              <span className="font-medium text-foreground">{editingUsername.trim()}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("board.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUsernameUpdate}>{t("admin.page.dialogs.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={fullNameEditorOpen} onOpenChange={setFullNameEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.page.dialogs.updateFullName.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.page.dialogs.updateFullName.description")} <span className="font-medium text-foreground">{editingUser.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-user-full-name">{t("admin.page.fullName")}</Label>
            <Input
              id="edit-user-full-name"
              value={editingFullName}
              onChange={(e) => setEditingFullName(e.target.value)}
              placeholder={t("admin.page.placeholders.fullName")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFullNameEditorOpen(false)}>
              {t("board.cancel")}
            </Button>
            <Button onClick={requestFullNameUpdate} disabled={savingId === editingUser.id}>
              {t("admin.page.dialogs.updateFullName.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={fullNameConfirmOpen} onOpenChange={setFullNameConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.page.dialogs.confirmFullName.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.page.dialogs.confirmFullName.description")} <span className="font-medium text-foreground">{editingUser.currentFullName}</span> {t("admin.page.dialogs.to")}{" "}
              <span className="font-medium text-foreground">{editingFullName.trim()}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("board.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFullNameUpdate}>{t("admin.page.dialogs.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={emailEditorOpen} onOpenChange={setEmailEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.page.dialogs.updateEmail.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.page.dialogs.updateEmail.description")} <span className="font-medium text-foreground">{editingUser.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">{t("login.email")}</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={editingEmail}
              onChange={(e) => setEditingEmail(e.target.value)}
              placeholder={t("admin.page.placeholders.email")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailEditorOpen(false)}>
              {t("board.cancel")}
            </Button>
            <Button onClick={requestEmailUpdate} disabled={savingId === editingUser.id}>
              {t("admin.page.dialogs.updateEmail.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.page.dialogs.confirmEmail.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.page.dialogs.confirmEmail.description")} <span className="font-medium text-foreground">{editingUser.username}</span> {t("admin.page.dialogs.to")}{" "}
              <span className="font-medium text-foreground">{editingEmail.trim().toLowerCase()}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("board.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmailUpdate}>{t("admin.page.dialogs.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
