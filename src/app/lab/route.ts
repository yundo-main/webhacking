import { notice } from "./lab-pages";

export function GET() {
  return notice("문제 사이트", "CTF 포털의 문제 화면에서 '문제 사이트 열기'를 눌러 접속하세요.", 200);
}
