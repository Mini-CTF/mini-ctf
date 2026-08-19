# DESIGN.md — Mini CTF Platform UI/UX Design

# 1. 디자인 목표

Mini CTF Platform은 현대적인 사이버 보안 플랫폼 분위기를 가지되, 과도한 해커 영화 스타일은 피한다.

```text
Dark
+
Security
+
Developer
+
Clean
+
Modern
```

특정 서비스를 그대로 복제하지 않는다.

---

# 개발 환경 및 AI 도구

```text
Editor: VS Code
AI Tools: Codex, Cursor
```

VS Code를 기본 개발 환경으로 사용한다. Codex와 Cursor는 컴포넌트 구현, 코드 설명, 리팩터링, 테스트 보조에 사용하며 최종 반영 전 개발자가 접근성·보안·반응형 동작을 직접 검토한다.

Secret, 비밀번호, FLAG 원문과 같은 민감한 정보는 AI 도구에 입력하지 않는다.

---

# 2. 핵심 디자인 원칙

* Dark Theme
* 높은 가독성
* 정보 중심
* 일관된 Component
* Responsive Design
* Keyboard Accessibility
* 명확한 사용자 Feedback

---

# 3. 색상 시스템

```css
:root {
  --background-primary: #0b0f14;
  --background-secondary: #111820;
  --card: #151d27;
  --border: #263241;
  --text-primary: #f4f7fa;
  --text-secondary: #99a6b5;
  --accent: #39d98a;
  --danger: #ff5c5c;
  --warning: #f7b955;
}
```

기본 방향:

```text
Dark Background
+
Neutral Text
+
Green / Teal Accent
```

---

# 4. Typography

```css
:root {
  font-family: Inter, system-ui, sans-serif;
}

code, pre {
  font-family: "JetBrains Mono", ui-monospace, monospace;
}
```

외부 Font가 없어도 UI가 깨지지 않아야 한다.

---

# 5. 키보드 접근성

보안/개발 관련 사용자는 마우스뿐 아니라 `Tab`, `Shift + Tab`, `Enter` 등을 이용해 빠르게 인터페이스를 탐색하는 경우가 많다.

모든 주요 인터랙션 요소는 키보드로 접근할 수 있어야 한다.

대상:

* Navigation
* Button
* Link
* Form Input
* Challenge Card Link
* Modal
* FLAG Submit
* Download Button

키보드 Focus가 시각적으로 명확해야 한다.

```tsx
<button type="submit" aria-label="Submit Flag">
  Submit Flag
</button>
```

브라우저의 기본 Focus 표시를 제거하지 않으며, 커스텀 Focus Ring을 추가할 때도 충분한 대비를 유지한다.

금지:

```css
/* 전역적으로 outline을 제거하지 않는다. */
*:focus {
  outline: none;
}
```

사용자가 `Tab`을 눌렀을 때 현재 위치를 명확하게 확인할 수 있어야 한다.

---

# 6. 전체 Layout

Desktop 최대 Content Width:

```text
1200px ~ 1400px
```

기본:

```text
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ Logo  Challenges  Ranking        Login      │
├─────────────────────────────────────────────┤
│                                             │
│                MAIN CONTENT                 │
│                                             │
├─────────────────────────────────────────────┤
│ FOOTER                                      │
└─────────────────────────────────────────────┘
```

---

# 7. Header

비로그인:

```text
MiniCTF
Challenges
Ranking
Login
Sign Up
```

로그인 페이지에는 일반 로그인과 소셜 로그인 선택지를 함께 제공한다.

```text
Username
Password
[ Login ]

──────── or ────────

[ Continue with Google ]
[ Continue with GitHub ]
[ Continue with Kakao ]
[ Continue with Naver ]
``` 

Google 로그인을 기본 제공하고 GitHub·Kakao·Naver는 설정된 Provider만 노출한다. 소셜 로그인 버튼에는 Provider 이름을 명확히 표시하고, 키보드 Focus·로딩·실패 상태를 제공한다. OAuth Provider의 Client Secret은 프론트엔드에 포함하지 않는다.

로그인:

```text
MiniCTF
Challenges
Ranking
My Page
Logout
```

관리자:

```text
MiniCTF
Challenges
Ranking
My Page
Admin
Logout
```

---

# 8. Home Page

Hero:

```text
┌───────────────────────────────────────────┐
│                                           │
│       Learn Security by Solving           │
│                                           │
│   다양한 보안 문제에 도전하고              │
│   실력을 성장시켜보세요.                   │
│                                           │
│ [ Start Challenges ]   [ View Ranking ]   │
│                                           │
└───────────────────────────────────────────┘
```

Statistics:

```text
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Challenges │ │   Solves   │ │   Users    │
│     12     │ │    183     │ │     27     │
└────────────┘ └────────────┘ └────────────┘
```

Category:

```text
WEB
CRYPTO
FORENSICS
MISC
```

---

# 9. Login Page

```text
┌──────────────────────────────┐
│           Login              │
│                              │
│ Username                     │
│ [________________________]   │
│                              │
│ Password                     │
│ [________________________]   │
│                              │
│ [          Login          ]  │
│                              │
│ Don't have an account?       │
│ Sign Up                      │
└──────────────────────────────┘
```

오류:

```text
아이디 또는 비밀번호가 올바르지 않습니다.
```

---

# 10. Register Page

필드:

```text
Username
Nickname
Password
Confirm Password
```

Validation 오류는 해당 입력 필드 가까이에 표시한다.

---

# 11. Challenges Page

```text
Challenges                        7 / 12 Solved
```

Category Filter:

```text
[ ALL ] [ WEB ] [ CRYPTO ] [ FORENSICS ] [ MISC ]
```

Difficulty:

```text
Difficulty: All ▼
```

Status:

```text
Status: All ▼
```

---

# 12. Challenge Card

```text
┌──────────────────────────┐
│ WEB            EASY      │
│                          │
│ Hidden Message           │
│                          │
│ 문제 파일 안에 숨겨진     │
│ FLAG를 찾아보세요.        │
│                          │
│ 100 pts          ✓ SOLVED│
└──────────────────────────┘
```

필수:

* Category
* Title
* Short Description
* Difficulty
* Score
* Solve Status

---

# 13. Badge

Category:

```text
WEB
CRYPTO
FORENSICS
MISC
```

Difficulty:

```text
EASY
MEDIUM
HARD
```

색상과 Text를 함께 사용한다.

---

# 14. Challenge Detail

기본:

```text
┌─────────────────────────────────────────┐
│ WEB     EASY                     100 pts│
│                                         │
│ Hidden Message                          │
│                                         │
│ 문제 파일 어딘가에 FLAG가 숨겨져        │
│ 있습니다.                                │
│                                         │
│ Challenge File                          │
│ [ ↓ Download challenge.zip ]            │
│                                         │
├─────────────────────────────────────────┤
│ Submit Flag                             │
│                                         │
│ [ CTF{__________________________} ]     │
│ [ Submit Flag ]                         │
│                                         │
│ [ Inline Feedback ]                     │
└─────────────────────────────────────────┘
```

## 문제 Artifact

파일이 있는 경우:

```text
Challenge Files

challenge.zip       2.4 MB
[ Download ]
```

다운로드 버튼은 Secondary Button과 구분되는 **파일 전용 Action 스타일**을 사용할 수 있다.

필수 요소:

* 파일명
* 다운로드 아이콘 또는 텍스트
* 파일 크기 가능 시 표시
* 명확한 Download Label

파일 전체 서버 경로는 표시하지 않는다.

---

# 15. 코드 블록 / 명령어 디자인

CTF 문제 설명에는 코드, Shell Command, Log 등이 포함될 수 있다.

Inline Code:

```text
Use the <code>strings</code> command.
```

Block Code:

```text
GET /admin HTTP/1.1
Host: example.local
```

권장 스타일:

```tsx
<pre className="code-view" aria-label="Challenge code">
  {code}
</pre>
```

```css
.code-view {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  overflow-x: auto;
  white-space: pre;
}
```

긴 코드가 페이지 폭을 깨지 않도록:

```text
Horizontal Scroll
```

을 허용한다.

코드 영역은 일반 Description과 쉽게 구별되어야 한다.

---

# 16. FLAG 제출 결과 피드백

FLAG 제출 결과는 **Toast보다 Inline Alert 방식을 기본으로 사용한다.**

이유:

* FLAG 입력과 결과의 관계가 명확함
* 구현이 단순함
* 사용자가 메시지를 놓치기 어려움
* 접근성 관리가 쉬움

위치:

```text
FLAG Input
Submit Button
↓
Inline Alert
```

## Correct

```text
┌────────────────────────────────────┐
│ ✓ Correct!                         │
│ 문제를 해결했습니다. +100 Points   │
└────────────────────────────────────┘
```

## Incorrect

```text
┌────────────────────────────────────┐
│ ✕ Incorrect Flag                   │
│ FLAG를 다시 확인해주세요.           │
└────────────────────────────────────┘
```

## Already Solved

```text
┌────────────────────────────────────┐
│ ✓ Already Solved                   │
│ 이미 해결한 문제입니다.             │
└────────────────────────────────────┘
```

## Rate Limited

```text
┌────────────────────────────────────┐
│ ⚠ Too Many Requests                │
│ 잠시 후 다시 시도해주세요.           │
└────────────────────────────────────┘
```

페이지 새로고침 없이 표시한다.

API 요청이 다시 시작되면 필요에 따라 이전 오류 메시지를 초기화한다.

Toast는 다음과 같은 전역적이고 일시적인 이벤트에만 선택적으로 사용할 수 있다.

```text
Profile Updated
Challenge Created
Challenge Deleted
```

FLAG 정답/오답 결과에는 기본적으로 사용하지 않는다.

---

# 17. Ranking Page

```text
┌──────┬──────────────────┬─────────┬────────┐
│ Rank │ User             │ Solved  │ Score  │
├──────┼──────────────────┼─────────┼────────┤
│  1   │ hacker01         │   10    │  2100  │
│  2   │ security_student │    8    │  1700  │
│  3   │ coder            │    7    │  1500  │
└──────┴──────────────────┴─────────┴────────┘
```

상위 3명은 약간 강조한다.

현재 로그인 사용자의 행도 구분할 수 있다.

---

# 18. My Page

```text
security_student

Rank #4

1,300 Points
7 Challenges Solved
```

Stats:

```text
┌────────────┐
│ SCORE      │
│ 1,300      │
└────────────┘

┌────────────┐
│ SOLVED     │
│ 7          │
└────────────┘

┌────────────┐
│ RANK       │
│ #4         │
└────────────┘
```

그 아래:

```text
Solved Challenges
Recent Submissions
```

---

# 19. Admin Page

```text
Admin Dashboard

[ Add Challenge ]

Challenges
────────────────────────────────────────

Hidden Message     WEB       EDIT   DELETE
Caesar Cipher      CRYPTO    EDIT   DELETE
Image Secret       FORENSICS EDIT   DELETE
```

문제 Form:

```text
Title
Category
Difficulty
Score
Description
Flag
Artifact
Active
```

FLAG는 일반 사용자 화면에서 절대 표시하지 않는다.

---

# 20. Empty State

```text
No Challenges

현재 등록된 문제가 없습니다.
새로운 문제가 곧 추가될 예정입니다.
```

---

# 21. Loading State

```text
Loading challenges...
```

또는 Skeleton UI.

---

# 22. Error State

```text
문제를 불러오지 못했습니다.

[ Retry ]
```

서버 내부 오류는 표시하지 않는다.

---

# 23. Button

Primary:

```text
Start Challenge
Submit Flag
Login
Create Challenge
```

Secondary:

```text
Cancel
Back
View Ranking
Download Artifact
```

Danger:

```text
Delete Challenge
```

Delete는 확인 절차를 사용한다.

---

# 24. Form

모든 Input에는 Label을 제공한다.

권장:

```text
Username
[ Enter username ]
```

Validation 오류는 Input 근처에 표시한다.

---

# 25. 반응형

Desktop:

```text
Challenge Grid
3 Columns
```

Tablet:

```text
2 Columns
```

Mobile:

```text
1 Column
```

---

# 26. 접근성

기본적으로 다음을 고려한다.

* 충분한 색 대비
* 명확한 접근성 역할과 이름
* Form Label
* Keyboard Navigation
* Focus Ring
* Button / Link 구분
* 색상만으로 의미 전달하지 않음
* Enter를 통한 Form Submit
* semantic HTML과 ARIA 접근성 적용

Inline Alert는 가능하면 보조 기술에서도 상태 변화를 확인할 수 있도록 설계한다.

---

# 27. 애니메이션

허용:

```text
Button Hover
Card Hover
Modal Fade
Loading
```

피해야 할 것:

```text
과도한 Neon Glow
Matrix Background
지속적인 화면 흔들림
과도한 3D
불필요한 움직임
```

---

# 28. 공통 Component

```text
Header
Footer
Button
Card
ChallengeCard
Badge
Input
Modal
InlineAlert
Toast
Loading
EmptyState
StatCard
RankingTable
CodeBlock
ArtifactDownload
```

동일 Component의 디자인을 페이지마다 새로 만들지 않는다.

---

# 29. 최종 사용자 흐름

```text
Home
 ↓
Sign Up
 ↓
Login
 ↓
Challenges
 ↓
Challenge Detail
 ↓
Artifact Download
 ↓
Solve
 ↓
Submit Flag
 ↓
Inline Feedback
 ↓
Score Update
 ↓
Ranking
 ↓
My Page
```

사용자가 다음 행동을 쉽게 이해할 수 있어야 한다.

---

# 30. 구현 우선순위

```text
1. Header / Layout

2. Home

3. Login

4. Register

5. Challenges

6. Challenge Detail

7. Inline FLAG Feedback

8. Artifact Download UI

9. Ranking

10. My Page

11. Admin
```

---

---

# Community UI/UX

## 1. Navigation

Community 기능 추가 후 기본 Navigation은 다음과 같이 구성한다.

```text
MiniCTF

Challenges
Community
Ranking
My Page
```

비로그인 상태에서는 기존 Login / Sign Up 버튼을 유지한다.

---

## 2. Challenge Discussion

Challenge Detail 페이지 하단에 Discussion 영역을 배치한다.

```text
Challenge Detail

Problem
Artifact
FLAG Submit

────────────────────────────

Discussion

[ General ] [ Solver Discussion 🔒 ]
```

General과 Solver Discussion은 Tab 형태로 구분한다.

---

## 3. General Discussion

문제를 해결하지 않은 사용자도 접근할 수 있다.

```text
General Discussion
────────────────────────────────

user01                         10:32
문제 파일이 정상적으로 열리지 않습니다.

user02                         10:35
저는 정상적으로 다운로드됩니다.

────────────────────────────────

[ 댓글을 입력하세요...                 ]
[ Comment ]
```

각 댓글에는 다음 정보를 표시한다.

- 작성자
- 작성 시간
- 내용

본인의 댓글에는 필요에 따라 Edit / Delete 버튼을 제공한다.

---

## 4. Solver Discussion

Challenge를 해결하지 않은 사용자는 다음과 같은 잠금 상태를 보여준다.

```text
Solver Discussion 🔒

┌────────────────────────────────────┐
│ 🔒 Solver Only                     │
│                                    │
│ 문제를 해결한 후 풀이 토론을       │
│ 확인할 수 있습니다.                │
└────────────────────────────────────┘
```

Challenge를 해결한 사용자:

```text
Solver Discussion
────────────────────────────────

user03
저는 먼저 파일 구조를 확인한 뒤...

user04
다른 방식으로도 해결할 수 있습니다.

────────────────────────────────

[ 풀이 관련 내용을 작성하세요...       ]
[ Comment ]
```

잠금 상태와 접근 가능한 상태가 명확하게 구분되어야 한다.

---

## 5. Spoiler 안내

Solver Discussion에는 풀이 관련 스포일러가 포함될 수 있음을 명확히 표시한다.

예:

```text
⚠ Solver Discussion

이 영역에는 문제 풀이와 관련된
스포일러가 포함될 수 있습니다.
```

General Discussion에는 직접적인 FLAG나 풀이 방법을 작성하지 않도록 안내할 수 있다.

---

## 6. Community Main Page

기본 Layout:

```text
Community

보안과 CTF에 대한 이야기를 나눠보세요.

[ All ] [ Free ] [ Question ] [ CTF ] [ Notice ]

                                      [ Write ]

─────────────────────────────────────────────
Category     Title                 User     Date
─────────────────────────────────────────────
QUESTION     Base64 관련 질문       user01   10:24
CTF          이번 CTF 후기           user02   09:50
NOTICE       Mini-CTF 이용 안내      admin    Aug 18
FREE         안녕하세요              user03   Aug 17
─────────────────────────────────────────────
```

Desktop에서는 Table 또는 List 형태를 기본으로 사용한다.

Mobile에서는 Card 또는 간소화된 List 형태로 변경한다.

---

## 7. Community Category

Category는 Badge 형태로 표시한다.

```text
FREE
QUESTION
CTF
NOTICE
```

NOTICE는 다른 게시글보다 약간 강조할 수 있다.

색상만으로 Category를 표현하지 않고 반드시 텍스트도 함께 표시한다.

---

## 8. Community Post Detail

```text
QUESTION

Base64 관련 질문

user01 · 2026.08.18 10:24
────────────────────────────────────

게시글 내용...

────────────────────────────────────

Comments 3

user02
댓글 내용...

user03
댓글 내용...

────────────────────────────────────

[ 댓글을 입력하세요...                 ]
[ Comment ]
```

본인 게시글에는:

```text
Edit
Delete
```

Action을 제공한다.

---

## 9. Community Write Page

필드:

```text
Category
Title
Content
```

예:

```text
Write Post

Category
[ QUESTION ▼ ]

Title
[________________________________]

Content
┌────────────────────────────────┐
│                                │
│                                │
│                                │
└────────────────────────────────┘

[ Cancel ]               [ Post ]
```

입력값 Validation Error는 해당 입력 필드 가까이에 Inline 방식으로 표시한다.

---

## 10. Comment Component

Challenge Discussion과 Community 댓글은 가능한 한 동일한 Comment Component를 사용한다.

```text
┌──────────────────────────────────────┐
│ user01                    10:35      │
│                                      │
│ 댓글 내용                            │
│                                      │
│                         Edit Delete  │
└──────────────────────────────────────┘
```

본인이 작성하지 않은 댓글에는 일반적으로 Edit / Delete 버튼을 표시하지 않는다.

실제 수정/삭제 권한 검사는 반드시 Backend에서 수행한다.

---

## 11. 댓글 작성 Feedback

댓글 작성 후 전체 페이지를 새로고침하지 않는 방식을 권장한다.

성공한 댓글은 댓글 목록에 즉시 추가한다.

오류는 댓글 입력창 근처에 Inline Alert로 표시한다.

일반 오류:

```text
⚠ 댓글을 등록하지 못했습니다.
잠시 후 다시 시도해주세요.
```

Rate Limit:

```text
⚠ 너무 빠르게 댓글을 작성하고 있습니다.
잠시 후 다시 시도해주세요.
```

---

## 12. Empty State

게시글이 없는 경우:

```text
아직 작성된 게시글이 없습니다.

첫 번째 글을 작성해보세요.

[ Write Post ]
```

댓글이 없는 경우:

```text
아직 댓글이 없습니다.
첫 번째 의견을 남겨보세요.
```

---

## 13. Loading / Error State

Community 데이터를 불러오는 동안 Loading 상태를 표시한다.

예:

```text
Loading posts...
```

오류가 발생하면:

```text
게시글을 불러오지 못했습니다.

[ Retry ]
```

와 같이 표시한다.

서버 내부 오류나 Stack Trace는 UI에 표시하지 않는다.

---

## 14. Pagination

게시글 수 증가를 고려하여 Pagination을 지원할 수 있는 Layout으로 설계한다.

예:

```text
← Previous

1  2  3  4  5

Next →
```

초기 버전에서는 단순한 Previous / Next 방식도 허용한다.

---

## 15. Search

추후 Community 검색 기능을 추가할 수 있도록 상단에 Search 영역을 고려한다.

```text
[ Search posts...                    ] [ Search ]
```

검색 기능은 초기 MVP 필수 기능이 아니다.

---

## 16. Community 키보드 접근성

다음 Community 기능은 모두 키보드로 접근할 수 있어야 한다.

- Category Tab
- Discussion Tab
- 게시글 링크
- Write 버튼
- Edit / Delete 버튼
- 댓글 입력창
- Comment 버튼
- Pagination
- Search

기존 Focus Ring 규칙을 동일하게 적용한다.

```tsx
<nav aria-label="Community navigation">
  {/* Category and Discussion tabs remain keyboard accessible. */}
</nav>
```

키보드 사용자가 `Tab`, `Shift + Tab`, `Enter`를 이용해 Community의 주요 기능을 사용할 수 있어야 한다.

Discussion Tab 역시 현재 선택된 상태와 Focus 상태를 명확하게 구분한다.

---

## 17. Community Responsive Design

Desktop:

```text
게시글 Table / List
넓은 Discussion Layout
```

Tablet:

```text
간소화된 List
```

Mobile:

```text
게시글 Card / List
작성자와 날짜는 두 번째 줄에 표시
```

모바일에서도 다음 기능이 정상적으로 제공되어야 한다.

- 글 작성
- 게시글 조회
- 댓글 작성
- Category 선택
- Discussion 전환

---

## 18. Community 디자인 원칙

Community는 Mini-CTF와 동일한 디자인 시스템을 사용한다.

Community만 별도의 다른 사이트처럼 보이면 안 된다.

다음 요소를 기존 디자인과 통일한다.

- Dark Theme
- Accent Color
- Typography
- Button
- Badge
- Input
- Card
- Inline Alert
- Focus Ring
- Loading State
- Empty State
- Error State

최종적으로 Challenge와 Community가 하나의 통합된 보안 학습 플랫폼처럼 보여야 한다.
# 31. 최종 디자인 방향

최종 결과물은

> **깔끔하고 현대적인 Dark Theme 기반 보안 학습 플랫폼**

을 목표로 한다.

특히 CTF 문제를 탐색하고, 파일 또는 코드를 분석하고, FLAG를 제출하는 흐름이 빠르고 직관적이어야 한다.

마우스를 사용하지 않고도 `Tab`, `Shift + Tab`, `Enter` 등을 이용해 주요 기능을 사용할 수 있을 정도의 키보드 접근성을 확보한다.

화려함보다 **실제로 사용할 수 있는 보안 학습 서비스처럼 보이는 것**을 우선한다.
# 0. 2인 팀 역할과 디자인 협업

이 문서는 기존 개인 개발 기준을 2인 팀 기준으로 확장한다. 현재 색감, 다크 테마, 카드형 레이아웃, 보안 학습 플랫폼의 분위기는 유지한다.

## 담당 범위

- 백엔드 담당: Java/Spring Boot REST API, FastAPI 내부 REST 서비스, PostgreSQL 연동, 인증·권한·문제·점수·랭킹 기능
- 프론트엔드 담당: React/TypeScript 화면, 라우팅, API client, 상태·로딩·오류 처리, 반응형 UI와 접근성
- 공동 담당: API 응답 계약, 사용자 흐름, 보안 상태 표시, 테스트 시나리오, Git/GitHub 통합

## 디자인 변경 원칙

- 기존 색상 시스템과 스타일 토큰을 기본값으로 유지한다.
- 프론트엔드 담당자가 시각적 변경을 주도하며, 백엔드 담당자는 API 상태와 데이터 구조가 화면에 미치는 영향만 제안한다.
- API 변경이 필요한 UI 변경은 먼저 요청·응답 예시와 오류 코드를 문서화한 뒤 구현한다.
- FastAPI는 내부 서비스이므로 브라우저 화면에 직접 URL을 노출하지 않는다. 화면은 Java/Spring Boot 공개 REST API만 호출한다.
- 모든 화면은 정상, 로딩, 빈 상태, 오류, 인증 만료 상태를 디자인한다.

## Codex 작업 전환

사용자가 `나는 백엔드 담당이야`라고 말하면 디자인 문서에서는 API 계약, 오류 상태, 인증 흐름, 데이터 표시 요구사항만 우선 참고한다.

사용자가 `나는 프론트엔드 담당이야`라고 말하면 이 문서의 색상·타이포그래피·컴포넌트·반응형 규칙과 기존 `frontend/` 구현을 우선 참고한다. 새 스타일을 만들기 전에 기존 토큰과 컴포넌트를 재사용한다.
