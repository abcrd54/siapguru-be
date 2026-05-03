import { Save } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getProviderSettings } from "@/lib/data";
import { maskSecret } from "@/lib/mask";

export default async function ProviderSettingsPage() {
  const settings = await getProviderSettings();

  return (
    <>
      <SectionHeader
        eyebrow="Konfigurasi API"
        title="Simpan provider secret hanya di backend"
        description="Nilai yang sudah tersimpan ditampilkan dalam bentuk masked. Browser tidak perlu melihat secret penuh setelah save."
      />

      <Card>
        <CardHeader>
          <CardTitle>Provider Settings</CardTitle>
          <CardDescription>Row ini dipakai semua endpoint desktop untuk OpenRouter dan Cloudinary.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/admin/provider-settings/save" method="post" className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">OpenRouter</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">OpenRouter API key</label>
              <Input name="openrouter_api_key" placeholder={settings?.openrouter_api_key ? maskSecret(settings.openrouter_api_key) : "sk-or-v1-..."} />
              <p className="text-xs text-muted-foreground">Kosongkan bila tidak ingin mengganti key yang tersimpan.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model AI aktif</label>
              <Input
                name="openrouter_model"
                defaultValue={settings?.openrouter_model || ""}
                placeholder="inclusionai/ling-2.6-1t:free"
                required
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">Cloudinary</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cloud name</label>
              <Input
                name="cloudinary_cloud_name"
                defaultValue={settings?.cloudinary_cloud_name || ""}
                placeholder="siapguru-cloud"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cloudinary API key</label>
              <Input name="cloudinary_api_key" placeholder={settings?.cloudinary_api_key ? maskSecret(settings.cloudinary_api_key) : "248936..."} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cloudinary API secret</label>
              <Input name="cloudinary_api_secret" placeholder={settings?.cloudinary_api_secret ? maskSecret(settings.cloudinary_api_secret) : "••••••••"} />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Simpan Konfigurasi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
