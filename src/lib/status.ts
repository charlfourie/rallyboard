import type { IdeaStatus } from "@/db/schema";

export const STATUSES: { value: IdeaStatus; label: string; color: string }[] = [
  { value: "under_review", label: "Under review", color: "#9a99ad" },
  { value: "planned", label: "Planned", color: "#4aa8ff" },
  { value: "in_progress", label: "In progress", color: "#f2a93b" },
  { value: "shipped", label: "Shipped", color: "#3bbf8a" },
  { value: "declined", label: "Declined", color: "#ef5b5b" },
];

export function statusInfo(status: IdeaStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export function isStatus(value: string | undefined): value is IdeaStatus {
  return STATUSES.some((s) => s.value === value);
}
