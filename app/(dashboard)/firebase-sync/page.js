import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getSyncLogs } from "@/lib/data";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { formatDate } from "@/lib/utils";

export default async function FirebaseSyncPage() {
  const logs = await getSyncLogs();

  return (
    <>
      <SectionHeader
        eyebrow="Firebase Sync"
        title="Kompatibilitas lisensi untuk desktop lama"
        description="Backend membaca service account dari file lokal yang di-ignore git. Tombol sync tersedia di menu license, sedangkan halaman ini dipakai untuk memeriksa status sinkronisasi."
      />

      <Card>
        <CardHeader>
          <CardDescription>Status konfigurasi</CardDescription>
          <CardTitle>{isFirebaseConfigured() ? "Configured" : "Not configured"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Atur `FIREBASE_SERVICE_ACCOUNT_PATH` agar sync ke collection `licenses` bisa berjalan.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Sinkronisasi</CardTitle>
          <CardDescription>Setiap create atau retry sync akan mencatat payload dan status ke database.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>License</TH>
                <TH>Status</TH>
                <TH>Provider</TH>
                <TH>Error</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((log) => (
                <TR key={log.id}>
                  <TD>{formatDate(log.synced_at)}</TD>
                  <TD>
                    <div className="font-semibold">{log.licenses?.license_key || "-"}</div>
                    <div className="text-xs text-muted-foreground">{log.licenses?.teacher_name || "-"}</div>
                  </TD>
                  <TD>
                    <Badge tone={log.status === "success" ? "success" : "danger"}>{log.status}</Badge>
                  </TD>
                  <TD>{log.provider}</TD>
                  <TD className="max-w-md text-xs text-muted-foreground">{log.error_message || "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
