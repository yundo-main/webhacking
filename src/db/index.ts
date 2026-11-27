import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolveConnection, runtimeUrl } from "./connection";
import * as schema from "./schema";

// postgres() does not connect until the first query, so builds work without a database.
// prepare:false is required behind Supabase's transaction pooler (Supavisor, port 6543).
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

function createClient() {
  const connection = resolveConnection(runtimeUrl()) ?? { url: "postgres://localhost:5432/webhacking", ssl: false as const };
  return postgres(connection.url, { ssl: connection.ssl, prepare: false, max: 5, idle_timeout: 20 });
}

const client = globalForDb.pg ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
