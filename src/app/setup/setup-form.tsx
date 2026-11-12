"use client";

import { useActionState } from "react";
import { completeSetup } from "@/app/admin/actions";
import { ColorField } from "@/components/color-field";
import { FormStatus } from "@/components/form-status";

export function SetupForm({ defaultAccent }: { defaultAccent: string }) {
  const [state, action, pending] = useActionState(completeSetup, undefined);

  return (
    <form action={action} className="card space-y-5 p-6">
      <div>
        <label className="label" htmlFor="gameName">
          Game name
        </label>
        <input id="gameName" name="gameName" required maxLength={60} className="input" placeholder="Starfall Tactics" />
      </div>
      <div>
        <label className="label" htmlFor="tagline">
          Tagline <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="tagline"
          name="tagline"
          maxLength={140}
          className="input"
          placeholder="Tell us what to build next"
        />
      </div>
      <ColorField name="accentColor" label="Accent colour" defaultValue={defaultAccent} />
      <p className="hint">
        We&apos;ll add four starter categories (Feature, Bug, Balance, Quality of life). You can change
        them and upload a logo next.
      </p>
      <FormStatus state={state} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating board…" : "Create board"}
      </button>
    </form>
  );
}
