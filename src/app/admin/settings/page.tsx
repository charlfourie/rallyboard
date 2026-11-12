import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  await requireRole("owner");
  const settings = await getSettings();
  if (!settings) notFound();
  const { welcome } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Your board&apos;s name and branding.</p>
      </div>

      {welcome && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          Your board is live. Add your logo here, then tidy up categories.
        </p>
      )}

      <SettingsForm
        settings={{
          gameName: settings.gameName,
          tagline: settings.tagline ?? "",
          accentColor: settings.accentColor,
          customDomain: settings.customDomain ?? "",
          logoUrl: settings.logoUrl,
        }}
      />
    </div>
  );
}
