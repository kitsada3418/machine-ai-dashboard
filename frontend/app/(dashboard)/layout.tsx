"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/production", label: "Production" },
  { href: "/machines", label: "Machines" },
  { href: "/alarms", label: "Alarm Center" },
  { href: "/admin", label: "Administration" },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const socket = getSocket();
    const handleConnect = () => setLive(true);
    const handleDisconnect = () => setLive(false);
    const handleEvent = () => setLive(true);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    for (const name of Object.values(SOCKET_EVENTS)) {
      socket.on(name, handleEvent);
    }
    setLive(socket.connected);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      for (const name of Object.values(SOCKET_EVENTS)) {
        socket.off(name, handleEvent);
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  const navItems = NAV_ITEMS.filter(
    (item) => isAdmin || item.href !== "/admin",
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="h-3 w-3 rounded-full bg-accent" />
          <div>
            <p className="text-sm font-semibold tracking-wide">
              Smart Factory
            </p>
            <p className="text-[11px] text-muted">Monitoring System</p>
          </div>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-panel font-medium text-accent"
                    : "text-muted hover:bg-panel hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <p className="truncate text-xs text-foreground">{user.name}</p>
          <p className="truncate font-mono text-[11px] text-muted">
            {user.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${live ? "bg-running" : "bg-alarm"}`}
              />
              {live ? "Live" : "Offline"}
            </span>
            <span className="inline-flex rounded border border-border bg-panel px-1.5 py-0.5 text-[10px] text-muted">
              {user.role}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
          <h1 className="text-sm font-medium tracking-wide text-foreground">
            {pathname === "/"
              ? "Factory Overview"
              : navItems.find((item) => pathname.startsWith(item.href))
                  ?.label ?? "Dashboard"}
          </h1>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-border bg-panel px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            Sign Out
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
