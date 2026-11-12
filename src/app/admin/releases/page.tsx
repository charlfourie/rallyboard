import type { Metadata } from "next";
import { deleteRelease } from "@/app/admin/moderation-actions";
import { listReleases } from "@/lib/admin";
import { ReleaseForm } from "./release-form";

export const metadata: Metadata = { title: "Releases" };

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function ReleasesAdminPage() {
  const releases = await listReleases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Releases</h1>
        <p className="text-sm text-muted">
          Versions you ship. Mark ideas as shipped in a version from the inbox or an idea&apos;s page. Releases
          with a date in the past appear on the public Releases page.
        </p>
      </div>

      <ReleaseForm />

      {releases.length > 0 && (
        <ul className="card divide-y divide-line">
          {releases.map((release) => (
            <li key={release.id} className="space-y-2 p-4">
              <ReleaseForm
                release={{
                  id: release.id,
                  version: release.version,
                  title: release.title ?? "",
                  releasedAt: toDateInput(release.releasedAt),
                }}
              />
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>
                  {release.ideaCount} {release.ideaCount === 1 ? "idea" : "ideas"} shipped
                </span>
                <form action={deleteRelease}>
                  <input type="hidden" name="id" value={release.id} />
                  <button className="hover:text-danger">Delete release</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
