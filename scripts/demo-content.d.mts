import type { Sql } from "postgres";
export function seedDemo(sql: Sql, mode?: "add" | "reset" | "wipe"): Promise<string>;
