import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchUsers, updateUserRole } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="space-y-2 mb-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
            <h2 className="text-2xl font-semibold text-foreground">Users & roles</h2>
            <p className="text-sm text-muted-foreground">Edit a user role; changes are saved immediately.</p>
          </div>
          <Separator />
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
                  <div className="text-muted-foreground">
                    {savingId === user.id ? "Saving..." : loading ? "Syncing..." : "Active"}
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
