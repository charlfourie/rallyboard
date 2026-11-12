import type { Metadata } from "next";
import { deleteCategory, moveCategory } from "@/app/admin/actions";
import { getCategories } from "@/lib/settings";
import { AddCategoryForm, EditCategoryForm } from "./category-forms";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted">
          Players pick one when they post an idea. Deleting a category keeps its ideas.
        </p>
      </div>

      <ul className="card divide-y divide-line">
        {categories.length === 0 && <li className="p-4 text-sm text-muted">No categories yet. Add one below.</li>}
        {categories.map((category, i) => (
          <li key={category.id} className="flex flex-wrap items-center gap-3 p-4">
            <EditCategoryForm id={category.id} name={category.name} color={category.color} />
            <div className="ml-auto flex items-center gap-1">
              <form action={moveCategory}>
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="btn-ghost px-2 py-1" disabled={i === 0} aria-label={`Move ${category.name} up`}>
                  ↑
                </button>
              </form>
              <form action={moveCategory}>
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  className="btn-ghost px-2 py-1"
                  disabled={i === categories.length - 1}
                  aria-label={`Move ${category.name} down`}
                >
                  ↓
                </button>
              </form>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={category.id} />
                <button className="btn-ghost px-2 py-1 hover:text-danger">Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <AddCategoryForm />
    </div>
  );
}
