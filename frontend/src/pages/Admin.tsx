import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { createUser, deleteUser, fetchUsers, updateUserRole } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roles = [
  { id: "warehouse_worker", label: "Warehouse" },
  { id: "lab_operator", label: "Lab Operator" },
  { id: "action_supervision", label: "Action Supervision" },
  { id: "admin", label: "Admin" },
];

const Admin = () => {
  const [users, setUsers] = useState<{ id: number; username: string; full_name: string; role: string; roles: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("lab_operator");
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
  }, []);

  const toggleRole = async (id: number, roleId: string, checked: boolean) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const nextRoles = checked ? Array.from(new Set([...user.roles, roleId])) : user.roles.filter((r) => r !== roleId);
    setSavingId(id);
    try {
      const updated = await updateUserRole(id, nextRoles);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: updated.role, roles: updated.roles } : u)));
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    const username = newUsername.trim();
    if (!username) {
      toast({ title: "Username required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createUser({
        username,
        fullName: newFullName.trim() || undefined,
        role: newRole,
      });
      setUsers((prev) => [
        ...prev,
        {
          id: created.id,
          username: created.username,
          full_name: created.full_name,
          role: created.role,
          roles: created.roles,
        },
      ]);
      setNewUsername("");
      setNewFullName("");
      setNewRole("lab_operator");
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
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Username</label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. lab.tech" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Full name</label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Optional" />
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
              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create user"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              New users are created with a default password shown after creation.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/70">
            <div className="grid grid-cols-4 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b border-border/60">
              <div>Username</div>
              <div>Full name</div>
              <div>Roles</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-border/60">
              {users.map((user) => (
                <div key={user.id} className="grid grid-cols-4 items-start px-4 py-3 text-sm text-foreground gap-2">
                  <div className="font-mono text-primary">{user.username}</div>
                  <div>{user.full_name}</div>
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
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{savingId === user.id ? "Saving..." : loading ? "Syncing..." : "Active"}</span>
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
        </div>
      </div>
    </div>
  );
};

export default Admin;
