import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <Card className="relative w-full max-w-md overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-cyan-700 via-teal-500 to-amber-500" />
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Masuk Owner</CardTitle>
          <CardDescription>Auth hanya dipakai untuk akun owner yang mengelola provider, license key, dan sinkronisasi Firebase.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" placeholder="owner@siapguru.id" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" placeholder="••••••••" required />
            </div>
            {error ? <p className="text-sm text-rose-600">Login gagal: {error}</p> : null}
            <Button type="submit" className="w-full">
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
