// 위트 닉네임 생성기 (데모용 규칙 기반 목 mock).
// 댓글 맥락(칭찬/비평/질문/유머/중립)을 감지해 캠퍼스 색채의 재치있는 닉네임을 만든다.
// ⚠️ 5단계에서 Claude(Opus 4.8) 호출로 교체한다. (반환 형태는 동일: string)

type Mood = "admiring" | "critical" | "curious" | "playful" | "neutral";

const ADJECTIVES: Record<Mood, string[]> = {
  admiring: ["감탄한", "박수치는", "엄지척", "반해버린", "감동먹은", "극찬하는"],
  critical: ["날카로운", "매의눈", "깐깐한", "예리한", "디버깅하는", "송곳같은"],
  curious: ["호기심폭발", "질문많은", "꼬치꼬치", "탐구하는", "궁금해하는"],
  playful: ["능청스런", "유쾌한", "드립치는", "실없는", "장난꾸러기"],
  neutral: ["지나가던", "담백한", "묵묵한", "성실한", "조용한"],
};

const ROLES = [
  "새내기",
  "화석선배",
  "조교",
  "과대표",
  "동아리장",
  "밤샘코더",
  "디버거",
  "도서관지기",
  "학식러버",
  "팀플장인",
  "발표왕",
  "공대생",
];

const POSITIVE =
  /(멋|좋|대박|최고|훌륭|감탄|유용|실용|깔끔|재밌|재미|인상|굿|짱|완성도|센스|편하|유익)/;
const NEGATIVE =
  /(아쉽|버그|안\s?되|안됨|느리|개선|부족|오류|불편|별로|어렵|헷갈|막힘|아깝)/;
const QUESTION = /(\?|궁금|어떻게|왜|무엇|뭐|가능한가|되나요|인가요|일까)/;
const PLAYFUL = /(ㅋ|ㅎ|😂|🤣|😆|😎|👍|🔥|드립|ㄷㄷ|우와|헐)/;

function detectMood(body: string): Mood {
  const t = body.trim();
  // 우선순위: 유머 > 질문 > 비평 > 칭찬 > 중립
  if (PLAYFUL.test(t)) return "playful";
  if (QUESTION.test(t)) return "curious";
  if (NEGATIVE.test(t)) return "critical";
  if (POSITIVE.test(t)) return "admiring";
  return "neutral";
}

// 안정적 선택을 위한 단순 해시 (댓글마다 닉네임 고정).
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generateNickname(body: string, seed: string): string {
  const mood = detectMood(body);
  const adjs = ADJECTIVES[mood];
  const h = hash(body + "|" + seed);
  const adj = adjs[h % adjs.length];
  const role = ROLES[(h >>> 3) % ROLES.length]; // 부호없는 시프트 (음수 인덱스 방지)
  return `${adj} ${role}`;
}
