"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  AuditLogItem,
  MachineListItem,
  Paginated,
  PublicUser,
  Role,
  SettingItem,
} from "@/lib/types";

type Tab = "users" | "machines" | "mqtt" | "audit";

const ROLES: Role[] = ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR", "VIEWER"];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("users");

  if (user?.role !== "ADMIN" && user?.role !== "MANAGER") {
    return (
      <div className="rounded-lg border border-border bg-panel p-6 text-sm text-muted">
        You do not have permission to view this page.
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "machines", label: "Machines" },
    { id: "mqtt", label: "MQTT Configuration" },
    ...(user.role === "ADMIN" ? [{ id: "audit" as Tab, label: "Audit Logs" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded border px-3 py-2 text-xs md:py-1.5 transition-colors ${
              tab === item.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-panel text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab canManage={user.role === "ADMIN"} />}
      {tab === "machines" && <MachinesTab canManage={user.role === "ADMIN"} />}
      {tab === "mqtt" && <MqttTab canEdit={user.role === "ADMIN"} />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function UsersTab({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OPERATOR");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<PublicUser[]>("/users"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<PublicUser>("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("OPERATOR");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id: string, nameToDelete: string) => {
    if (!window.confirm(`Delete user ${nameToDelete}?`)) {
      return;
    }
    try {
      await apiFetch<{ success: boolean }>(`/users/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Users</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded bg-accent px-3 py-2 text-xs md:py-1.5 font-semibold text-background hover:opacity-90"
          >
            {showForm ? "Cancel" : "+ New User"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <form
          onSubmit={createUser}
          className="grid grid-cols-2 gap-3 border-b border-border bg-surface p-4 md:grid-cols-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8)"
            required
            minLength={8}
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="flex-1 rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-accent px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="border-b border-border px-4 py-2 text-xs text-alarm">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Created</th>
              {canManage && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="px-4 py-2.5">{u.name}</td>
                <td className="px-4 py-2.5 font-mono text-muted">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      u.role === "ADMIN"
                        ? "border-alarm/50 bg-alarm/10 text-alarm"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-muted">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteUser(u.id, u.name)}
                      className="text-[11px] text-alarm hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

function MachinesTab({ canManage }: { canManage: boolean }) {
  const [machines, setMachines] = useState<MachineListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setMachines(await apiFetch<MachineListItem[]>("/machines"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machines");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createMachine = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<MachineListItem>("/machines", {
        method: "POST",
        body: JSON.stringify({
          machineCode: code,
          machineName: name,
          lineName: line,
          machineType: type,
        }),
      });
      setCode("");
      setName("");
      setLine("");
      setType("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMachine = async (machineCode: string) => {
    if (!window.confirm(`Delete machine ${machineCode}?`)) {
      return;
    }
    try {
      await apiFetch<{ success: boolean }>(`/machines/${machineCode}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Machines</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded bg-accent px-3 py-2 text-xs md:py-1.5 font-semibold text-background hover:opacity-90"
          >
            {showForm ? "Cancel" : "+ New Machine"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <form
          onSubmit={createMachine}
          className="grid grid-cols-2 gap-3 border-b border-border bg-surface p-4 md:grid-cols-5"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (e.g. M031)"
            required
            pattern="[A-Za-z0-9_-]{2,32}"
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Machine name"
            required
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Line (e.g. Line A)"
            required
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Type (e.g. CNC)"
            required
            className="rounded border border-border bg-panel px-3 py-2 text-xs outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      {error && (
        <p className="border-b border-border px-4 py-2 text-xs text-alarm">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Line</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">MQTT Topic</th>
              {canManage && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="px-4 py-2.5 font-mono font-semibold">
                  {m.machineCode}
                </td>
                <td className="px-4 py-2.5">{m.machineName}</td>
                <td className="px-4 py-2.5 text-muted">{m.machineType}</td>
                <td className="px-4 py-2.5 text-muted">{m.lineName}</td>
                <td className="px-4 py-2.5 text-muted">{m.status}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">
                  {m.mqttTopic}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteMachine(m.machineCode)}
                      className="text-[11px] text-alarm hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MQTT Configuration
// ---------------------------------------------------------------------------

function MqttTab({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const items = await apiFetch<SettingItem[]>("/settings");
      setSettings(items);
      setValues(Object.fromEntries(items.map((item) => [item.key, item.value])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (key: string) => {
    setSaving(key);
    setError(null);
    try {
      const updated = await apiFetch<SettingItem>(`/settings/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ value: values[key] }),
      });
      setSettings((prev) =>
        prev.map((item) => (item.key === key ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">MQTT Configuration</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          Broker settings used by the backend. These values are read from the
          backend environment on startup; editing them here records the
          configuration in the system settings table.
        </p>
      </div>
      {error && (
        <p className="border-b border-border px-4 py-2 text-xs text-alarm">{error}</p>
      )}
      <div className="flex flex-col">
        {settings.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3"
          >
            <div className="w-64 shrink-0">
              <p className="font-mono text-xs font-semibold">{item.key}</p>
              {item.description && (
                <p className="text-[11px] text-muted">{item.description}</p>
              )}
            </div>
            <input
              value={values[item.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [item.key]: e.target.value }))
              }
              readOnly={!canEdit}
              className={`flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent ${
                canEdit ? "" : "opacity-60"
              }`}
            />
            {canEdit && (
              <button
                type="button"
                disabled={saving === item.key}
                onClick={() => void save(item.key)}
                className="rounded bg-accent px-3 py-2 text-xs md:py-1.5 font-semibold text-background hover:opacity-90 disabled:opacity-50"
              >
                {saving === item.key ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

function AuditTab() {
  const [logs, setLogs] = useState<Paginated<AuditLogItem> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    try {
      setLogs(
        await apiFetch<Paginated<AuditLogItem>>(
          `/audit-logs?page=${page}&pageSize=${PAGE_SIZE}`,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = logs ? Math.max(1, Math.ceil(logs.total / PAGE_SIZE)) : 1;

  return (
    <section className="rounded-lg border border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Audit Logs</h2>
      </div>
      {error && (
        <p className="border-b border-border px-4 py-2 text-xs text-alarm">{error}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {(logs?.items ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border/60">
                <td className="px-4 py-2.5 font-mono text-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 font-mono text-muted">
                  {log.userEmail ?? "system"}
                </td>
                <td className="px-4 py-2.5 font-mono text-accent">{log.action}</td>
                <td className="px-4 py-2.5 text-muted">{log.description ?? "â€”"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded border border-border bg-surface px-3 py-2 text-xs md:py-1.5 text-muted hover:text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        <span className="font-mono text-[11px] text-muted">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-border bg-surface px-3 py-2 text-xs md:py-1.5 text-muted hover:text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}

