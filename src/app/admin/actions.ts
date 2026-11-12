"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, settings } from "@/db/schema";
import { HEX_COLOR } from "@/lib/color";
import { errorMessage, type FormState } from "@/lib/form";
import { assertRole } from "@/lib/session";
import { DEFAULT_ACCENT, DEFAULT_CATEGORIES, getSettings } from "@/lib/settings";
import { deleteLogo, saveLogo } from "@/lib/storage";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null);

const boardFields = z.object({
  gameName: z.string().trim().min(1, "Enter your game's name.").max(60, "Keep the name under 60 characters."),
  tagline: optionalText(140),
  accentColor: z.string().regex(HEX_COLOR, "Pick a colour like #7c5cff."),
});

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/* ------------------------------------------------------------------ */
/* First-run setup                                                    */
/* ------------------------------------------------------------------ */

export async function completeSetup(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("owner");
    if (await getSettings()) return { error: "This board is already set up." };

    const parsed = boardFields.safeParse({
      gameName: field(formData, "gameName"),
      tagline: field(formData, "tagline"),
      accentColor: field(formData, "accentColor") || DEFAULT_ACCENT,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await db.transaction(async (tx) => {
      await tx.insert(settings).values({ id: 1, ...parsed.data }).onConflictDoNothing();
      const existing = await tx.select({ id: categories.id }).from(categories).limit(1);
      if (existing.length === 0) {
        await tx
          .insert(categories)
          .values(DEFAULT_CATEGORIES.map((category, i) => ({ ...category, sortOrder: i })));
      }
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect("/admin/settings?welcome=1");
}

/* ------------------------------------------------------------------ */
/* Board settings and branding                                        */
/* ------------------------------------------------------------------ */

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("owner");
    const current = await getSettings();
    if (!current) return { error: "Finish setup first." };

    const parsed = boardFields
      .extend({
        customDomain: optionalText(253).refine(
          (value) => value === null || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value),
          "Enter a domain like feedback.yourgame.com, without https://.",
        ),
      })
      .safeParse({
        gameName: field(formData, "gameName"),
        tagline: field(formData, "tagline"),
        accentColor: field(formData, "accentColor"),
        customDomain: field(formData, "customDomain").replace(/^https?:\/\//, "").replace(/\/$/, ""),
      });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    let logoUrl = current.logoUrl;
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      logoUrl = await saveLogo(logo);
      await deleteLogo(current.logoUrl);
    }

    await db
      .update(settings)
      .set({ ...parsed.data, logoUrl, updatedAt: new Date() })
      .where(eq(settings.id, 1));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: "Settings saved" };
}

export async function removeLogo(): Promise<void> {
  await assertRole("owner");
  const current = await getSettings();
  if (!current?.logoUrl) return;
  await db.update(settings).set({ logoUrl: null, updatedAt: new Date() }).where(eq(settings.id, 1));
  await deleteLogo(current.logoUrl);
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ */
/* Categories                                                         */
/* ------------------------------------------------------------------ */

const categoryFields = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(40, "Keep names under 40 characters."),
  color: z.string().regex(HEX_COLOR, "Pick a colour like #7c5cff."),
});

export async function addCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("owner");
    const parsed = categoryFields.safeParse({
      name: field(formData, "name"),
      color: field(formData, "color"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const [{ last }] = await db.select({ last: max(categories.sortOrder) }).from(categories);
    await db.insert(categories).values({ ...parsed.data, sortOrder: (last ?? -1) + 1 });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/", "layout");
  return { success: "Category added" };
}

export async function updateCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertRole("owner");
    const id = z.uuid().parse(field(formData, "id"));
    const parsed = categoryFields.safeParse({
      name: field(formData, "name"),
      color: field(formData, "color"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await db.update(categories).set(parsed.data).where(eq(categories.id, id));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/", "layout");
  return { success: "Saved" };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertRole("owner");
  const id = z.uuid().parse(field(formData, "id"));
  // Ideas in this category keep existing; their category becomes empty.
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/", "layout");
}

export async function moveCategory(formData: FormData): Promise<void> {
  await assertRole("owner");
  const id = z.uuid().parse(field(formData, "id"));
  const direction = field(formData, "direction") === "up" ? -1 : 1;

  const ordered = await db
    .select({ id: categories.id })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  const index = ordered.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  await db.transaction(async (tx) => {
    for (const [i, category] of ordered.entries()) {
      await tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, category.id));
    }
  });
  revalidatePath("/", "layout");
}
