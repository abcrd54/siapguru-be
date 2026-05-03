import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getDevices } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <>
      <SectionHeader
        eyebrow="Aktivasi Desktop"
        title="Perangkat yang memakai license key"
        description="Tabel ini diisi saat desktop memanggil activate atau validate. Device limit dihitung dari kombinasi `license_id` dan `device_id`."
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Perangkat</CardTitle>
          <CardDescription>Lihat device id, nama perangkat, versi aplikasi, dan waktu check terakhir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Device</TH>
                <TH>License</TH>
                <TH>Guru</TH>
                <TH>Versi</TH>
                <TH>Activated</TH>
                <TH>Last check</TH>
              </TR>
            </THead>
            <TBody>
              {devices.map((device) => (
                <TR key={device.id}>
                  <TD>
                    <div className="font-semibold">{device.device_name}</div>
                    <div className="text-xs text-muted-foreground">{device.device_id}</div>
                  </TD>
                  <TD>{device.licenses?.license_key}</TD>
                  <TD>
                    <div>{device.licenses?.teacher_name}</div>
                    <div className="text-xs text-muted-foreground">{device.licenses?.school_name}</div>
                  </TD>
                  <TD>{device.app_version || "-"}</TD>
                  <TD>{formatDate(device.activated_at)}</TD>
                  <TD>{formatDate(device.last_check_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
