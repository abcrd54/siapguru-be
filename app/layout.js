import "@/app/globals.css";

export const metadata = {
  title: "SiapGuru Admin",
  description: "Control panel ringan untuk provider settings, license key, dan desktop activation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
