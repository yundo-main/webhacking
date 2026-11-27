import initSqlJs from "sql.js/dist/sql-wasm-inline.js";

/**
 * SQLite compiled to WebAssembly. Databases live only in wasm memory: no host filesystem, no extensions.
 * The module is shared per server instance, so statements that create files in its virtual FS are refused.
 */
let sqlModule: ReturnType<typeof initSqlJs> | undefined;

export function sqlite() {
  sqlModule ??= initSqlJs();
  return sqlModule;
}

const FORBIDDEN = /\b(attach|detach|vacuum)\b/i;

export class ForbiddenSql extends Error {}

export function assertSafeSql(sql: string) {
  if (FORBIDDEN.test(sql)) throw new ForbiddenSql("이 실습에서는 ATTACH/DETACH/VACUUM 문을 사용할 수 없습니다.");
}
