import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function LicensesPage() {
  return (
    <>
      <SectionHeader
        eyebrow="License Generator"
        title="Generate license guru"
        description="Halaman ini khusus untuk membuat license baru. Daftar license dipisah ke menu sendiri agar alurnya lebih rapi dan fokus."
      />

      <Card className="border-0 bg-white">
        <CardHeader className="border-b pb-5">
          <CardTitle>Buat License Baru</CardTitle>
          <CardDescription>Isi data utama guru dan pilih paket fitur. Semua aturan lisensi lain diatur otomatis oleh backend.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action="/api/admin/licenses/create" method="post" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama guru</label>
                    <Input name="teacher_name" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama sekolah</label>
                    <Input name="school_name" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">No. HP guru</label>
                    <Input name="teacher_phone" placeholder="08xxxxxxxxxx" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alamat guru</label>
                    <Input name="teacher_address" placeholder="Alamat lengkap" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Paket fitur</label>
                    <Select name="feature_package" defaultValue="full">
                      <option value="raport">raport_only</option>
                      <option value="modul_soal">modul_dan_soal</option>
                      <option value="full">full_bundle</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max devices</label>
                    <Input name="max_devices" type="number" min="1" defaultValue="1" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Catatan</label>
                  <Textarea name="notes" placeholder="Catatan internal admin" className="min-h-[120px]" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">Aturan otomatis backend</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Status default selalu active.</p>
                    <p>Tipe license selalu lifetime.</p>
                    <p>Role license selalu guru.</p>
                    <p>Runtime desktop membaca data yang sudah synced ke Firebase.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Features JSON opsional</label>
                  <Textarea
                    name="features"
                    placeholder="Kosongkan untuk memakai preset paket fitur"
                    className="min-h-[220px] font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="min-w-[220px]">
                Generate License
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
