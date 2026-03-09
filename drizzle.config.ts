import type { Config } from "drizzle-kit";

export default {
  schema: "./game/db/schema.ts",
  out: "./game/db/migrations",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
