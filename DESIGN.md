Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF UI/UX 기준

## 입문자 우선 원칙

- 첫 화면은 "어디서 시작할지"를 한 번에 알려준다.
- 실전 공격처럼 느껴지는 표현보다 안전한 퍼즐과 연습 환경을 명확히 안내한다.
- 난이도는 기존 데이터 값과 호환하되, Starter·Explorer·Builder 같은 쉬운 학습 단계명으로 함께 보여준다.
- 막혔을 때 힌트와 다음 행동을 가까운 위치에서 안내한다.

## 목표

Mini CTF는 화려한 해킹 연출보다 실제로 사용할 수 있는 현대적인 보안 학습 서비스처럼 보여야 합니다. 핵심 흐름인 `문제 탐색 → 분석 → FLAG 제출 → 결과 확인`을 빠르고 명확하게 제공하고, 마우스 없이도 주요 기능을 사용할 수 있어야 합니다.

이 문서는 화면의 시각·상호작용 기준만 정의합니다. API 형식은 `docs/API_CONTRACT.md`, 구현 여부는 `docs/IMPLEMENTATION_STATUS.md`를 따릅니다.

## 디자인 원칙

1. 어두운 배경과 녹색 Accent를 일관되게 사용합니다.
2. 정보 구조와 상태 전달을 장식보다 우선합니다.
3. 같은 기능은 같은 컴포넌트와 문구 패턴을 재사용합니다.
4. 정상, 로딩, 빈 상태, 오류, 권한 부족 상태를 모두 설계합니다.
5. 모바일과 키보드 사용자를 별도 예외가 아닌 기본 사용자로 취급합니다.

## 디자인 토큰

현재 `frontend/src/styles.css`의 값을 기준으로 합니다.

```css
:root {
  --color-bg: #0b0f14;
  --color-surface: #151d27;
  --color-border: #263241;
  --color-text: #f4f7fa;
  --color-text-soft: #dbe3ea;
  --color-muted: #99a6b5;
  --color-accent: #39d98a;
  --color-accent-dark: #113326;
  --color-score: #f7b955;
  --color-error-bg: #3b1d24;
  --color-error: #ffb0b0;
  --radius-control: 8px;
  --radius-card: 12px;
}
```

- 본문 글꼴: `Inter, ui-sans-serif, system-ui, sans-serif`
- 본문 최소 크기: `16px`
- 본문 줄 높이: `1.5` 이상
- 소스, 명령, FLAG: 고정폭 글꼴
- Accent는 주요 행동, 선택, 성공, Focus에 사용하고 긴 본문에는 사용하지 않습니다.

새 색상이나 간격을 임의로 늘리기 전에 기존 토큰으로 해결합니다. 구현 시 CSS Custom Property로 옮겨 중복 값을 줄이는 것을 권장합니다.

## 전체 레이아웃

- Header 높이: `72px`
- 콘텐츠 최대 너비: `1180px`
- 데스크톱 콘텐츠 여백: `72px 24px 120px`
- 주요 카드: Surface 배경, 1px Border, 12px Radius
- 페이지 제목은 Eyebrow, H1, 설명 순서를 유지합니다.

Header 기본 메뉴:

```text
MINICTF | Challenges | Community | Ranking | 계정 메뉴
```

- 비로그인: Login, Sign Up
- 로그인: My Page, Logout
- 관리자: My Page, Admin, Logout

현재 구현되지 않은 경로는 메뉴에 노출하기 전에 실제 Route와 화면을 먼저 추가합니다.

## 공통 컴포넌트

### Button

- Primary: 녹색 배경, 어두운 글자
- Secondary: 투명 배경, Border, 밝은 글자
- Danger: 삭제처럼 되돌리기 어려운 행동에만 사용
- Disabled와 Loading은 색상뿐 아니라 `disabled`, 텍스트 또는 Spinner로 구분
- 최소 높이 `44px`, 명확한 Focus Ring 제공

### Form

- Label과 입력을 항상 연결합니다.
- Placeholder를 Label 대신 사용하지 않습니다.
- 클라이언트 검증은 빠른 피드백용이며 서버 오류를 그대로 처리할 수 있어야 합니다.
- 제출 중 중복 클릭을 막고 완료 후 성공·오류 상태를 가까운 위치에 표시합니다.

### Badge

- Category, Difficulty, Role, Solved처럼 짧은 상태에만 사용합니다.
- 색상만으로 의미를 전달하지 않고 텍스트를 함께 표시합니다.

### Alert

- Success, Error, Warning, Info를 구분합니다.
- 내부 Stack Trace나 서버 경로를 표시하지 않습니다.
- `RATE_LIMITED`는 `Retry-After`를 이용해 재시도 가능 시간을 안내합니다.

### Data state

- Loading: 영역의 목적을 유지한 Skeleton 또는 `불러오는 중…`
- Empty: 이유와 가능한 다음 행동 제공
- Error: 사용자용 설명과 재시도 버튼 제공
- Unauthorized: 로그인 화면으로 이동할 명확한 행동 제공
- Forbidden: 권한 부족을 로그인 필요와 구분

## 화면 기준

### Home

- 서비스 목적을 한 문장으로 설명합니다.
- `Explore challenges`를 Primary CTA로 둡니다.
- 활성 문제, 사용자, Solve 통계를 `/api/stats`와 연결할 수 있습니다.

### Authentication

- Login과 Register는 좁은 단일 카드 레이아웃을 사용합니다.
- 비밀번호를 다시 표시하거나 로그에 기록하지 않습니다.
- OAuth 버튼은 `/api/auth/oauth/providers` 결과에 있는 Provider만 표시합니다.
- OAuth callback은 URL fragment의 token을 읽고 즉시 주소에서 제거합니다.

### Challenges

- 카드에 Category, Difficulty, 제목, 점수, Solved, Artifact 유무를 표시합니다.
- 카드 전체를 키보드로 선택할 수 있어야 합니다.
- 목록이 커지면 Category·Difficulty·Solved 필터를 추가합니다.

### Challenge Detail

정보 순서:

```text
Category / Difficulty
Title / Score / Solved
Description
Artifact download
FLAG form
General / Solver Discussion
```

- Artifact는 JWT를 포함한 API 요청으로 내려받습니다.
- FLAG 입력 결과는 입력창 가까이에 표시하고 정답 후 화면의 Solved 상태를 갱신합니다.
- Solver Discussion은 API가 `403`이면 내용을 렌더링하지 않습니다.

### Ranking

- 서버가 제공한 `rank`를 표시하며 배열 index로 순위를 다시 계산하지 않습니다.
- Rank, 사용자, 점수, 해결 수를 제공합니다.
- 모바일에서는 가로 스크롤 또는 정보 우선순위가 적용된 카드로 전환합니다.

### My Page

- Profile, Rank, Score, Solved Count를 첫 영역에 둡니다.
- Solve 목록과 최근 Submission을 분리합니다.
- 다른 사용자의 민감한 제출 기록으로 이동할 수 있는 UI를 만들지 않습니다.

### Community

- Category: `FREE`, `QUESTION`, `CTF`, `NOTICE`
- 목록: Category, 제목, 작성자, 댓글 수, 조회 수, 작성일
- 상세: 본문, 작성자/관리자 Edit·Delete, 댓글 목록과 입력
- 사용자 콘텐츠는 JSX 텍스트 보간으로 렌더링하고 `dangerouslySetInnerHTML`을 사용하지 않습니다.
- `NOTICE` 작성 기능은 관리자에게만 표시합니다.

### Admin

- 일반 사용자에게 메뉴를 숨기되 최종 권한 판단은 서버 응답을 따릅니다.
- Challenge 생성·수정과 Artifact 업로드를 분리해 실패 지점을 명확히 합니다.
- 파일 업로드는 진행·성공·실패 상태와 허용 확장자·25MB 제한을 표시합니다.
- 삭제는 기록 보존형 비활성화임을 설명하고 확인 단계를 둡니다.

## 접근성

- 모든 주요 기능은 `Tab`, `Shift + Tab`, `Enter`, `Space`로 동작해야 합니다.
- Focus Ring을 제거하지 않습니다.
- `<button>`과 `<a>`를 역할에 맞게 사용하고 클릭 가능한 `<div>`를 만들지 않습니다.
- 아이콘 단독 버튼은 `aria-label`을 제공합니다.
- 입력 오류는 색상과 텍스트를 함께 사용하고 필요한 경우 `aria-describedby`로 연결합니다.
- 비동기 결과는 적절한 `aria-live` 영역으로 알립니다.
- 텍스트와 배경은 WCAG AA 대비를 목표로 합니다.
- 모션 감소 설정(`prefers-reduced-motion`)을 존중합니다.

## 반응형 기준

- Desktop: `> 1024px`
- Tablet: `681px ~ 1024px`
- Mobile: `<= 680px`

모바일에서는 Header 메뉴를 단순히 숨겨 기능을 없애지 말고 메뉴 버튼이나 별도 Navigation으로 제공합니다. FLAG Form, Action Button, Community 메타데이터는 한 열로 재배치하고 가로 스크롤이 필요한 표에는 접근 가능한 대안을 제공합니다.

## 프론트 구현 완료 조건

- 실제 API 타입과 응답 상태가 일치합니다.
- 모든 Route에 정상·로딩·빈 상태·오류가 있습니다.
- JWT 만료 시 인증 상태가 정리되고 Login으로 복구할 수 있습니다.
- Artifact download, multipart upload, Rate Limit을 올바르게 처리합니다.
- Home, Challenge, Ranking, My Page, Community, Admin의 핵심 흐름을 키보드로 사용할 수 있습니다.
- `npm run build`와 주요 브라우저 통합 흐름이 통과합니다.
