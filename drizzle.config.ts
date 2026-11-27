import { defineConfig } from "drizzle-kit";
import { migrationUrl, resolveConnection } from "./src/db/connection";

// drizzle-kit does not read Next.js env files; load .env.local when present.
try {
  process.loadEnvFile(".env.local");
} catch {}

// Migrations use a direct/session connection (not the transaction pooler).
const connection = resolveConnection(migrationUrl());

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["ctf"],
  dbCredentials: connection ? { url: connection.url, ssl: connection.ssl === "require" ? "require" : false } : { url: "" },
});
