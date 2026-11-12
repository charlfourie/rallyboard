/** What a form's server action returns, shown by the <FormStatus> component. */
export type FormState = { error?: string; success?: string } | undefined;

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}
