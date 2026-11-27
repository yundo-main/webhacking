export type Challenge = {
  id: string;
  title: string;
  category: string;
  difficulty: "입문" | "보통" | "어려움";
  points: number;
  description: string;
  hint?: string;
};

// Challenge metadata for the portal. Each id has a challenge site in src/labs/<id>.ts.
export const CHALLENGES: Challenge[] = [
  {
    id: "sqli-login",
    title: "잠긴 관리자 공간",
    category: "SQL Injection",
    difficulty: "입문",
    points: 100,
    description: "사내 포털의 로그인 폼을 조작해 관리자 계정으로 들어가 관리자 메뉴의 플래그를 찾으세요.",
    hint: "비밀번호 조건이 쿼리에서 정말 평가되고 있을까요? 따옴표 하나를 넣어 보면 단서가 보입니다.",
  },
  {
    id: "path-traversal",
    title: "공개 폴더 밖의 문서",
    category: "Path Traversal",
    difficulty: "입문",
    points: 100,
    description: "사내 자료실의 문서 뷰어는 공개 문서만 보여 준다고 합니다. 비공개 폴더의 관리자 메모를 읽으세요.",
    hint: "뷰어가 보여 주는 실제 경로를 잘 보세요. name 값이 그 경로에 그대로 이어 붙습니다.",
  },
  {
    id: "auth-recovery",
    title: "분실된 재설정 링크",
    category: "Authentication",
    difficulty: "입문",
    points: 150,
    description: "student 계정으로 비밀번호 재설정 링크를 받아 토큰의 규칙을 분석하고, admin 계정을 복구하세요.",
    hint: "토큰은 암호처럼 보이지만 흔한 인코딩일 뿐입니다. 디코딩한 값의 숫자가 계정마다 어떻게 다를까요?",
  },
  {
    id: "upload-filter",
    title: "이미지 전용 보관함",
    category: "File Upload",
    difficulty: "보통",
    points: 200,
    description: "이미지만 받는다는 업로드 기능을 속여 <html>이 들어 있는 .html 파일을 올리세요.",
    hint: "multipart 요청에서 파일 이름, 파일 내용, 파일 파트의 Content-Type은 각각 따로 정해집니다.",
  },
  {
    id: "ssrf-oracle",
    title: "수정구슬의 내부 요청",
    category: "SSRF",
    difficulty: "보통",
    points: 200,
    description: "주소를 대신 들여다봐 주는 수정구슬을 이용해, 외부에서는 막혀 있는 내부 메모를 읽으세요.",
    hint: "서버 자신을 가리키는 주소는 localhost와 127.0.0.1만 있는 게 아닙니다. 포트도 확인하세요.",
  },
  {
    id: "nosql-login",
    title: "문서형 인증 게이트",
    category: "NoSQL Injection",
    difficulty: "보통",
    points: 200,
    description: "JSON 로그인 API를 조작해 비밀번호를 모르는 admin 계정으로 인증하세요.",
    hint: "JSON 값은 문자열이 아니라 객체일 수도 있습니다. MongoDB에서 {\"$ne\": ...}는 무슨 뜻일까요?",
  },
];

export function getChallenge(id: string) {
  return CHALLENGES.find((c) => c.id === id);
}
