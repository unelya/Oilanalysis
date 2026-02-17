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

const roles = [
  { id: "warehouse_worker", label: "Warehouse" },
  { id: "lab_operator", label: "Lab Operator" },
  { id: "action_supervision", label: "Action Supervision" },
  { id: "admin", label: "Admin" },
];
const methodOptions = ["SARA", "IR", "Mass Spectrometry", "Viscosity"];
const userGridCols = "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_120px]";
const eventEntityTypes = ["sample", "planned_analysis", "conflict", "user"];
const eventActions = [
  "created",
  "updated",
  "deleted",
  "status_change",
  "operator_assigned",
  "operator_unassigned",
  "role_changed",
  "method_permissions_changed",
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
  const [emailEditorOpen, setEmailEditorOpen] = useState(false);
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; username: string; currentEmail: string }>({
    id: 0,
    username: "",
    currentEmail: "",
  });
  const [editingEmail, setEditingEmail] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventQuery, setEventQuery] = useState("");
  const [eventEntityType, setEventEntityType] = useState("");
  const [eventAction, setEventAction] = useState("");
  const [eventSort, setEventSort] = useState<"desc" | "asc">("desc");
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
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
        title: "Failed to load event log",
        description: err instanceof Error ? err.message : "Backend unreachable",
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
      toast({ title: "Username required", variant: "destructive" });
      return;
    }
    if (!fullName) {
      toast({ title: "Full name required", variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: "Default role required", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
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
        title: "User created",
        description: `Default password: ${created.default_password}`,
      });
    } catch (err) {
      toast({
        title: "Failed to create user",
        description: err instanceof Error ? err.message : "Backend unreachable",
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
        title: "Failed to delete user",
        description: err instanceof Error ? err.message : "Backend unreachable",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const openEmailEditor = (user: { id: number; username: string; email?: string | null }) => {
    const currentEmail = (user.email ?? "").trim().toLowerCase();
    setEditingUser({ id: user.id, username: user.username, currentEmail });
    setEditingEmail(currentEmail);
    setEmailEditorOpen(true);
  };

  const requestEmailUpdate = () => {
    const nextEmail = editingEmail.trim().toLowerCase();
    if (!nextEmail) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    if (!isValidEmail(nextEmail)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
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
      toast({ title: "Email updated" });
    } catch (err) {
      toast({
        title: "Failed to update email",
        description: err instanceof Error ? err.message : "Backend unreachable",
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
            <h2 className="text-2xl font-semibold text-foreground">Users & roles</h2>
            <p className="text-sm text-muted-foreground">Create users, edit roles, or delete accounts.</p>
          </div>
          <Separator />
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70 p-4">
            <div className={`grid ${userGridCols} gap-3`}>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Username</label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. lab.tech" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Full name</label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="e.g. Ivan Petrov" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Email</label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. user@company.com" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Default role</label>
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
                  {creating ? "Creating..." : "Create user"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Default password for new users: <span className="font-mono text-foreground">{defaultUserPassword}</span>.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70">
            <div className={`grid ${userGridCols} gap-3 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/60`}>
              <div>Username</div>
              <div>Full name</div>
              <div>Email</div>
              <div>Roles</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-border/60">
              {users.map((user) => (
                <div key={user.id} className={`grid ${userGridCols} gap-3 items-start px-4 py-3 text-sm text-foreground`}>
                  <div className="font-mono text-primary">{user.username}</div>
                  <div>{user.full_name}</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-muted-foreground">{user.email || "—"}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEmailEditor(user)}
                      disabled={savingId === user.id}
                      aria-label={`Change email for ${user.username}`}
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
                        {user.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles yet</span>}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>Select roles</span>
                            <ChevronsUpDown className="h-4 w-4 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandEmpty>No roles found.</CommandEmpty>
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
                                {m}
                              </Badge>
                            ))}
                            {(user.method_permissions || []).length === 0 && (
                              <span className="text-xs text-muted-foreground">No method permissions</span>
                            )}
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between">
                                <span>Method permissions</span>
                                <ChevronsUpDown className="h-4 w-4 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <Command>
                                <CommandEmpty>No methods found.</CommandEmpty>
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
                                        <span>{methodName}</span>
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
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">{loading ? "Loading users..." : "No users found."}</div>
              )}
            </div>
          </div>
          <div className="space-y-2 mb-4 mt-8">
            <h2 className="text-2xl font-semibold text-foreground">Event log</h2>
            <p className="text-sm text-muted-foreground">Review workflow activity with filters, sorting, and search.</p>
            <div className="pt-1">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-2">
                <Input
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="Search details, actor, action..."
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventEntityType}
                  onChange={(e) => setEventEntityType(e.target.value)}
                >
                  <option value="">All entities</option>
                  {eventEntityTypes.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventAction}
                  onChange={(e) => setEventAction(e.target.value)}
                >
                  <option value="">All actions</option>
                  {eventActions.map((actionName) => (
                    <option key={actionName} value={actionName}>
                      {actionName}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventSort}
                  onChange={(e) => setEventSort(e.target.value as "desc" | "asc")}
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
                <Button size="sm" className="h-10" onClick={() => loadEvents()} disabled={eventsLoading}>
                  Apply filters
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
                  Reset
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  {eventsLoading ? "Loading..." : `Showing ${visibleEvents.length} of ${events.length}`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setEventLogOpen((prev) => !prev)}
                  aria-label={eventLogOpen ? "Collapse event log to top 10 entries" : "Expand event log to full list"}
                  title={eventLogOpen ? "Show top 10" : "Show full list"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${eventLogOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
          </div>
          <Separator />
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70">
            <div className="grid grid-cols-[180px_140px_140px_120px_minmax(0,1fr)] gap-3 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/60">
              <div>Timestamp</div>
              <div>Actor</div>
              <div>Entity</div>
              <div>Action</div>
              <div>Details</div>
            </div>
            <div className={`${eventLogOpen ? "divide-y divide-border/60" : "max-h-96 overflow-auto divide-y divide-border/60"}`}>
              {visibleEvents.map((event) => (
                <div key={event.id} className="grid grid-cols-[180px_140px_140px_120px_minmax(0,1fr)] gap-3 items-start px-4 py-2 text-sm text-foreground">
                  <div className="text-xs text-muted-foreground">{new Date(event.performed_at).toLocaleString()}</div>
                  <div className="truncate">{event.performed_by || "System"}</div>
                  <div className="truncate">
                    {event.entity_type}:{event.entity_id}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {event.action}
                    </Badge>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-muted-foreground">{event.details || "-"}</div>
                </div>
              ))}
              {visibleEvents.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  {eventsLoading ? "Loading events..." : "No events found for current filters."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BackToTopButton />
      <Dialog open={emailEditorOpen} onOpenChange={setEmailEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update user email</DialogTitle>
            <DialogDescription>
              Change the email for <span className="font-medium text-foreground">{editingUser.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">Email</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={editingEmail}
              onChange={(e) => setEditingEmail(e.target.value)}
              placeholder="e.g. user@company.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={requestEmailUpdate} disabled={savingId === editingUser.id}>
              Save email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm email change</AlertDialogTitle>
            <AlertDialogDescription>
              Update <span className="font-medium text-foreground">{editingUser.username}</span> email to{" "}
              <span className="font-medium text-foreground">{editingEmail.trim().toLowerCase()}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmailUpdate}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
