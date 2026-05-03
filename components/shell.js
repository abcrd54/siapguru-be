import Link from "next/link";
import { ArrowUpRight, ClipboardList, KeyRound, LaptopMinimalCheck, LayoutDashboard, RefreshCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider-settings", label: "Konfigurasi API", icon: Settings2 },
  { href: "/licenses", label: "License Generator", icon: KeyRound },
  { href: "/licenses/list", label: "Daftar License", icon: ClipboardList },
  { href: "/devices", label: "Aktivasi Desktop", icon: LaptopMinimalCheck },
  { href: "/firebase-sync", label: "Firebase Sync", icon: RefreshCcw },
];

export function AppShell({ children, profile }) {
  return (
    <div className="min-h-screen">
      <div className="w-full px-4 py-4 lg:px-6 xl:px-8">
        <aside className="dashboard-surface panel-border hidden lg:fixed lg:inset-y-4 lg:left-6 lg:z-20 lg:flex lg:w-[292px] lg:flex-col lg:rounded-2xl lg:p-4 lg:shadow-ambient">
          <div className="rounded-xl bg-slate-950 p-6 text-white">
            <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-200">SiapGuru Owner</p>
            <h1 className="mt-4 text-[28px] font-semibold leading-tight">Dashboard kontrol lisensi dan provider desktop.</h1>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">{profile?.full_name || "Owner"}</p>
              <p className="mt-1 text-sm text-slate-300">{profile?.role || "owner"}</p>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-950 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-white/10 group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Single-owner access</p>
            <p className="mt-1 text-sm text-slate-500">Panel ini disusun untuk kontrol cepat, bukan operasi LMS penuh.</p>
            <form action="/api/auth/logout" method="post" className="mt-4">
              <Button type="submit" variant="outline" className="w-full bg-white">
                Keluar
              </Button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 lg:ml-[316px]">
          <div className="dashboard-surface panel-border min-h-[calc(100vh-2rem)] rounded-2xl p-4 shadow-ambient md:p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between rounded-xl border bg-white px-5 py-4 lg:hidden">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-700">SiapGuru Owner</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">Control dashboard</p>
              </div>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="outline">
                  Keluar
                </Button>
              </form>
            </div>
            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
