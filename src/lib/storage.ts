import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

// SVG is deliberately excluded: it can carry scripts.
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Saves an uploaded logo and returns its public URL.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise the local disk.
 */
export async function saveLogo(file: File): Promise<string> {
  const ext = LOGO_TYPES[file.type];
  if (!ext) throw new Error("Logo must be a PNG, JPG, WebP or GIF image.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be 1 MB or smaller.");

  const name = `logo-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`rallyboard/${name}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/uploads/${name}`;
}

/** Removes a previously saved logo. Failures are ignored: the file may already be gone. */
export async function deleteLogo(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith("/api/uploads/")) {
      await unlink(path.join(UPLOAD_DIR, path.basename(url)));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    // Nothing to clean up.
  }
}
