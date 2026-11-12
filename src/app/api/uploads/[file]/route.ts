import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_TYPES, UPLOAD_DIR } from "@/lib/storage";

const CONTENT_TYPES = Object.fromEntries(
  Object.entries(LOGO_TYPES).map(([type, ext]) => [ext, type]),
);

// Serves logos saved to local disk (self-hosted installs without Vercel Blob).
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = path.basename(file);
  const type = CONTENT_TYPES[path.extname(name).slice(1)];
  if (!type || name !== file) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
