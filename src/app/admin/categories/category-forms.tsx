"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCategory, updateCategory } from "@/app/admin/actions";
import { ColorField } from "@/components/color-field";
import { FormStatus } from "@/components/form-status";

export function EditCategoryForm({ id, name, color }: { id: string; name: string; color: string }) {
  const [state, action, pending] = useActionState(updateCategory, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <ColorField name="color" label={`${name} colour`} defaultValue={color} compact />
      <label className="sr-only" htmlFor={`name-${id}`}>
        Category name
      </label>
      <input id={`name-${id}`} name="name" defaultValue={name} required maxLength={40} className="input w-48" />
      <button type="submit" className="btn-secondary px-3 py-1.5" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <FormStatus state={state} />
    </form>
  );
}

export function AddCategoryForm() {
  const [state, action, pending] = useActionState(addCategory, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-6">
      <h2 className="font-semibold">Add a category</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="new-category">
            Name
          </label>
          <input id="new-category" name="name" required maxLength={40} placeholder="Multiplayer" className="input" />
        </div>
        <ColorField name="color" label="Colour" defaultValue="#4aa8ff" />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
