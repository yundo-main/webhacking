/** Optional competition window from CTF_START / CTF_END (ISO 8601). Unset means always open. */
function parse(value: string | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function competitionState(now = Date.now()) {
  const start = parse(process.env.CTF_START);
  const end = parse(process.env.CTF_END);
  if (start !== null && now < start) return { open: false, reason: "대회가 아직 시작되지 않았습니다.", start, end };
  if (end !== null && now >= end) return { open: false, reason: "대회가 종료되었습니다.", start, end };
  return { open: true, reason: "", start, end };
}
