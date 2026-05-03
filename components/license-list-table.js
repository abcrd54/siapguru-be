"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

function statusTone(status) {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "danger";
}

function syncTone(status) {
  if (status === "success") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function packageLabel(features) {
  if (features?.reports && features?.grades && features?.modules && features?.questions && features?.ai_question_generation && features?.cloud_sync) {
    return "full";
  }

  if (!features?.reports && !features?.grades && features?.modules && features?.questions) {
    return "modul_soal";
  }

  if (features?.reports || features?.grades) {
    return "raport";
  }

  return "full";
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LicenseListTable({ licenses }) {
  const [editingId, setEditingId] = useState(null);
  const editingLicense = useMemo(() => licenses.find((license) => license.id === editingId) ?? null, [editingId, licenses]);

  return (
    <>
      <Table className="min-w-[1120px]">
        <THead>
          <TR>
            <TH>License</TH>
            <TH>Owner</TH>
            <TH>Status</TH>
            <TH>Sync</TH>
            <TH>Runtime</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {licenses.map((license) => (
            <TR key={license.id}>
              <TD className="min-w-[220px]">
                <div className="font-semibold text-slate-950">{license.license_key}</div>
                <div className="mt-1 text-xs text-muted-foreground">lifetime / guru</div>
              </TD>
              <TD className="min-w-[180px]">
                <div>{license.teacher_name}</div>
                <div className="text-xs text-muted-foreground">{license.school_name}</div>
                <div className="text-xs text-muted-foreground">{license.teacher_phone || "-"}</div>
              </TD>
              <TD>
                <Badge tone={statusTone(license.status)}>{license.status || "active"}</Badge>
              </TD>
              <TD className="min-w-[140px]">
                <div className="space-y-1">
                  <Badge tone={syncTone(license.firebase_sync_status)}>{license.firebase_sync_status || "pending"}</Badge>
                  <div className="text-xs text-muted-foreground">{formatDate(license.firebase_synced_at)}</div>
                </div>
              </TD>
              <TD className="min-w-[240px]">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    Device {(license.license_devices?.[0]?.count ?? 0)}/{license.max_devices}
                  </div>
                  <div>Paket: {packageLabel(license.features)}</div>
                  <div>Dibuat oleh {license.created_by || "owner_dashboard"}</div>
                  <div>Aktif default tanpa expired</div>
                </div>
              </TD>
              <TD className="min-w-[100px]">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setEditingId(license.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {editingLicense ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-5xl rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-700">Edit License</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{editingLicense.license_key}</h3>
                <p className="mt-2 text-sm text-slate-500">Perubahan akan disimpan ke Supabase lalu langsung dikirim ulang ke Firebase.</p>
              </div>
              <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setEditingId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form action={`/api/admin/licenses/${editingLicense.id}`} method="post" className="max-h-[calc(100vh-10rem)] overflow-y-auto p-6">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama guru</label>
                      <Input name="teacher_name" defaultValue={editingLicense.teacher_name || ""} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama sekolah</label>
                      <Input name="school_name" defaultValue={editingLicense.school_name || ""} required />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">No. HP guru</label>
                      <Input name="teacher_phone" defaultValue={editingLicense.teacher_phone || ""} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alamat guru</label>
                      <Input name="teacher_address" defaultValue={editingLicense.teacher_address || ""} required />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Paket fitur</label>
                      <Select name="feature_package" defaultValue={packageLabel(editingLicense.features)}>
                        <option value="raport">raport_only</option>
                        <option value="modul_soal">modul_dan_soal</option>
                        <option value="full">full_bundle</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select name="status" defaultValue={editingLicense.status || "active"}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="expired">expired</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max devices</label>
                      <Input name="max_devices" type="number" min="1" defaultValue={editingLicense.max_devices || 1} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Catatan</label>
                    <Textarea name="notes" defaultValue={editingLicense.notes || ""} className="min-h-[120px]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Features JSON opsional</label>
                    <Textarea
                      name="features"
                      defaultValue=""
                      placeholder={JSON.stringify(editingLicense.features || {}, null, 2)}
                      className="min-h-[260px] font-mono text-xs"
                    />
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-950">Status sync terakhir</p>
                    <p className="mt-2">Firebase: {editingLicense.firebase_sync_status || "pending"}</p>
                    <p className="mt-1">Terakhir sync: {formatDate(editingLicense.firebase_synced_at)}</p>
                    {editingLicense.last_sync_error ? <p className="mt-2 text-rose-600">{editingLicense.last_sync_error}</p> : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
