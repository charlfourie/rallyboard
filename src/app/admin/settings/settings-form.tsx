"use client";

import { useActionState, useTransition } from "react";
import { removeLogo, updateSettings } from "@/app/admin/actions";
import { ColorField } from "@/components/color-field";
import { FormStatus } from "@/components/form-status";
import { GameMark } from "@/components/game-mark";

type Props = {
  settings: {
    gameName: string;
    tagline: string;
    accentColor: string;
    customDomain: string;
    logoUrl: string | null;
  };
};

export function SettingsForm({ settings }: Props) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  const [removing, startRemoving] = useTransition();

  return (
    <form action={action} className="card space-y-6 p-6">
      <div>
        <label className="label" htmlFor="gameName">
          Game name
        </label>
        <input id="gameName" name="gameName" required maxLength={60} defaultValue={settings.gameName} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="tagline">
          Tagline <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="tagline" name="tagline" maxLength={140} defaultValue={settings.tagline} className="input" />
      </div>

      <div>
        <span className="label">Logo</span>
        <div className="flex flex-wrap items-center gap-4">
          <GameMark name={settings.gameName} logoUrl={settings.logoUrl} size={56} />
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Upload a new logo"
            className="text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
          />
          {settings.logoUrl && (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5"
              disabled={removing}
              onClick={() => startRemoving(() => removeLogo())}
            >
              {removing ? "Removing…" : "Remove logo"}
            </button>
          )}
        </div>
        <p className="hint">Square PNG, JPG, WebP or GIF, up to 1 MB. Shown in the header and browser tab.</p>
      </div>

      <ColorField name="accentColor" label="Accent colour" defaultValue={settings.accentColor} />

      <div>
        <label className="label" htmlFor="customDomain">
          Custom domain <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="customDomain"
          name="customDomain"
          defaultValue={settings.customDomain}
          placeholder="feedback.yourgame.com"
          className="input"
        />
        <p className="hint">
          For reference in links and Discord messages. Point the domain at your host first (see the README).
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
