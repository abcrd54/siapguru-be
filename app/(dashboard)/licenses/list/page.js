import { SectionHeader } from "@/components/section-header";
import { LicenseListTable } from "@/components/license-list-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLicenses } from "@/lib/data";

export default async function LicenseListPage() {
  const licenses = await getLicenses();

  return (
    <>
      <SectionHeader
        eyebrow="Daftar License"
        title="Master record license guru"
        description="Semua license yang dibuat dari generator akan muncul di sini. Halaman ini fokus untuk monitoring status, sinkronisasi Firebase, dan update runtime."
      />

      <Card className="border-0 bg-white">
        <CardHeader className="border-b pb-5">
          <CardTitle>Daftar License</CardTitle>
          <CardDescription>Daftar ini adalah master record admin. Runtime desktop sebaiknya hanya memakai data yang active dan success sync.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <LicenseListTable licenses={licenses} />
        </CardContent>
      </Card>
    </>
  );
}
