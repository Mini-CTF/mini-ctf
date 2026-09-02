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
  'crypto-basics': {
    title: 'Crypto basics — encoding vs encryption',
    summary: 'Why Base64 is not encryption and what a key really protects.',
    check: ['Explain the difference between encoding and encryption in one sentence.'],
  },
  'crypto-classical': {
    title: 'Classical ciphers — Caesar, ROT13, Vigenère',
    summary: 'Shift and substitution ciphers and how to reverse them.',
    check: ['How would you reverse a Caesar shift of 5?'],
  },
  'crypto-xor-stream': {
    title: 'XOR and stream ciphers — the same key twice',
    summary: 'Why XOR with a repeating key is fragile and how LCG streams are reproduced.',
    check: ['Why does XORing twice with the same key restore plaintext?'],
  },
  'crypto-custom-vm': {
    title: 'Custom encodings & tiny VMs',
    summary: 'When the alphabet is swapped or a mini VM runs your input.',
    check: ['Describe how to reverse a 3-step VM (reverse, add, XOR).'],
  },
  'misc-hidden': {
    title: 'Hidden data — comments, headers, and metadata',
    summary: 'Where developers accidentally leave secrets: comments, cookies, and headers.',
    check: ['Name two places where a flag might hide in a web snapshot.'],
  },
  'misc-log-forensics': {
    title: 'Log forensics for misc — follow the trail',
    summary: 'Reading access logs, recycle bins, and memory dumps for hidden notes.',
    check: ['What does a $I/$R pair tell you in a recycled file report?'],
  },
  'misc-puzzle': {
    title: 'Puzzle solving — assembling scattered pieces',
    summary: 'When the flag is split, torn, or hidden in whitespace.',
    check: ['How do you reassemble a Base64 string torn into three pieces?'],
  },
  'misc-decoy': {
    title: 'Decoys — telling real from fake',
    summary: 'Why context matters when many CTF{...} candidates appear.',
    check: ['What clue would you use to pick the real flag among decoys?'],
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

  // ───────────── 암호학 ─────────────
  {
    slug: 'crypto-basics',
    field: 'CRYPTO',
    title: '암호학 첫걸음 — 인코딩과 암호는 달라요',
    minutes: 6,
    summary: 'Base64는 암호가 아니에요. 키가 지키는 것이 무엇인지 배우는 법.',
    sections: [
      { heading: '인코딩 vs 암호', body: ['인코딩(Base64, hex, URL)은 "표기법 바꾸기"라 키 없이도 되돌릴 수 있습니다.', '암호는 키가 있어야만 풀리는 "잠금"이에요. 키를 모르면 풀 수 없는 것이 정상입니다.'] },
      { heading: 'CTF에서 자주 보는 것들', body: ['Base64·hex·ROT13·URL 인코딩은 거의 매 문제에 등장합니다.', '이들은 "변장"일 뿐이니 디코더나 CyberChef로 바로 벗기면 됩니다.'] },
    ],
    check: ['인코딩과 암호의 차이를 한 문장으로 말해보세요.'],
  },
  {
    slug: 'crypto-classical',
    field: 'CRYPTO',
    title: '고전 암호 — 시저와 ROT13',
    minutes: 6,
    summary: '글자를 밀어 만드는 가장 오래된 암호와 그 역연산.',
    sections: [
      { heading: '시저와 ROT13', body: ['알파벳을 n칸 밀면 시저 암호, 13칸 밀면 ROT13입니다.', 'ROT13은 두 번 하면 원문, 시저는 밀린 칸수만큼 반대로 밀면 풀립니다. 32~126 전체를 미는 경우도 있어요.'] },
      { heading: '푸는 법', body: ['CyberChef의 ROT13, Caesar 브루트포스, 또는 파이썬 한 줄로 풀 수 있습니다.', '예: "".join(chr((ord(c)-32-n)%95+32) for c in s)'] },
    ],
    check: ['시저 5로 밀린 문자를 어떻게 되돌리나요?'],
  },
  {
    slug: 'crypto-xor-stream',
    field: 'CRYPTO',
    title: 'XOR와 스트림 암호 — 같은 키로 두 번',
    minutes: 7,
    summary: 'XOR의 마법과 LCG처럼 예측 가능한 난수의 위험.',
    sections: [
      { heading: 'XOR', body: ['A xor K = B, B xor K = A. 같은 키로 두 번 하면 원문이에요.', '키가 한 글자면 모든 바이트에 같은 키, 여러 글자면 순환 적용됩니다.'] },
      { heading: 'LCG', body: ['x = (x*a + c) mod m. 시드가 공개되면 난수 전체를 재현할 수 있어요.', '키스트림을 만들어 16진수 암호문과 XOR하면 플래그가 나옵니다.'] },
    ],
    check: ['같은 키로 XOR를 두 번 하면 왜 원문이 돌아오나요?'],
  },
  {
    slug: 'crypto-custom-vm',
    field: 'CRYPTO',
    title: '커스텀 인코딩과 미니 VM',
    minutes: 8,
    summary: '알파벳을 바꿔 치기하거나, 작은 가상 머신이 입력을 가공할 때.',
    sections: [
      { heading: '커스텀 Base64', body: ['표준표와 사용표가 다르면, 글자를 위치별로 옮겨 표준으로 되돌린 뒤 디코딩하면 됩니다.', '두 표가 함께 주어진다면 매핑 테이블을 만들어 변환하세요.'] },
      { heading: '미니 VM', body: ['프로그램은 [3,1,5,2,42] 같은 명령 번호 목록이에요.', '3은 뒤집기, 1 k는 더하기, 2 k는 XOR. 역순으로 되감으면 입력이 복원됩니다.'] },
    ],
    check: ['3단계 VM(뒤집기→더하기→XOR)을 어떻게 역순으로 풀까요?'],
  },

  // ───────────── 미스셀레니어스 ─────────────
  {
    slug: 'misc-hidden',
    field: 'MISC',
    title: '숨은 데이터 — 주석, 헤더, 쿠키',
    minutes: 5,
    summary: '개발자가 깜빡하고 남긴 곳: 주석, 헤더, 쿠키, 숨은 필드.',
    sections: [
      { heading: '웹 스냅샷', body: ['HTML 주석 <!-- FLAG -->, 숨은 input value, robots.txt, 쿠키, X-헤더는 단골 소재예요.', '소스 보기(Ctrl+U)와 개발자 도구 Network/Storage 탭을 습관화하세요.'] },
      { heading: '인코딩된 값', body: ['쿠키나 URL의 값이 Base64·hex처럼 보이면 디코딩을 시도해 보세요.', '헤더 속 메모도 그냥 텍스트일 때가 많습니다.'] },
    ],
    check: ['웹 스냅샷에서 플래그가 숨을 수 있는 곳 두 군데를 말해보세요.'],
  },
  {
    slug: 'misc-log-forensics',
    field: 'MISC',
    title: '로그 포렌식 — 흔적을 따라가기',
    minutes: 6,
    summary: '접속 로그, 휴지통, 메모리 덤프에서 숨은 메모 찾기.',
    sections: [
      { heading: '로그 읽기', body: ['로그는 시간순 이야기예요. 반복 실패 후 성공, 새벽 접속, 평소 없던 경로가 단서입니다.', '여러 로그를 겹쳐 보면 공격 타임라인이 완성됩니다.'] },
      { heading: '삭제와 메모리', body: ['휴지통 $I(정보)와 $R(내용), 덮어쓴 파일의 슬랙, 메모리 덤프의 strings가 자주 등장합니다.', '텍스트만 뽑아 검색하면 의외로 쉽게 찾을 수 있어요.'] },
    ],
    check: ['$I와 $R이 각각 무엇을 알려주나요?'],
  },
  {
    slug: 'misc-puzzle',
    field: 'MISC',
    title: '퍼즐 — 흩어진 조각 맞추기',
    minutes: 7,
    summary: '플래그가 찢기거나, 공백에 숨거나, 여러 곳에 흩어졌을 때.',
    sections: [
      { heading: '찢어진 Base64', body: ['Base64는 길이가 4의 배수여야 유효합니다. 조각 길이표를 이용해 가능한 순서를 좁혀 디코딩해 보세요.', '3조각이면 6가지 순열을 시도하면 됩니다.'] },
      { heading: '공백 스테가노', body: ['줄 끝 공백 개수가 아스키 코드인 경우가 있습니다. 에디터의 "공백 표시"를 켜고 개수를 세어 문자로 바꾸면 됩니다.', '흩어진 조각은 번호 순서대로 이어 붙이면 됩니다.'] },
    ],
    check: ['세 조각으로 찢긴 Base64를 어떻게 재조합하나요?'],
  },
  {
    slug: 'misc-decoy',
    field: 'MISC',
    title: '디코이와 진짜 — 맥락으로 가려내기',
    minutes: 5,
    summary: '여러 CTF{...} 중 단 하나만 진짜일 때, 맥락이 답을 알려줘요.',
    sections: [
      { heading: '디코이', body: ['SAMPLE, TEMPLATE, DEBUG, LEGACY 같은 이름은 보통 함정입니다.', '주석과 변수명, 배포 날짜를 읽으면 어느 값이 운영(real)인지 알 수 있어요.'] },
      { heading: '검증', body: ['진짜 플래그는 CTF{키_24hex} 형태여야 하고, 해당 환경에서 검증기를 통과해야 합니다.', '여러 후보가 있으면 각각의 맥락을 따져보세요.'] },
    ],
    check: ['많은 후보 중 진짜를 고를 때 어떤 단서를 보나요?'],
  },
]

export function articleBySlug(slug: string) {
  return learnArticles.find((article) => article.slug === slug)
}
