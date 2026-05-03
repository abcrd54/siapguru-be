import { ArrowUpRight, CheckCircle2, Cloud, Cpu, KeyRound, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/data";
import { maskSecret } from "@/lib/mask";

function MetricCard({ title, value, helper, icon: Icon }) {
  return (
    <Card className="overflow-hidden border-0 bg-white">
      <CardContent className="p-0">
        <div className="flex items-start justify-between px-6 pb-5 pt-6">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="border-t bg-slate-50 px-6 py-4 text-sm text-slate-500">{helper}</div>
      </CardContent>
    </Card>
  );
}

function statusTone(enabled) {
  return enabled ? "success" : "warning";
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const settings = summary.settings;

  const openRouterReady = Boolean(settings?.openrouter_api_key);
  const cloudinaryReady = Boolean(settings?.cloudinary_api_key && settings?.cloudinary_cloud_name);

  return (
    <>
      <SectionHeader
        eyebrow="Overview"
        title="Full control dashboard untuk jalur lisensi, provider AI, dan device activation."
        description="Halaman ini dirapikan sebagai pusat kontrol utama. Fokusnya tetap sempit: provider secret, distribusi license key, validasi desktop, dan kompatibilitas Firebase."
      />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-0 bg-slate-950 text-white">
          <CardContent className="p-0">
            <div className="grid gap-8 px-7 py-7 lg:grid-cols-[1.3fr_0.9fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Owner Control Layer
                </div>
                <h3 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight lg:text-4xl">
                  Semua secret provider tetap di backend, desktop hanya lewat jalur yang Anda kontrol.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  Desain admin ini dibuat sebagai panel operasional ringan: bukan LMS, bukan dashboard ramai, hanya titik kontrol yang benar-benar dipakai aplikasi desktop.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">OpenRouter</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone={statusTone(openRouterReady)}>{openRouterReady ? "Configured" : "Not ready"}</Badge>
                    <Cpu className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p className="mt-3 text-sm text-slate-200">
                    {openRouterReady ? maskSecret(settings.openrouter_api_key) : "API key belum disimpan."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Cloudinary</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone={statusTone(cloudinaryReady)}>{cloudinaryReady ? "Configured" : "Not ready"}</Badge>
                    <Cloud className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p className="mt-3 text-sm text-slate-200">
                    {cloudinaryReady ? settings.cloudinary_cloud_name : "Cloudinary belum lengkap."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white">
          <CardHeader className="pb-3">
            <CardDescription>Flow aktif</CardDescription>
            <CardTitle className="text-2xl">Jalur operasi utama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {[
              "Owner menyimpan provider secret di backend admin.",
              "License key dibuat dan didistribusikan dari panel ini.",
              "Desktop mengirim validasi lisensi ke endpoint admin yang dijaga token.",
              "Generate soal dan upload file hanya lewat backend terpusat.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border bg-slate-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="License aktif"
          value={summary.activeLicenses}
          helper="Jumlah lisensi yang saat ini aktif dan dapat dipakai desktop."
          icon={KeyRound}
        />
        <MetricCard
          title="Perangkat aktif"
          value={summary.activeDevices}
          helper="Total perangkat yang pernah tervalidasi di jalur backend admin."
          icon={ShieldCheck}
        />
        <MetricCard
          title="Status AI"
          value={openRouterReady ? "Ready" : "Setup"}
          helper={openRouterReady ? settings.openrouter_model || "Model aktif tersimpan." : "OpenRouter belum siap dipakai."}
          icon={Cpu}
        />
        <MetricCard
          title="Status Cloud"
          value={cloudinaryReady ? "Ready" : "Setup"}
          helper={cloudinaryReady ? settings.cloudinary_cloud_name : "Cloudinary belum lengkap."}
          icon={Cloud}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-0 bg-white">
          <CardHeader>
            <CardDescription>Provider summary</CardDescription>
            <CardTitle>Konfigurasi backend yang sedang dipakai</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-950">OpenRouter API key</p>
                <Badge tone={statusTone(openRouterReady)}>{openRouterReady ? "Aman" : "Kosong"}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {openRouterReady ? maskSecret(settings.openrouter_api_key) : "Belum ada API key tersimpan."}
              </p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-950">Model AI aktif</p>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-3 break-words text-sm text-slate-500">{settings?.openrouter_model || "Belum diatur"}</p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-950">Cloudinary cloud</p>
                <Badge tone={statusTone(Boolean(settings?.cloudinary_cloud_name))}>
                  {settings?.cloudinary_cloud_name ? "Tersedia" : "Kosong"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">{settings?.cloudinary_cloud_name || "Belum diatur"}</p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-950">Cloud API key</p>
                <Badge tone={statusTone(Boolean(settings?.cloudinary_api_key))}>
                  {settings?.cloudinary_api_key ? "Aman" : "Kosong"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {settings?.cloudinary_api_key ? maskSecret(settings.cloudinary_api_key) : "Belum ada API key tersimpan."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
          <CardHeader>
            <CardDescription className="text-slate-300">Principles</CardDescription>
            <CardTitle className="text-2xl text-white">Batasan scope tetap ketat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-200">
            <p>Admin ini sengaja dibuat clean dan fokus agar tidak bercampur dengan fitur akademik harian.</p>
            <p>Yang dikelola hanya empat hal: provider AI, provider cloud, lisensi guru, dan status perangkat desktop.</p>
            <p>Dengan layout baru ini, area kerja terasa lebih luas untuk operasional harian tanpa noise yang tidak perlu.</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
