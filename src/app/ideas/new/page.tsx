import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCategories, getSettings } from "@/lib/settings";
import { NewIdeaForm } from "./new-idea-form";

export const metadata: Metadata = { title: "Suggest an idea" };

export default async function NewIdeaPage() {
  if (!(await getSettings())) redirect("/setup");
  await requireRole("player", "/ideas/new");
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-text">
          ← Back to the board
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Suggest an idea</h1>
        <p className="text-sm text-muted">
          One idea per post works best, so other players can vote on exactly what they want.
        </p>
      </div>
      <NewIdeaForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
