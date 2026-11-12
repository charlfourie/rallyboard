"use client";

import { useActionState, useState } from "react";
import { registerCommands, saveChannel, sendTestMessage } from "@/app/admin/discord-actions";
import { FormStatus } from "@/components/form-status";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label="Interactions endpoint URL" className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn-secondary shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function RegisterButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(registerCommands, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button type="submit" className="btn-primary" disabled={disabled || pending}>
        {pending ? "Registering…" : "Register /rally"}
      </button>
      <FormStatus state={state} />
    </form>
  );
}

export function TestButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(sendTestMessage, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button type="submit" className="btn-secondary" disabled={disabled || pending}>
        {pending ? "Sending…" : "Send a test message"}
      </button>
      <FormStatus state={state} />
    </form>
  );
}

type Group = { guild: { id: string; name: string }; channels: { id: string; name: string }[] };

export function ChannelForm({ groups, current }: { groups: Group[]; current: string }) {
  const [state, action, pending] = useActionState(saveChannel, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor="channelId" className="sr-only">
        Announcement channel
      </label>
      <select id="channelId" name="channelId" defaultValue={current} className="input w-auto">
        <option value="">No announcements</option>
        {groups.map((g) => (
          <optgroup key={g.guild.id} label={g.guild.name}>
            {g.channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
