// FlagBox 학습(Learn) 콘텐츠 — 드림핵 "학습" 파트를 벤치마킹한 입문 아티클.
// 각 글은 개념 설명 → 예시 → 워게임 연결로 이어져 문제 풀이 전 사전 학습 역할을 한다.

export type LearnSection = { heading: string; body: string[] }

export type LearnArticle = {
  slug: string
  field: 'WEB' | 'FORENSIC' | 'REVERSING' | 'CRYPTO' | 'MISC'
  title: string
  minutes: number
  summary: string
  sections: LearnSection[]
  check: string[]
}

// English copy can be added per article without breaking the Korean-first curriculum.
// The UI falls back to the original article while a translation is being prepared.
export const learnEn: Partial<Record<string, Pick<LearnArticle, 'title' | 'summary' | 'check'>>> = {
  'web-http-basics': {
    title: 'HTTP — learning the language of the web',
    summary: 'How to read the request/response exchange between your browser and a server.',
    check: ['Can you explain the difference between GET and POST?', 'What does the browser do after a 302 response?'],
  },
  'web-encoding': {
    title: 'Base64, URL encoding & HTML entities',
    summary: 'Tell apart the three common "disguises" you meet on the web — and undo them.',
    check: ['Can you describe how Base64 looks different from URL encoding?'],
  },
  'web-auth-session': {
    title: 'Cookies, sessions & JWT — how login works',
    summary: 'The three ways "who you are" is remembered, and the risks of each.',
    check: ['Why should a password never live inside a JWT payload?'],
  },
  'web-input-trust': {
    title: 'Never trust input — validate on the server',
    summary: 'Why disabled fields and front-end checks are toys, not walls.',
    check: ['Name one attack that client-side validation alone cannot stop.'],
  },
  'forensic-signature': {
    title: 'File signatures — extensions can lie',
    summary: 'Magic numbers reveal what a file really is, whatever it is named.',
    check: ['Write down the PNG signature in hex from memory.'],
  },
  'forensic-log-analysis': {
    title: 'Log analysis — spotting the odd line out',
    summary: 'Train your eye for the one weird row in thousands of normal ones.',
    check: ['Describe what brute-force attempts look like in an auth log.'],
  },
  'forensic-metadata': {
    title: 'Metadata — data about data',
    summary: 'EXIF, document properties, deletion traces: what files say on their own.',
    check: ['If you hide a secret in EXIF UserComment, how could it surface?'],
  },
  'forensic-packet-basics': {
    title: 'Packet sniffing 101',
    summary: 'Start network forensics from a plain-text capture, no Wireshark required.',
    check: ['Explain why HTTPS being default matters for packet capture.'],
  },
  'reversing-encoding-inverse': {
    title: 'Inverse thinking — encodings are reversible',
    summary: 'Base64, hex, ROT13 and XOR undone — all in one place.',
    check: ['Explain why applying XOR twice restores the original.'],
  },
  'reversing-read-code': {
    title: 'Reading verifier code — behind the if',
    summary: 'The three questions to ask when you meet any checker script.',
    check: ['Why might the submitted value differ even after your solver prints OK?'],
  },
  'reversing-asm-taste': {
    title: 'A taste of assembly — mov, add, xor',
    summary: 'Read pseudo-assembly with just a handful of opcodes.',
    check: ['In "add al, cl", what does cl usually represent?'],
  },
  'reversing-prng-vm': {
    title: 'PRNG & the tiny VM — past the first wall',
    summary: 'Two classic themes: predictable randomness and instruction interpreters.',
    check: ['Say in one sentence why an exposed PRNG seed is fatal for secrecy.'],
  },
}

export const LEARN_FIELDS = [
  { key: 'ALL', label: '전체' },
  { key: 'WEB', label: '웹' },
  { key: 'FORENSIC', label: '포렌식' },
  { key: 'REVERSING', label: '리버싱' },
  { key: 'CRYPTO', label: '암호학' },
  { key: 'MISC', label: '미스셀레니어스' },
] as const

export const learnArticles: LearnArticle[] = [
  // ───────────── 웹 ─────────────
  {
    slug: 'web-http-basics',
    field: 'WEB',
    title: 'HTTP, 웹의 말을 배워요',
    minutes: 6,
    summary: '브라우저와 서버가 주고받는 요청/응답의 구조를 읽는 법.',
    sections: [
      { heading: 'HTTP란?', body: ['브라우저가 "이 페이지 주세요(GET)" 라고 요청하면 서버가 상태 코드(200, 302, 404…)와 함께 응답합니다.', '요청과 응답에는 헤더(부가 정보)와 바디(본문)가 붙어요. CTF 웹 문제는 대부분 이 앞뒤를 잘 들여다보는 것에서 시작됩니다.'] },
      { heading: '자주 만나는 상태 코드', body: ['200 성공 · 301/302 다른 곳으로 이동 · 403 권한 없음 · 404 없음 · 500 서버 오류.', '302를 만나면 Location 헤더가 어디로 보내는지 확인하는 습관이 중요합니다.'] },
      { heading: '개발자 도구로 관찰하기', body: ['F12 → Network 탭에서 요청 목록, Headers에서 헤더, Response에서 본문을 볼 수 있어요.', 'Application 탭의 Cookies도 잊지 마세요.'] },
    ],
    check: ['GET과 POST의 차이를 말할 수 있나요?', '302 응답 후 브라우저는 무엇을 하나요?'],
  },
  {
    slug: 'web-encoding',
    field: 'WEB',
    title: 'Base64, URL 인코딩, HTML 엔터티',
    minutes: 7,
    summary: '웹에서 흔히 마주치는 세 가지 "변장"을 구별하고 푸는 법.',
    sections: [
      { heading: 'Base64', body: ['A-Z a-z 0-9 + / 와 패딩 = 로만 구성된 문자열은 Base64를 의심하세요.', 'CyberChef·base64.guru 같은 디코더에 붙여넣으면 됩니다.'] },
      { heading: 'URL 인코딩', body: ['공백은 %20, { 는 %7B 처럼 %XX 형태로 바뀝니다. 디코더 또는 decodeURIComponent() 로 되돌립니다.'] },
      { heading: 'HTML 엔터티', body: ['&#67; 처럼 &#숫자; 는 유니코드 문자입니다. 콘솔 한 줄로 풀 수 있어요.', '[...s.matchAll(/&#(\\d+);/g)].map(m => String.fromCharCode(m[1])).join("")'] },
    ],
    check: ['Base64와 URL 인코딩의 생김새 차이를 설명할 수 있나요?'],
  },
  {
    slug: 'web-auth-session',
    field: 'WEB',
    title: '쿠키, 세션, JWT — 로그인의 정체',
    minutes: 8,
    summary: '"내가 누구인지" 기억하는 세 가지 방법과 각각의 위험.',
    sections: [
      { heading: '쿠키와 세션', body: ['서버는 세션 ID를 쿠키로 건네고, 이후 요청마다 브라우저가 돌려줍니다.', '쿠키 값은 사용자가 볼 수 있고(개발자 도구), 조작 시도도 가능해요.'] },
      { heading: 'JWT', body: ['header.payload.signature 세 칸. 앞 두 칸은 그냥 Base64URL이라 내용이 그대로 읽힙니다.', '서명이 있어 위조는 어렵지만, "읽힘" 자체가 정보 노출이에요.'] },
      { heading: '보안 교훈', body: ['클라이언트 저장소의 모든 값은 공개된다고 생각하세요. 권한 판단은 반드시 서버에서!'] },
    ],
    check: ['JWT payload에 비밀번호를 넣으면 안 되는 이유는?'],
  },
  {
    slug: 'web-input-trust',
    field: 'WEB',
    title: '입력을 믿지 않기 — 검증은 서버에서',
    minutes: 6,
    summary: 'disabled·숨은 필드·프런트 검증이 왜 장난감인지.',
    sections: [
      { heading: '화면 검증 vs 서버 검증', body: ['HTML의 required·disabled·maxlength는 사용자 편의일 뿐입니다. curl·파이썬으로 요청을 직접 만들면 모두 무시돼요.'] },
      { heading: 'CTF 포인트', body: ['hidden input의 value, 주석 처리된 파라미터, 예시 응답 속 필드명이 단서가 됩니다.', '정상 흐름에서 벗어난 값을 넣었을 때 서버 반응을 관찰하세요.'] },
    ],
    check: ['프론트엔드 validation만으로 막을 수 없는 공격을 한 가지 들으세요.'],
  },

  // ───────────── 포렌식 ─────────────
  {
    slug: 'forensic-signature',
    field: 'FORENSIC',
    title: '파일 시그니처 — 확장자는 거짓말을 해요',
    minutes: 5,
    summary: '매직 넘버로 파일의 진짜 정체를 밝히는 방법.',
    sections: [
      { heading: '매직 넘버', body: ['PNG는 89 50 4E 47, ZIP은 50 4B(PK), JPEG는 FF D8로 시작합니다.', '확장자는 이름표일 뿐, 앞 몇 바이트가 진짜 신분증이에요.'] },
      { heading: '실전 요령', body: ['HxD 같은 헥스 에디터로 파일 첫 줄을 확인합니다.', 'IEND( PNG 끝) 뒤나 EOF 뒤에 데이터가 더 붙어 있는지 살펴보세요.'] },
    ],
    check: ['PNG의 시작 시그니처를 hex로 적어보세요.'],
  },
  {
    slug: 'forensic-log-analysis',
    field: 'FORENSIC',
    title: '로그 분석 — 이상치 찾기 훈련',
    minutes: 7,
    summary: '수천 줄의 로그에서 "어색한 한 줄"을 찾는 감각.',
    sections: [
      { heading: '무엇이 정상인가?', body: ['먼저 정상 패턴(업무 시간, 평균 빈도, 평소 경로)을 파악하면 이상치가 저절로 튀어나옵니다.'] },
      { heading: '체크리스트', body: ['반복 실패 후 성공 / 새벽 시간 접속 / 평소 없던 경로·파일명 / URL에 숨은 인코딩 값.', '두 개 이상의 로그를 시간순으로 겹쳐 보면 공격 흐름이 완성됩니다.'] },
    ],
    check: ['무차별 대입 공격이 로그에 남는 모양을 묘사해 보세요.'],
  },
  {
    slug: 'forensic-metadata',
    field: 'FORENSIC',
    title: '메타데이터 — 데이터에 붙은 데이터',
    minutes: 5,
    summary: 'EXIF, 문서 속성, 삭제 흔적까지. 파일이 혼자 말하는 것들.',
    sections: [
      { heading: '종류', body: ['사진 EXIF(기종·시간·GPS·UserComment), 문서 속성(작성자·버전), USB 연결 로그 등.'] },
      { heading: '삭제와 복구', body: ['삭제는 보통 "목록에서 지우기"일 뿐 내용은 남습니다. 휴지통 $I/$R, 덮어쓴 파일의 슬랙이 단골 소재예요.'] },
    ],
    check: ['EXIF UserComment에 비밀을 적으면 어떻게 드러날까요?'],
  },
  {
    slug: 'forensic-packet-basics',
    field: 'FORENSIC',
    title: '패킷 훔쳐보기 입문',
    minutes: 6,
    summary: 'Wireshark 없이 텍스트 캡처에서도 시작할 수 있는 네트워크 포렌식.',
    sections: [
      { heading: '패킷은 우체부 편지', body: ['암호화되지 않은 HTTP는 엽서와 같아서 중간 누구나 읽을 수 있습니다.'] },
      { heading: '보는 포인트', body: ['GET/POST 줄의 경로와 매개변수, 특히 p=, password= 같은 필드.', 'Base64·hex로 변장한 값을 의심하세요.'] },
    ],
    check: ['HTTP가 아닌 HTTPS가 기본인 이유를 설명해 보세요.'],
  },

  // ───────────── 리버싱 ─────────────
  {
    slug: 'reversing-encoding-inverse',
    field: 'REVERSING',
    title: '역산 사고법 — 인코딩은 되돌릴 수 있다',
    minutes: 6,
    summary: 'Base64·hex·ROT13·XOR의 되돌리기를 한 번에 정리.',
    sections: [
      { heading: '가역 연산들', body: ['Base64/hex: 디코더로 해결. ROT13: 두 번 하면 원문. XOR: 같은 키로 한 번 더.', '여러 겹이면 "마지막 연산부터" 되감는 게 철칙입니다.'] },
      { heading: '연습 루틴', body: ['① 출력 형태 관찰(hex? base64?) → ② 규칙 추정 → ③ 역함수 작성 → ④ 검증기에 대입.'] },
    ],
    check: ['XOR이 두 번 적용되면 왜 원문인지 설명해 보세요.'],
  },
  {
    slug: 'reversing-read-code',
    field: 'REVERSING',
    title: '검증기 코드 읽기 — if문 뒤편',
    minutes: 7,
    summary: '파이썬/JS 검증기를 만나면 하는 세 가지 질문.',
    sections: [
      { heading: '세 가지 질문', body: ['① 입력을 어떻게 바꾸는가? ② 무엇과 비교하는가? ③ 비교는 어떤 조건인가?', '이 답이 나오면 역함수는 거의 자동으로 써집니다.'] },
      { heading: '작성 요령', body: ['expected 리스트와 같은 형태로 출력하는 역함수를 짜고, OK가 나올 때까지 미세 조정하세요.'] },
    ],
    check: ['역산 코드가 OK를 출력해도 제출값은 따로일 수 있는 이유는?'],
  },
  {
    slug: 'reversing-asm-taste',
    field: 'REVERSING',
    title: '어셈블리 맛보기 — mov, add, xor만 알아도',
    minutes: 8,
    summary: '레지스터와 기본 명령 몇 개로 의사코드를 읽는 감각.',
    sections: [
      { heading: '최소 어휘', body: ['mov a, b: b를 a에 넣는다 / add: 더한다 / xor: 배타적 OR / inc: 1 증가 / loop 분기: 반복.'] },
      { heading: '읽는 순서', body: ['① 초기화(i=0) → ② 반복 몸체(바이트 연산) → ③ 종료 조건. 배열+루프 조합이 CTF 리버싱의 90%입니다.'] },
    ],
    check: ['add al, cl 에서 cl은 보통 무엇을 의미했죠?'],
  },
  {
    slug: 'reversing-prng-vm',
    field: 'REVERSING',
    title: 'PRNG와 초미니 VM — 난이도 상승의 문턱',
    minutes: 9,
    summary: '예측 가능한 무작위와 명령 해석기라는 두 가지 클래식 테마.',
    sections: [
      { heading: 'PRNG', body: ['LCG: x = (x*a + c) mod m. 시드가 공개되면 "무작위"는 재생산됩니다. 키 스트림을 만들어 XOR하면 끝.'] },
      { heading: 'VM', body: ['프로그램은 명령 번호 목록일 뿐. 각 명령의 역연산을 정의해 뒤에서부터 적용하면 해독됩니다.'] },
    ],
    check: ['시드가 노출된 PRNG가 왜 안전하지 않은지 한 문장으로!'],
  },
]

export function articleBySlug(slug: string) {
  return learnArticles.find((article) => article.slug === slug)
}
