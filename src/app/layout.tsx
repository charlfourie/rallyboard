import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Header } from "@/components/header";
import { contrastText } from "@/lib/color";
import { DEFAULT_ACCENT, getSettings } from "@/lib/settings";
import "./globals.css";

// Every page reads live settings and the session, so nothing is prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const name = settings?.gameName ?? "Rallyboard";
  return {
    title: { default: `${name} feedback`, template: `%s · ${name}` },
    description: settings?.tagline ?? `Suggest and vote on ideas for ${name}.`,
    icons: settings?.logoUrl ? [{ url: settings.logoUrl }] : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings().catch(() => null);
  const accent = settings?.accentColor ?? DEFAULT_ACCENT;
  const theme = {
    "--accent": accent,
    "--accent-contrast": contrastText(accent),
  } as CSSProperties;

  return (
    <html lang="en" style={theme}>
      <body className="min-h-screen">
        <Header settings={settings} />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted sm:px-6">
          Powered by{" "}
          <a className="underline hover:text-text" href="https://github.com/charlfourie/rallyboard">
            Rallyboard
          </a>
        </footer>
      </body>
    </html>
  );
}
