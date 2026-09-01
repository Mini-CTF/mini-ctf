import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, type WheelEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, rankingChangedEvent, sessionExpiredEvent, sessionExpiredMessage } from './api/client'
import { clearAuthToken, getAuthToken, setAuthToken } from './api/session'
import { subscribeToSocialUpdates } from './api/realtime'
import GettingStartedTutorial from './onboarding'
import { guideForChallenge } from './challengeGuides'
import { articleBySlug, LEARN_FIELDS, learnArticles, learnEn } from './learnContent'
import StrokeText from './components/StrokeText'
import Beams from './components/Beams'
import AetherFlowHero from './components/ui/aether-flow-hero'
import ClickSpark from './components/ClickSpark'
import GlobalSpecularButtons from './components/GlobalSpecularButtons'
import FloatingQuickMenu from './components/FloatingQuickMenu'
import type { AdminComment, AdminDashboard, AdminPost, AssistantFeedback, AttendanceRankingRow, AttendanceSummary, ChallengeDetail, ChallengeSummary, CommunityCategory, DirectMessage, Friend, HiddenSummary, LearningBookmark, LearningOverview, PopularChallenge, PostComment, PostDetail, PostSummary, Profile, PublicProfile, RankingRow, Stats, User, VaultCosmetic, VaultSummary } from './types/api'
import flagBoxLogo from './assets/flagbox-logo-cutout.png'
import cipherVaultRelics from './assets/cipher-vault-relic-grid.png'
import './App.css'
import './typography.css'

type Filter = 'ALL' | 'WEB' | 'FORENSIC' | 'REVERSING'
type DifficultyFilter = 'ALL' | 'BEGINNER' | 'EASY' | 'NORMAL' | 'ADVANCED' | 'EXPERT'
const difficultyOrder: Record<string, number> = { BEGINNER: 0, EASY: 1, NORMAL: 2, ADVANCED: 3, EXPERT: 4 }
const byDifficulty = (a: ChallengeSummary, b: ChallengeSummary) => (difficultyOrder[a.difficulty] ?? 9) - (difficultyOrder[b.difficulty] ?? 9) || a.score - b.score

const emptyStats: Stats = { challenges: 0, solves: 0, users: 0 }
function oauthErrorMessage(code: string | null) {
  return code
    ? code === 'authorization_request_not_found'
    ? 'OAuth session expired. Open the login page and try again.'
    : code === 'discord_rate_limited'
      ? 'Discord temporarily rate-limited the sign-in request. Please wait a few minutes and try again.'
      : `OAuth sign-in could not be completed. Error code: ${code}`
    : ''
}
type Theme = 'dark' | 'light'
type Language = 'ko' | 'en'
const initialTheme: Theme = localStorage.getItem('mini-ctf-theme') === 'light' ? 'light' : 'dark'
const initialLanguage: Language = localStorage.getItem('flagbox-language') === 'en' ? 'en' : 'ko'
const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL ?? 'http://localhost:8080'
const publicSiteUrl = 'https://flagbox.vercel.app'
const publicProfileEvent = 'flagbox:open-public-profile'
function openPublicProfile(username: string) { window.dispatchEvent(new CustomEvent<string>(publicProfileEvent, { detail: username })) }

const uiCopy = {
  ko: { home: '홈', learn: '학습', wargame: '워게임', ranking: '랭킹', community: '커뮤니티', profile: '마이 페이지', shop: '상점', admin: '관리', login: '로그인', logout: '로그아웃', language: '영어로 변경', footer: '안전하게 배우고, 직접 풀어보세요.', status: '학습 플랫폼 정상 운영 중' },
  en: { home: 'Home', learn: 'Learn', wargame: 'Wargames', ranking: 'Rankings', community: 'Community', profile: 'My Page', shop: 'Shop', admin: 'Admin', login: 'Sign in', logout: 'Sign out', language: '한국어로 변경', footer: 'Learn safely. Solve it yourself.', status: 'Learning platform online' },
} as const

const englishToKorean: Record<string, string> = {
  'Menu': '메뉴', 'Home': '홈', 'Wargames': '워게임', 'Rankings': '랭킹', 'Community': '커뮤니티', 'My Page': '마이 페이지', 'Shop': '상점', 'Admin': '관리', 'Sign in': '로그인', 'Sign out': '로그아웃',
  'Loading live platform data...': '플랫폼 정보를 불러오는 중...', 'Retry': '다시 시도', 'Loading...': '불러오는 중...', 'Back home': '홈으로 돌아가기', 'Back to community': '커뮤니티로 돌아가기',
  'Create your account.': '계정을 만들어 보세요.', 'Sign in to continue.': '계속하려면 로그인하세요.', 'Username': '아이디', 'Display name (optional)': '표시 이름 (선택)', 'Password': '비밀번호', 'Confirm password': '비밀번호 확인', 'Create account': '계정 만들기',
  'or continue with': '또는 다음 계정으로 계속하기', 'Already have an account?': '이미 계정이 있나요?', 'New to Mini CTF?': '처음 오셨나요?', 'Continue with Google': 'Google로 계속하기', 'Continue with GitHub': 'GitHub로 계속하기', 'Continue with Discord': 'Discord로 계속하기',
  'START HERE': '여기서 시작', 'Challenges to try now': '지금 도전할 문제', 'View all wargames': '워게임 전체 보기', 'Previous banner': '이전 배너', 'Next banner': '다음 배너', 'Banner selection': '배너 선택',
  'Solve your first challenge': '첫 문제 풀어보기', 'Browse wargames': '워게임 둘러보기', 'Visit community': '커뮤니티 둘러보기', 'Explore rankings': '랭킹 둘러보기',
  'New to security?': '처음 배우는 보안은', 'Start with FlagBox.': 'FlagBox로 가볍게.', 'One challenge a day.': '하루 한 문제로', 'A great place to start.': '가볍게 시작해요.',
  'Do not get stuck alone.': '혼자 고민하지 말고', 'Learn together.': '함께 배워요.', 'Security gets easier': '보안은, 직접 풀어보면', 'when you solve it.': '더 쉬워집니다.',
  'Take your time.': '막힐 땐 괜찮아요.', 'Hints are here.': '힌트가 함께해요.', 'Small challenges today.': '오늘의 작은 도전이', 'Stronger skills tomorrow.': '내일의 실력이 돼요.',
  'Challenge': '문제', 'Challenges': '문제', 'Submit': '제출', 'Correct': '정답', 'Incorrect': '오답', 'Locked': '잠김',
  'WARGAME': '워게임', 'RANKING': '랭킹', 'Which challenge would you like to solve first?': '어떤 문제부터 풀어볼까요?', 'Pick one at your own pace, and use a hint whenever you get stuck.': '부담 없이 골라보고, 막히면 힌트를 사용해 보세요.',
  'Read the challenge, follow the clues step by step, and submit the FLAG.': '문제를 읽고, 차근차근 단서를 찾아 FLAG를 제출해 보세요.', 'points': '점', 'Review': '다시 보기', 'Open challenge': '문제 열기',
  'Back to challenges': '문제 목록으로', 'REWARD': '보상', 'THE BRIEF': '문제 설명', 'Analyze carefully.': '천천히 살펴보세요.', 'ARTIFACT': '첨부 파일', 'Challenge artifact': '문제 파일', 'Protected download from the API': '안전하게 제공되는 문제 파일입니다.', 'Download': '다운로드', 'SUBMIT FLAG': 'FLAG 제출', 'What did you find?': '찾아낸 FLAG를 제출해 보세요.', 'Flag value': 'FLAG 입력', 'Submit flag': 'FLAG 제출', 'Sign in to submit': '로그인 후 제출할 수 있어요.',
  'Need a nudge?': '작은 힌트가 필요하신가요?', 'Hint revealed': '힌트를 확인했어요', 'Reveal hint': '힌트 보기',
  'Signal in Plain Sight': '평범한 곳에 숨은 신호', 'Proxy Afterimage': '프록시의 흔적', 'Orbit Gatekeeper': '궤도 관문 수문장',
  'A captured status message looks ordinary, but its alphabet only uses Base64 characters. Decode the payload and submit the recovered FLAG.': '평범해 보이는 상태 메시지지만 Base64 문자만 사용하고 있어요. 내용을 디코딩해 FLAG를 찾아 제출해 보세요.',
  'Review the supplied proxy trace. The analyst preserved one suspicious request in hex. Follow the transformation hints in the artifact to recover the FLAG.': '제공된 프록시 기록을 살펴보세요. 분석가는 의심스러운 요청 하나를 16진수로 남겨 두었습니다. 문제 파일의 변환 단서를 따라 FLAG를 복구해 보세요.',
  'A small offline verifier checks a passphrase before opening a maintenance gate. Reverse its deterministic transform and recover the accepted FLAG. No network target is involved.': '작은 오프라인 검증기가 암호 구문을 확인한 뒤 정비 관문을 엽니다. 정해진 변환 과정을 거꾸로 따라 올바른 FLAG를 찾아보세요. 네트워크 대상은 없습니다.',
  'Identify the encoding layer before trying to break the message.': '메시지를 해독하기 전에 어떤 인코딩이 사용됐는지 먼저 확인해 보세요.', 'Follow the suspicious request and decode each representation in order.': '의심스러운 요청을 따라가며 각 표현 방식을 차례대로 디코딩해 보세요.', "Work backwards from the verifier's final comparison and undo one round at a time.": '검증기의 마지막 비교 지점부터 거꾸로 따라가며 한 단계씩 되돌려 보세요.', 'Use the challenge description as your first source of truth and isolate one clue at a time.': '문제 설명을 첫 단서로 삼고, 단서를 하나씩 분리해 살펴보세요.', 'Could not reveal the hint.': '힌트를 불러오지 못했어요.',
  'Building progress together': '함께 쌓아가는 기록', 'Scores and records built by solving challenges.': '문제를 해결하며 쌓은 점수와 기록이에요.', 'A steady record of learning every day.': '매일 학습을 이어온 꾸준한 기록이에요.',
  'Score ranking': '점수 랭킹', 'Attendance ranking': '출석 랭킹', 'Rank': '순위', 'Learner': '학습자', 'Solves': '해결', 'Score': '점수', 'Total': '누적', 'Streak': '연속',
  'Profile': '프로필', 'Edit profile': '프로필 수정', 'Save': '저장', 'Cancel': '취소', 'Delete': '삭제', 'Edit': '수정', 'Close': '닫기', 'Search': '검색',
  'YOUR PROGRESS': '나의 학습 기록', 'Sign in to track your progress.': '학습 기록을 확인하려면 로그인하세요.', 'Your score and solved challenges are tied to your authenticated account.': '점수와 해결한 문제는 로그인한 계정에 안전하게 저장됩니다.',
  'OPERATOR PROFILE': '프로필', 'No status message yet.': '아직 상태 메시지가 없어요.', 'total points': '누적 점수', 'DAILY OPERATIONS': '오늘의 학습', 'Attendance': '출석', 'Checked in today': '오늘 출석 완료', 'Check in today': '오늘 출석하기',
  'Current streak': '현재 연속 출석', 'Longest streak': '최장 연속 출석', 'Total days': '누적 출석일', 'Profile title': '프로필 칭호', 'Earn a title to equip it': '칭호를 획득하면 여기서 적용할 수 있어요.',
  'Customize profile': '프로필 꾸미기', 'Profile appearance': '프로필 장식', 'Choose a frame, accessory, or title from items you own.': '보유한 테두리, 장식, 칭호를 바로 적용해 보세요.', 'No appearance items yet.': '아직 보유한 꾸미기 아이템이 없어요.', 'Display name': '표시 이름', 'Status message': '상태 메시지', 'What are you working on?': '지금 어떤 학습을 하고 있나요?', 'Save profile': '프로필 저장', 'Open Cipher Vault': '상점 열기', 'Browse challenges': '워게임 둘러보기', 'MY LOADOUT': '내 꾸미기 아이템', 'Unequip title': '칭호 해제',
  'Friends': '친구', 'Account username (e.g. @player_1)': '계정 아이디 (예: @player_1)', 'Add': '추가', 'No friends yet.': '아직 친구가 없어요.', 'Accept': '수락', 'Remove': '삭제', 'Write a private message': '개인 메시지를 입력하세요', 'Send': '보내기', 'Change photo': '사진 변경', 'Upload profile photo': '프로필 사진 업로드',
  'Write a post': '글쓰기', 'Post title': '게시글 제목', 'Question': '질문', 'Free': '자유', 'Publish': '게시', 'Publish notice': '공지 게시', 'Notice title': '공지 제목', 'Write the notice content': '공지 내용을 입력하세요',
  'Ask questions, share safe write-ups, and discuss the Mini CTF training labs.': '질문을 나누고, 안전한 풀이 기록을 공유하며 Mini-CTF 워게임을 함께 배워요.', 'PINNED NOTICES': '고정 공지', 'NOTICE': '공지', 'FREE': '자유', 'QUESTION': '질문', 'Opening post...': '게시글을 여는 중...',
  'Like': '좋아요', 'Dislike': '싫어요', 'Recommend': '추천', 'Replies can be pinned by the post author.': '게시글 작성자는 답글을 고정할 수 있어요.', 'Add a constructive comment': '서로에게 도움이 되는 댓글을 남겨 보세요.', 'Write a reply': '답글을 입력하세요',
  'Comments': '댓글', 'Comment': '댓글 작성', 'Reply': '답글', 'Reply to this comment': '이 댓글에 답글 달기', 'Pin reply': '답글 고정', 'Pinned reply': '고정된 답글', 'Sign in to write': '글쓰기는 로그인 후 이용할 수 있어요', 'Sign in to join the conversation.': '대화에 참여하려면 로그인하세요.',
  'Today': '오늘', 'Collection': '보관함', 'Buy': '구매', 'Craft': '제작', 'Equip': '착용', 'Unequip': '해제', 'Claim reward': '보상 받기', 'Claimed': '받음', 'In progress': '진행 중',
  'Red Ruby Exchange': '레드 루비 교환소', 'Trade earned rubies for frames, accents, titles, and hint credits.': '모은 루비로 프로필 테두리, 장식, 칭호, 힌트 크레딧을 교환하세요.', 'Loading your collection...': '보관함을 불러오는 중...', 'Red Rubies': '레드 루비', 'Hint Credits': '힌트 크레딧', 'Earn rubies through attendance and missions': '출석과 미션으로 루비를 모아 보세요.',
  'Exchange': '교환소', 'Missions': '미션', 'My loadout': '내 꾸미기', 'Add credit': '크레딧 추가', 'Owned': '보유함', 'Acquire': '구매하기', 'Currently equipped': '현재 적용 중', 'Ready to equip': '착용 가능', 'Detach': '해제', 'Your loadout is empty.': '아직 적용한 꾸미기 아이템이 없어요.', 'Acquire a profile frame, accent, or title from the exchange.': '교환소에서 프로필 테두리, 장식, 칭호를 획득해 보세요.',
  'Account management': '계정 관리', 'Post management': '게시글 관리', 'Comment management': '댓글 관리', 'Write a new notice': '새 공지 작성', 'Published notices': '게시된 공지', 'Recent submissions': '최근 제출', 'Operations shortcuts': '빠른 작업', 'Review accounts': '계정 검토', 'Manage content': '콘텐츠 관리', 'Write a notice': '공지 작성',
  'ADMIN CONSOLE': '관리자 콘솔', 'Administrator console': '관리자 콘솔', 'Loading platform status and moderation controls.': '플랫폼 상태와 관리 기능을 불러오는 중입니다.', 'Run the platform clearly.': '플랫폼을 한눈에 관리하세요.', 'Manage accounts, community content, notices, and security records in focused workspaces.': '계정, 커뮤니티, 공지, 보안 기록을 한곳에서 관리할 수 있어요.',
  'QUICK ACTIONS': '빠른 작업', 'RECENT ACTIVITY': '최근 활동', 'SECURITY': '보안', 'Events to review': '확인이 필요한 이벤트', 'View all': '전체 보기', 'ACCOUNT MANAGEMENT': '계정 관리', 'COMMUNITY POSTS': '커뮤니티 게시글', 'COMMENTS': '댓글', 'PUBLISH NOTICE': '공지 게시', 'PUBLISHED': '게시됨', 'ANTI-CHEAT': '부정행위 방지', 'Security events': '보안 이벤트', 'CHALLENGE ACTIVITY': '문제 활동', 'Submission history': '제출 기록', 'SECURITY LOG': '보안 로그', 'Login and account events': '로그인 및 계정 이벤트', 'AUDIT TRAIL': '관리 기록', 'Administrator activity': '관리자 활동',
  'Delete account': '계정 삭제', 'Restore account': '계정 복구', 'Restore': '복구', 'Suspend': '정지', 'Loading administrator dashboard…': '관리자 대시보드를 불러오는 중…',
  'Learn safely. Solve it yourself.': '안전하게 배우고, 직접 풀어보세요.', 'Learning platform online': '학습 플랫폼 정상 운영 중', 'Skip': '건너뛰기',
  'Nothing here yet.': '아직 준비된 게 없어요.', 'New content is on the way. Check back soon.': '새로운 콘텐츠가 곧 채워질 거예요.', 'Not the correct flag. Double-check the format and try again.': '정답이 아니에요. FLAG 형식을 다시 확인해 보세요.', 'Too many attempts. Please wait a moment and try again.': '너무 많이 시도했어요. 잠시 후에 다시 시도해 주세요.', 'You have already solved this challenge.': '이미 해결한 문제예요.', 'Correct!': '정답이에요!',
  'BEGINNER': '첫걸음', 'EASY': '쉬움', 'NORMAL': '보통', 'ADVANCED': '어려움', 'EXPERT': '도전', 'WEB': '웹', 'FORENSIC': '포렌식', 'REVERSING': '리버싱', 'credits': '크레딧',
  'You have credits left.': '남은 크레딧을 확인하세요.', 'Opening challenge...': '문제를 여는 중...', 'Could not load this challenge.': '문제를 불러오지 못했어요.', 'Not enough hint credits.': '힌트 크레딧이 부족해요.',
  'All levels': '모든 난이도', 'Solved': '해결 완료', 'SOLVED': '해결 완료', 'Open': '문제 열기', 'pts': '점',
  'Pick your next challenge.': '어떤 문제부터 풀어볼까요?', 'Read the brief, then follow the guide one step at a time.': '문제를 읽고, 풀이 가이드를 따라 한 단계씩 시도해 보세요.',
  '📚 Study guide — concept · tools · steps ': '📚 학습 가이드 — 개념·도구·풀이 순서 ', 'Collapse ▲': '접기 ▲', 'Expand ▼': '펼치기 ▼',
  'The concept': '이 문제의 콘셉트', 'Tools you need': '준비물 · 도구', 'Step-by-step approach': '이렇게 순서대로 풀어 보세요',
  'Concepts first.': '개념부터 차근차근.', 'Read before you solve — each article is a 5–9 minute read.': '문제를 풀기 전에 읽으면 이해가 달라져요. 각 글은 5~9분이면 읽혀요.',
  'min read': '분 소요', '← Back to learn': '← 학습 목록으로', '✅ Quick self-check': '✅ 스스로 확인하기',
  'Concepts ready? Time to solve!': '개념이 준비됐다면, 이제 직접 풀어볼 시간!', 'Go to wargames': '워게임으로 이동',
  'Welcome to security learning at FlagBox': 'FlagBox의 보안 학습에 오신 걸 환영해요',
  'No special gear or hacking background needed — this is a space to learn by solving wargames one step at a time.': '여기는 특별한 장비나 해킹 지식이 필요하지 않아요. 워게임 문제를 한 단계씩 풀어 나가는 학습 공간입니다.',
  'Get started': '시작하기',
  'Wargames · five difficulty tiers': '워게임 · 다섯 단계 난이도',
  'From 첫걸음 to 도전 — pick the tier that fits you today. The outlined level buttons are the filters.': '첫걸음부터 도전까지, 오늘 컨디션에 맞는 난이도를 고르면 돼요. 색상 테두리 버튼이 바로 그 필터예요.',
  'Open wargames': '워게임 열기',
  'Learn, then solve right away': '학습하고 바로 풀어보세요',
  'Short articles teach the core idea, and every challenge ships with a study guide you can expand while solving.': '학습 탭의 짧은 아티클로 기본 개념을 읽고, 문제 안의 풀이 가이드를 펼치며 차근차근 따라 해 보세요.',
  'Browse learn': '학습 둘러보기',
  'Consistency beats talent': '꾸준함이 실력이 됩니다',
  'Community, daily check-ins, and hint credits have your back. The logo always brings you home.': '막히면 커뮤니티와 출석 체크, 힌트 크레딧이 함께해요. 로고를 누르면 언제든 홈으로 돌아와요.',
  "I'm ready": '준비 완료',
  'Next step': '다음 단계', 'Prev step': '이전 단계',
}
const koreanToEnglish = Object.fromEntries(Object.entries(englishToKorean).map(([english, korean]) => [korean, english])) as Record<string, string>

const adminEnglishToKorean: Record<string, string> = {
  'ACCOUNT POWERS': '계정 권한', 'QUICK ACTIONS': '빠른 작업', 'RECENT ACTIVITY': '최근 활동', 'ACTIVE ACCOUNTS': '활성 계정', 'CONTENT RECORDS': '콘텐츠 기록', 'SECURITY EVENTS': '보안 이벤트', 'RECENT SUBMISSIONS': '최근 제출',
  'ADMINISTRATION': '관리자', 'ACCOUNT MANAGEMENT': '계정 관리', 'COMMUNITY POSTS': '커뮤니티 게시글', 'COMMENTS': '댓글', 'PUBLISH NOTICE': '공지 게시', 'PUBLISHED': '게시됨', 'ANTI-CHEAT': '부정행위 방지', 'CHALLENGE ACTIVITY': '문제 활동', 'SECURITY LOG': '보안 로그', 'AUDIT TRAIL': '관리 기록', 'AI LEARNING HELPER': 'AI 학습 도우미', 'ADMIN CONSOLE': '관리자 콘솔',
  'Overview': '개요', 'Accounts': '계정', 'Content': '콘텐츠', 'Notices': '공지사항', 'Security': '보안', 'Audit logs': '관리 로그', 'AI feedback': 'AI 피드백',
  'Account Powers': '계정 권한', 'Score and cosmetic controls': '점수 및 꾸미기 관리', 'Permanent deletion is available only after a reversible deletion.': '복구 가능한 삭제 후에만 영구 삭제할 수 있습니다.',
  'Adjust score': '점수 조정', 'Grant cosmetic': '꾸미기 지급', 'Remove cosmetic': '꾸미기 회수', 'Permanent delete': '영구 삭제',
  'Run the platform clearly.': '플랫폼을 한눈에 관리하세요.', 'Manage accounts, community content, notices, and security records in focused workspaces.': '계정, 커뮤니티, 공지사항, 보안 기록을 영역별로 관리할 수 있습니다.',
  'Operations shortcuts': '빠른 작업', 'Review accounts': '계정 검토', 'Manage content': '콘텐츠 관리', 'Write a notice': '공지 작성', 'Events to review': '확인이 필요한 이벤트', 'Recent activity': '최근 활동',
  'Account management': '계정 관리', 'Edit names, suspend, restore, or delete accounts. Deleted accounts keep a private restore snapshot.': '이름 수정, 정지, 복구, 계정 삭제를 관리합니다. 삭제된 계정은 복구용 정보를 보관합니다.',
  'Edit name': '이름 수정', 'Restore account': '계정 복구', 'Restore': '복구', 'Delete account': '계정 삭제', 'Suspend': '정지',
  'Post management': '게시글 관리', 'Comment management': '댓글 관리', 'Latest': '최근', 'Write a new notice': '새 공지 작성', 'Notice title': '공지 제목', 'Write the notice content': '공지 내용을 입력하세요.', 'Publish notice': '공지 게시', 'Published notices': '게시된 공지',
  'Security events': '보안 이벤트', 'Submission history': '제출 기록', 'Login and account events': '로그인 및 계정 이벤트', 'Administrator activity': '관리자 활동', 'Only administrators can view these responses.': '관리자만 이 응답을 볼 수 있습니다.', 'No AI feedback yet.': '아직 AI 피드백이 없습니다.', 'No written comment': '작성된 의견 없음',
  'No records yet.': '아직 기록이 없습니다.', 'No security events to review.': '확인할 보안 이벤트가 없습니다.', 'Platform': '플랫폼', 'No additional details': '추가 정보 없음', 'Correct': '정답', 'Incorrect': '오답', 'Redact': '민감정보 가리기', 'Hide': '숨기기',
  'Loading administrator data...': '관리자 데이터를 불러오는 중입니다.', 'Could not load administrator data.': '관리자 데이터를 불러오지 못했습니다.', 'Could not load moderation data.': '관리 데이터를 불러오지 못했습니다.', 'Could not load AI feedback.': 'AI 피드백을 불러오지 못했습니다.',
  'Display name': '표시 이름', 'Suspension reason (shown to the user)': '정지 사유(사용자에게 표시됨)', 'Reason for this point adjustment': '점수 조정 사유', 'Cosmetic ID to grant (for example: steady_solver)': '지급할 꾸미기 ID(예: steady_solver)', 'Cosmetic ID to remove': '회수할 꾸미기 ID',
  'Point change (use a negative number to remove points)': '점수 변경량(차감하려면 음수 입력)', 'Delete this account?': '이 계정을 삭제할까요?', 'This cannot be undone and all account data will be removed.': '되돌릴 수 없으며 모든 계정 데이터가 삭제됩니다.',
}
const adminKoreanToEnglish = Object.fromEntries(Object.entries(adminEnglishToKorean).map(([english, korean]) => [korean, english])) as Record<string, string>

function localizeSystemInterface(language: Language) {
  const root = document.querySelector('.app-shell')
  if (!root) return
  const dictionary = language === 'ko' ? { ...englishToKorean, ...adminEnglishToKorean } : { ...koreanToEnglish, ...adminKoreanToEnglish }
  const isProtected = (node: Node) => node.parentElement?.closest('code, pre, textarea, input, .community-content, .comment-content, .message, [data-i18n-skip]')
  const replace = (value: string) => {
    const key = value.trim().replace(/^[^A-Za-z0-9가-힣]+/, '').trim()
    const hit = key ? dictionary[key] : undefined
    if (!hit) return value
    const start = value.indexOf(key)
    if (start === -1) return value
    return value.slice(0, start) + hit + value.slice(start + key.length)
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  textNodes.forEach((node) => {
    if (isProtected(node)) return
    const next = replace(node.nodeValue ?? '')
    if (next !== node.nodeValue) node.nodeValue = next
  })
  root.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    if (element.closest('[data-i18n-skip]')) return
    ;(['placeholder', 'aria-label', 'title'] as const).forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return
      const next = replace(value)
      if (next !== value) element.setAttribute(attribute, next)
    })
  })
}

function App() {
  return <ClickSpark sparkColor="#533aed"><GlobalSpecularButtons /><BrowserRouter><AppShell /></BrowserRouter></ClickSpark>
}

function AppShell() {
  const routerNavigate = useNavigate()
  const location = useLocation()
  const isPasswordResetLink = location.pathname === '/login' && new URLSearchParams(location.search).has('resetToken')
  const [user, setUser] = useState<User | null>(null)
  const [, setStats] = useState<Stats>(emptyStats)
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [attendanceRanking, setAttendanceRanking] = useState<AttendanceRankingRow[]>([])
  const [category, setCategory] = useState<Filter>('ALL')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('ALL')
  const [challengeSearch, setChallengeSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [compactLayout, setCompactLayout] = useState(() => window.innerWidth <= 620)
  const [error, setError] = useState('')
  const loading = false
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [headerGems, setHeaderGems] = useState<number | null>(null)
  const [showIntro, setShowIntro] = useState(() => !isPasswordResetLink && sessionStorage.getItem('flagbox-intro-seen') !== 'true')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showMemberTutorial, setShowMemberTutorial] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantFeedbackOpen, setAssistantFeedbackOpen] = useState(false)

  useEffect(() => {
    const page = location.pathname.startsWith('/challenges')
      ? { title: '워게임 문제', description: '웹, 포렌식, 리버싱 CTF 워게임을 풀며 보안 실력을 키워 보세요.' }
      : location.pathname.startsWith('/ranking')
        ? { title: '랭킹', description: 'FlagBox 학습자의 워게임 점수와 해결 기록을 확인하세요.' }
        : location.pathname.startsWith('/community')
          ? { title: '커뮤니티', description: 'FlagBox 학습자와 질문, 학습 기록, 안전한 풀이 경험을 나누세요.' }
          : location.pathname.startsWith('/learn')
            ? { title: '보안 학습 가이드', description: 'CTF 워게임을 시작하기 위한 웹, 포렌식, 리버싱 보안 학습 가이드입니다.' }
            : location.pathname.startsWith('/login')
              ? { title: '로그인', description: 'FlagBox에서 CTF 워게임 보안 학습을 시작하세요.' }
              : { title: 'CTF 워게임 보안 학습 플랫폼', description: 'FlagBox는 CTF 워게임, 보안 학습 가이드, 랭킹과 커뮤니티를 제공하는 온라인 보안 학습 플랫폼입니다.' }
    const title = `FlagBox | ${page.title}`
    const canonicalUrl = `${publicSiteUrl}${location.pathname === '/' ? '/' : location.pathname}`
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', page.description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', page.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
  }, [location.pathname])

  useEffect(() => {
    if (!isPasswordResetLink) return
    setShowIntro(false)
    setShowTutorial(false)
    setShowMemberTutorial(false)
  }, [isPasswordResetLink])
  useEffect(() => {
    if (!showIntro) return
    const timer = window.setTimeout(() => {
      setShowIntro(false)
      sessionStorage.setItem('flagbox-intro-seen', 'true')
    }, 5850)
    return () => window.clearTimeout(timer)
  }, [showIntro])
  useEffect(() => {
    if (isPasswordResetLink || showIntro || user || sessionStorage.getItem('flagbox-tutorial-seen') === 'true') return
    if (sessionStorage.getItem('flagbox-intro-seen') !== 'true') return
    const timer = window.setTimeout(() => setShowTutorial(true), 240)
    return () => window.clearTimeout(timer)
  }, [isPasswordResetLink, showIntro, user])
  useEffect(() => {
    if (!user || showIntro || showTutorial || sessionStorage.getItem('flagbox-member-tutorial-seen') === 'true') return
    const timer = window.setTimeout(() => setShowMemberTutorial(true), 380)
    return () => window.clearTimeout(timer)
  }, [user, showIntro, showTutorial])
  useEffect(() => {
    document.documentElement.classList.toggle('flagbox-intro-active', showIntro)
    return () => document.documentElement.classList.remove('flagbox-intro-active')
  }, [showIntro])

  const refresh = useCallback(async () => {
    setError('')
    const [statsResult, challengesResult, rankingResult, attendanceRankingResult] = await Promise.allSettled([
      api.stats(),
      api.challenges(),
      api.ranking(),
      api.attendanceRanking(),
    ])
    if (statsResult.status === 'fulfilled') setStats(statsResult.value)
    if (challengesResult.status === 'fulfilled') setChallenges(challengesResult.value)
    if (rankingResult.status === 'fulfilled') setRanking(rankingResult.value)
    if (attendanceRankingResult.status === 'fulfilled') setAttendanceRanking(attendanceRankingResult.value)

    const failures = [statsResult, challengesResult, rankingResult, attendanceRankingResult].filter(
      (result) => result.status === 'rejected',
    )
    if (failures.length > 0) {
      const firstFailure = failures[0] as PromiseRejectedResult
      setError(
        firstFailure.reason instanceof Error
          ? `Some platform data could not be loaded. ${firstFailure.reason.message}`
          : 'Some platform data could not be loaded. Please retry.',
      )
    }
  }, [])

  const refreshWallet = useCallback(async () => {
    if (!getAuthToken()) {
      setHeaderGems(null)
      return
    }
    try {
      setHeaderGems((await api.vault()).gems)
    } catch {
      // The page can still work while the optional wallet indicator retries later.
    }
  }, [])

  useEffect(() => {
    void refreshWallet()
  }, [user?.username, refreshWallet])

  useEffect(() => {
    const expireSession = (event: Event) => {
      const message = event instanceof CustomEvent && typeof event.detail === 'string' ? event.detail : sessionExpiredMessage
      clearAuthToken()
      setUser(null)
      setError(message)
      routerNavigate('/login?sessionExpired=1', { replace: true })
    }
    window.addEventListener(sessionExpiredEvent, expireSession)
    return () => window.removeEventListener(sessionExpiredEvent, expireSession)
  }, [routerNavigate])
  useEffect(() => {
    if (!user || !getAuthToken()) return
    const timer = window.setInterval(() => { void api.me().catch(() => undefined) }, 10_000)
    return () => window.clearInterval(timer)
  }, [user])

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) {
      setAuthToken(token)
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (getAuthToken()) {
      api.me().then(setUser).catch(() => clearAuthToken())
    }
    // The tutorial and its static banner should not wait for every live API request.
    // Render immediately, then fill each independent data area as it arrives.
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [refresh])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!getAuthToken()) return
      void api.me().then(setUser).catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const refreshRankings = () => {
      void Promise.all([api.stats(), api.ranking(), api.attendanceRanking()])
        .then(([nextStats, nextRanking, nextAttendanceRanking]) => {
          setStats(nextStats)
          setRanking(nextRanking)
          setAttendanceRanking(nextAttendanceRanking)
        })
        .catch(() => undefined)
    }
    window.addEventListener(rankingChangedEvent, refreshRankings)
    return () => window.removeEventListener(rankingChangedEvent, refreshRankings)
  }, [])

  useEffect(() => {
    const updateLayout = () => setCompactLayout(window.innerWidth <= 620)
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('mini-ctf-theme', theme)
  }, [theme])
  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('flagbox-language', language)
  }, [language])
  useLayoutEffect(() => {
    localizeSystemInterface(language)
    const root = document.querySelector('.app-shell')
    if (!root) return
    const observer = new MutationObserver(() => localizeSystemInterface(language))
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] })
    return () => observer.disconnect()
  }, [language])

  const text = uiCopy[language]

  const featuredChallenges = useMemo(
    () => [...challenges].sort((a, b) => Number(a.solved) - Number(b.solved) || byDifficulty(a, b)).slice(0, 3),
    [challenges],
  )
  const visibleChallenges = useMemo(
    () => {
      const filtered = challenges
        .filter((item) => category === 'ALL' || item.category === category)
        .filter((item) => difficulty === 'ALL' || item.difficulty === difficulty)
        .filter((item) => item.title.toLocaleLowerCase().includes(challengeSearch.trim().toLocaleLowerCase()))
      return filtered.sort(byDifficulty)
    },
    [category, difficulty, challengeSearch, challenges],
  )
  const go = useCallback((path: string) => {
    setMobileNavOpen(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'auto' })
    routerNavigate(path)
  }, [routerNavigate])
  const completeAuth = (result: { token: string; user: User }) => {
    setAuthToken(result.token)
    setUser(result.user)
    go('/challenges')
    void refresh()
    void refreshWallet()
  }
  const syncAppearance = async () => {
    try {
      setUser(await api.me())
      await refresh()
      await refreshWallet()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh your profile.')
    }
  }
  const logout = () => {
    clearAuthToken()
    setUser(null)
    setHeaderGems(null)
    go('/')
    void refresh()
  }
  const dismissIntro = () => {
    setShowIntro(false)
    sessionStorage.setItem('flagbox-intro-seen', 'true')
  }

  const path = location.pathname
  const guarded = (node: ReactNode) => loading ? <div className="page"><LoadingState label="Loading live platform data..." /></div> : node
  return <div className="app-shell">
    {showIntro && <FlagBoxIntro onSkip={dismissIntro} />}
      {showTutorial && <GettingStartedTutorial onClose={() => { setShowTutorial(false); sessionStorage.setItem('flagbox-tutorial-seen', 'true') }} onNavigate={go} firstChallengeId={challenges[0]?.id} lang={language} />}
      {showMemberTutorial && <GettingStartedTutorial scope="member" onClose={() => { setShowMemberTutorial(false); sessionStorage.setItem('flagbox-member-tutorial-seen', 'true') }} onNavigate={go} lang={language} />}
    <header className="site-header">
      <button className="brand" type="button" onClick={() => go('/')} aria-label="FlagBox 홈으로 이동"><img src={flagBoxLogo} alt="" /><span>FlagBox</span></button>
      {compactLayout && <button className="menu-toggle" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="primary-navigation" style={{ display: 'block', position: 'fixed', top: '21px', right: '20px', zIndex: 10 }}>Menu<span className="sr-only"> navigation</span></button>}
      <nav id="primary-navigation" className={mobileNavOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary navigation">
        <NavButton active={path === '/'} onClick={() => go('/')}>{text.home}</NavButton>
        <NavButton active={path.startsWith('/challenges')} onClick={() => go('/challenges')}>{text.wargame}</NavButton>
        <NavButton active={path.startsWith('/ranking')} onClick={() => go('/ranking')}>{text.ranking}</NavButton>
        <NavButton active={path.startsWith('/community')} onClick={() => go('/community')}>{text.community}</NavButton>
        <NavButton active={path.startsWith('/learn')} onClick={() => go('/learn')}>{text.learn}</NavButton>
        <NavButton active={path.startsWith('/profile')} onClick={() => go('/profile')}>{text.profile}</NavButton>
        {user && <NavButton active={path.startsWith('/friends')} onClick={() => go('/friends')}>Friends</NavButton>}
        {user && <NavButton active={false} onClick={() => { setMobileNavOpen(false); setVaultOpen(true) }}>{text.shop}</NavButton>}
        {user?.role === 'ADMIN' && <NavButton active={path.startsWith('/admin')} onClick={() => go('/admin')}>{text.admin}</NavButton>}
        <button className="nav-button mobile-language" type="button" onClick={() => setLanguage((current) => current === 'ko' ? 'en' : 'ko')} aria-label={text.language}><GlobeIcon /> {language === 'ko' ? 'EN' : 'KO'}</button>
        {user ? <button className="nav-button mobile-auth" type="button" onClick={logout}>{text.logout}</button> : <button className="nav-button mobile-auth" type="button" onClick={() => go('/login')}>{text.login}</button>}
      </nav>
      <div className="header-actions"><button className={`language-toggle ${language === 'en' ? 'is-english' : ''}`} type="button" aria-pressed={language === 'en'} aria-label={text.language} onClick={() => setLanguage((current) => current === 'ko' ? 'en' : 'ko')}><span className="language-toggle-track" aria-hidden="true"><span className="language-toggle-thumb"><GlobeIcon /></span></span><span>{language === 'ko' ? 'KO' : 'EN'}</span></button><button className={`theme-toggle ${theme === 'light' ? 'is-light' : ''}`} type="button" aria-pressed={theme === 'light'} aria-label={theme === 'dark' ? '라이트 테마로 변경' : '다크 테마로 변경'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb">{theme === 'dark' ? '☾' : '☀'}</span></span></button>{user ? <><button className="header-ruby-balance" type="button" onClick={() => setVaultOpen(true)} aria-label="레드 루비 교환소 열기"><span className="ruby-gem small" aria-hidden="true" /><strong>{headerGems ?? '—'}</strong></button><span className="header-login header-identity">{user.nickname || user.username}</span><button className="header-login" type="button" onClick={logout}>{text.logout}</button></> : <button className="header-login" type="button" onClick={() => go('/login')}>{text.login}</button>}</div>
    </header>
    <main>
      {error && <div className="page"><div className="inline-alert"><p className="alert error">{error}</p><button type="button" className="button secondary" onClick={() => void refresh()}>Retry</button></div></div>}
      <Routes>
        <Route path="/" element={guarded(<Home language={language} challenges={featuredChallenges} onExplore={() => go('/challenges')} onCommunity={() => go('/community')} onRanking={() => go('/ranking')} onOpen={(item) => go(`/challenges/${item.id}`)} />)} />
        <Route path="/challenges" element={guarded(<><ChallengesProgress items={challenges} total={challenges.length} /><CategoryProgressChart items={challenges} /><ChallengeSearch value={challengeSearch} onChange={setChallengeSearch} /><ChallengesView key={`${category}-${difficulty}-${challengeSearch}`} items={visibleChallenges} total={challenges.length} category={category} onCategory={setCategory} difficulty={difficulty} onDifficulty={setDifficulty} onOpen={(item) => go(`/challenges/${item.id}`)} /></>)} />
        <Route path="/challenges/:challengeId" element={guarded(<ChallengeDetailRoute loggedIn={Boolean(user)} onSubmitted={() => { void refresh(); void refreshWallet() }} />)} />
        <Route path="/learn" element={<LearnView lang={language} loggedIn={Boolean(user)} />} />
        <Route path="/ranking" element={guarded(<EnhancedRankingView rows={ranking} attendanceRows={attendanceRanking} />)} />
        <Route path="/bookmarks" element={user ? guarded(<BookmarksView />) : <Navigate to="/login" replace />} />
        <Route path="/popular" element={user ? guarded(<PopularChallengesView />) : <Navigate to="/login" replace />} />
        <Route path="/profile" element={guarded(<ProfileView user={user} onChallenges={() => go('/challenges')} onLogin={() => go('/login')} onVault={() => setVaultOpen(true)} onAppearanceChanged={syncAppearance} />)} />
        <Route path="/friends" element={guarded(<FriendsView user={user} onLogin={() => go('/login')} />)} />
        <Route path="/community" element={guarded(<EnhancedCommunityView key={location.search} user={user} onLogin={() => go('/login')} />)} />
        <Route path="/community/:postId" element={guarded(<CommunityPostRoute user={user} />)} />
        <Route path="/learn/:slug" element={<LearnArticleRoute lang={language} />} />
        <Route path="/terms" element={<PolicyView language={language} kind="terms" />} />
        <Route path="/privacy" element={<PolicyView language={language} kind="privacy" />} />
        <Route path="/safe-learning" element={<PolicyView language={language} kind="safe-learning" />} />
        <Route path="/guide" element={<HelpView language={language} kind="guide" />} />
        <Route path="/faq" element={<HelpView language={language} kind="faq" />} />
        <Route path="/admin" element={user?.role === 'ADMIN' ? guarded(<AdminConsole />) : <Navigate to="/" replace />} />
        <Route path="/login" element={<LoginView onBack={() => go('/')} onAuth={completeAuth} language={language} />} />
        <Route path="/auth/callback" element={<CallbackRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    {vaultOpen && user && <CipherVault user={user} onClose={() => setVaultOpen(false)} onAppearanceChanged={syncAppearance} />}
    <PublicProfileDialog />
    <FloatingAssistant open={assistantOpen} onOpenChange={setAssistantOpen} user={user} language={language} path={path} onLogin={() => go('/login')} />
    {assistantFeedbackOpen && <AssistantFeedbackDialog user={user} language={language} onClose={() => setAssistantFeedbackOpen(false)} onLogin={() => go('/login')} />}
    <FloatingQuickMenu language={language} assistantOpen={assistantOpen} onAssistantToggle={() => setAssistantOpen((current) => !current)} onAiMode={() => setAssistantOpen(true)} onFeedback={() => setAssistantFeedbackOpen(true)} onBookmarks={() => go(user ? '/bookmarks' : '/login')} onPopular={() => go(user ? '/popular' : '/login')} />
    <footer className="site-footer">
      <div className="footer-brand"><strong>FlagBox</strong><p>{language === 'ko' ? '보안을 처음 배우는 사람을 위한 쉽고 안전한 워게임 학습 플랫폼' : 'A safe, beginner-friendly wargame learning platform.'}</p></div>
      <div className="footer-links"><div><b>{language === 'ko' ? '서비스' : 'Services'}</b><nav className="footer-service-links" aria-label={language === 'ko' ? '서비스 바로가기' : 'Service shortcuts'}><button type="button" onClick={() => go('/challenges')}>{language === 'ko' ? '워게임' : 'Wargames'}</button><button type="button" onClick={() => go('/learn')}>{language === 'ko' ? '학습' : 'Learn'}</button><button type="button" onClick={() => go('/ranking')}>{language === 'ko' ? '랭킹' : 'Rankings'}</button><button type="button" onClick={() => go('/community')}>{language === 'ko' ? '커뮤니티' : 'Community'}</button><button type="button" onClick={() => user ? setVaultOpen(true) : go('/login')}>{language === 'ko' ? '상점' : 'Shop'}</button></nav></div><div><b>{language === 'ko' ? '도움말' : 'Help'}</b><nav className="footer-policy-links" aria-label={language === 'ko' ? '도움말 바로가기' : 'Help shortcuts'}><a href="/guide">{language === 'ko' ? '이용 안내' : 'Guide'}</a><a href="/faq">{language === 'ko' ? '자주 묻는 질문' : 'FAQ'}</a><button className="footer-text-link" data-no-specular type="button" onClick={() => setAssistantFeedbackOpen(true)}>{language === 'ko' ? '피드백' : 'Feedback'}</button></nav><a href="mailto:flagbox.contact@gmail.com">{language === 'ko' ? '문의하기: flagbox.contact@gmail.com' : 'Contact: flagbox.contact@gmail.com'}</a></div><div><b>{language === 'ko' ? '정책' : 'Policies'}</b><nav className="footer-policy-links" aria-label={language === 'ko' ? '정책 바로가기' : 'Policy shortcuts'}><a href="/terms">{language === 'ko' ? '이용약관' : 'Terms'}</a><a href="/privacy">{language === 'ko' ? '개인정보처리방침' : 'Privacy'}</a><a href="/safe-learning">{language === 'ko' ? '안전한 학습 가이드' : 'Safe learning guide'}</a></nav></div></div>
      <div className="footer-bottom"><span>© 2026 FlagBox. All rights reserved.</span><span>{language === 'ko' ? 'Mini-CTF 프로젝트를 기반으로 운영됩니다.' : 'Built on the Mini-CTF project.'}</span></div>
    </footer>
  </div>
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>{children}</button> }
type PolicyKind = 'terms' | 'privacy' | 'safe-learning'
function PolicyView({ language, kind }: { language: Language; kind: PolicyKind }) {
  const navigate = useNavigate()
  const ko = language === 'ko'
  const copy = {
    terms: ko ? { eyebrow: 'FLAGBOX POLICY', title: '이용약관', intro: 'FlagBox를 안전하고 즐겁게 이용하기 위한 기본 약속입니다.', sections: [['서비스의 목적', 'FlagBox는 보안과 해킹을 처음 배우는 사람을 위한 교육·학습 플랫폼입니다.'], ['계정과 커뮤니티', '계정 정보는 본인이 관리해야 하며, 타인을 사칭하거나 다른 사람의 계정을 이용하면 안 됩니다.'], ['허용되지 않는 행동', '부정한 점수 획득, 서비스 운영 방해, 타인에게 피해를 주는 콘텐츠 작성은 제한될 수 있습니다.'], ['운영 조치', '안전한 학습 환경을 위해 운영자는 문제·게시물·계정을 검토하거나 필요한 조치를 할 수 있습니다.']] } : { eyebrow: 'FLAGBOX POLICY', title: 'Terms of Use', intro: 'The basic promises for using FlagBox safely and enjoyably.', sections: [['Purpose', 'FlagBox is an educational platform for people beginning to learn security and hacking.'], ['Accounts and community', 'Keep your account secure. Do not impersonate others or use another person’s account.'], ['Not allowed', 'Cheating, disrupting the service, and harmful community content may be restricted.'], ['Moderation', 'To maintain a safe learning space, operators may review and take action on challenges, posts, and accounts.']] },
    privacy: ko ? { eyebrow: 'PRIVACY', title: '개인정보처리방침', intro: '필요한 정보만 안전하게 다루기 위한 안내입니다.', sections: [['수집하는 정보', '회원가입 시 아이디·이메일·표시 이름, 프로필 정보와 서비스 이용 기록을 수집할 수 있습니다. OAuth 로그인은 각 제공자가 전달한 식별 정보로 계정을 연결합니다.'], ['이용 목적', '로그인 처리, 학습 기록·랭킹 제공, 계정 복구, 서비스 안정화와 안전한 운영에 사용합니다.'], ['보관과 삭제', '정보는 서비스 제공에 필요한 기간 동안 보관하며, 계정 삭제 요청 또는 운영 정책에 따라 삭제·비식별 처리할 수 있습니다.'], ['문의', '개인정보와 관련한 문의는 flagbox.contact@gmail.com으로 보내 주세요.']] } : { eyebrow: 'PRIVACY', title: 'Privacy Policy', intro: 'How we handle only the information needed to operate FlagBox safely.', sections: [['Information collected', 'We may collect your username, email, display name, profile information, and service activity. OAuth accounts are linked with identifiers provided by each provider.'], ['How it is used', 'We use it for sign-in, learning records and rankings, account recovery, service stability, and safe operations.'], ['Retention and deletion', 'Information is retained while needed to provide the service, then deleted or de-identified based on deletion requests and operating policy.'], ['Contact', 'For privacy questions, email flagbox.contact@gmail.com.']] },
    'safe-learning': ko ? { eyebrow: 'SAFE LEARNING', title: '안전한 학습 가이드', intro: '보안 지식은 허가된 환경에서 책임감 있게 사용해야 합니다.', sections: [['허가된 환경에서만 실습', '배운 기술은 FlagBox 문제, 본인이 소유한 환경, 또는 명확한 허가를 받은 실습 환경에서만 사용하세요.'], ['실제 서비스와 타인은 대상이 아닙니다', '허가 없이 실제 웹사이트·네트워크·다른 사람의 계정이나 기기를 대상으로 시도하면 안 됩니다.'], ['문제를 풀 때', '문제 설명과 가이드를 먼저 읽고, 힌트와 AI 학습 도우미를 활용해 한 단계씩 이해하며 해결해 보세요.'], ['취약점 신고', 'FlagBox에서 예상하지 못한 취약점이나 오류를 발견했다면 악용하지 말고 flagbox.contact@gmail.com으로 알려 주세요.']] } : { eyebrow: 'SAFE LEARNING', title: 'Safe Learning Guide', intro: 'Security knowledge must be used responsibly in authorized environments.', sections: [['Practice only where authorized', 'Use what you learn only in FlagBox challenges, systems you own, or environments where you have clear permission.'], ['Real services and people are not targets', 'Never test real websites, networks, accounts, or devices without authorization.'], ['While solving challenges', 'Read the challenge and guide first, then use hints and the AI learning helper to understand each step.'], ['Report vulnerabilities', 'If you find an unexpected issue in FlagBox, do not exploit it. Report it to flagbox.contact@gmail.com.']] },
  }[kind]
  return <section className="policy-page"><div className="policy-card"><button className="back-link" type="button" onClick={() => navigate(-1)}>← {ko ? '이전 페이지' : 'Back'}</button><div className="info-page-heading"><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="policy-intro">{copy.intro}</p></div><span>{ko ? '안내 문서' : 'Information'}</span></div><InfoPageNav ko={ko} current={kind} /><p className="info-page-updated">{ko ? '최종 업데이트 · 2026. 09. 01.' : 'Last updated · Sep 01, 2026'}</p><div className="policy-sections">{copy.sections.map(([heading, body], index) => <article key={heading}><span className="info-section-number">{String(index + 1).padStart(2, '0')}</span><h2>{heading}</h2><p>{body}</p></article>)}</div></div></section>
}
type HelpKind = 'guide' | 'faq'
function HelpView({ language, kind }: { language: Language; kind: HelpKind }) {
  const navigate = useNavigate()
  const ko = language === 'ko'
  const copy = kind === 'guide'
    ? ko ? { eyebrow: 'GETTING STARTED', title: '이용 안내', intro: 'FlagBox를 처음 이용할 때 알아두면 좋은 순서입니다.', sections: [['1. 계정 만들기', '일반 회원가입 또는 Google, GitHub, Discord 계정으로 로그인할 수 있습니다. 학습 기록과 꾸미기 아이템은 계정에 안전하게 저장됩니다.'], ['2. 첫 문제 고르기', '워게임에서 첫걸음 또는 쉬움 난이도 문제를 선택하세요. 문제 설명과 가이드북을 먼저 읽으면 어떤 개념을 익히는 문제인지 알 수 있습니다.'], ['3. 막히면 도움 받기', '문제의 힌트 크레딧 또는 AI 학습 도우미를 사용해 보세요. 정답 대신 다음에 확인할 개념과 방향을 안내합니다.'], ['4. 기록과 보상 확인', '문제를 풀면 점수와 루비를 얻습니다. 마이 페이지에서 출석, 칭호, 프로필 꾸미기와 학습 기록을 확인할 수 있습니다.']] } : { eyebrow: 'GETTING STARTED', title: 'Guide', intro: 'A simple path for getting started with FlagBox.', sections: [['1. Create an account', 'Sign in with a FlagBox account or Google, GitHub, or Discord. Learning records and cosmetic items are saved to your account.'], ['2. Pick your first challenge', 'Start with a Beginner or Easy wargame. Read the challenge and guidebook first to understand the concept.'], ['3. Get help when stuck', 'Use hint credits or the AI learning helper. They provide a next step and concepts to review instead of a complete answer.'], ['4. Check progress and rewards', 'Solving challenges earns points and rubies. My Page shows attendance, titles, profile items, and learning history.']] }
    : ko ? { eyebrow: 'FAQ', title: '자주 묻는 질문', intro: '처음 이용할 때 많이 궁금해하는 내용을 모았습니다.', sections: [['문제를 어떻게 시작하나요?', '워게임에서 첫걸음 또는 쉬움 문제를 선택한 뒤, 문제 설명과 가이드북을 순서대로 읽어 보세요.'], ['FLAG 형식이 무엇인가요?', '문제에서 찾은 정답 문자열입니다. 보통 FLAG{...} 형태이며, 문제의 제출 입력란에 그대로 넣으면 됩니다.'], ['힌트 크레딧은 어떻게 얻나요?', '상점에서 루비로 교환할 수 있으며, 문제 풀이와 출석으로 얻는 루비를 사용할 수 있습니다.'], ['로그인이나 계정에 문제가 있어요.', '로그인 화면의 아이디·비밀번호 찾기를 이용하거나 flagbox.contact@gmail.com으로 문의해 주세요.']] } : { eyebrow: 'FAQ', title: 'Frequently Asked Questions', intro: 'Answers to common questions from new learners.', sections: [['How do I start a challenge?', 'Choose a Beginner or Easy wargame, then read the challenge description and guidebook in order.'], ['What is a FLAG?', 'It is the answer string found in a challenge, commonly in the format FLAG{...}. Enter it exactly in the submission box.'], ['How do I get hint credits?', 'Exchange earned rubies in the shop. Rubies are gained through challenge solving and attendance.'], ['I have an account or sign-in problem.', 'Use the username/password recovery options on the sign-in page, or contact flagbox.contact@gmail.com.']] }
  return <section className="policy-page"><div className="policy-card"><button className="back-link" type="button" onClick={() => navigate(-1)}>← {ko ? '이전 페이지' : 'Back'}</button><div className="info-page-heading"><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="policy-intro">{copy.intro}</p></div><span>{ko ? '도움말' : 'Help center'}</span></div><InfoPageNav ko={ko} current={kind} /><p className="info-page-updated">{ko ? '최종 업데이트 · 2026. 09. 01.' : 'Last updated · Sep 01, 2026'}</p><div className="policy-sections">{copy.sections.map(([heading, body], index) => <article key={heading}><span className="info-section-number">{String(index + 1).padStart(2, '0')}</span><h2>{heading}</h2><p>{body}</p></article>)}</div></div></section>
}
function InfoPageNav({ ko, current }: { ko: boolean; current: PolicyKind | HelpKind }) {
  const items: Array<[PolicyKind | HelpKind, string, string]> = [['guide', '이용 안내', 'Guide'], ['faq', '자주 묻는 질문', 'FAQ'], ['terms', '이용약관', 'Terms'], ['privacy', '개인정보처리방침', 'Privacy'], ['safe-learning', '안전한 학습 가이드', 'Safe learning']]
  const href: Record<PolicyKind | HelpKind, string> = { guide: '/guide', faq: '/faq', terms: '/terms', privacy: '/privacy', 'safe-learning': '/safe-learning' }
  return <nav className="info-page-nav" aria-label={ko ? '안내 페이지 탐색' : 'Information navigation'}>{items.map(([id, korean, english]) => <a key={id} className={current === id ? 'active' : ''} href={href[id]} aria-current={current === id ? 'page' : undefined}>{ko ? korean : english}</a>)}</nav>
}
function GlobeIcon() { return <svg className="language-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.5 2.35 3.75 5.18 3.75 8.5S14.5 18.15 12 20.5M12 3.5C9.5 5.85 8.25 8.68 8.25 12S9.5 18.15 12 20.5" /></svg> }
function RatingStarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.35 2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.43l-5.9 3.1 1.13-6.58-4.78-4.66 6.6-.96L12 2.35Z" /></svg> }

type AssistantMessage = { role: 'assistant' | 'user'; content: string }
function LegacyFloatingAssistant({ user, language, path, onLogin, initialOpen }: { user: User | null; language: Language; path: string; onLogin: () => void; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const challengeId = /^\/challenges\/(\d+)$/.exec(path)?.[1]
  const ko = language === 'ko'
  const greeting = challengeId
    ? (ko ? '지금 보고 있는 문제를 함께 살펴볼게요. 막힌 부분을 편하게 물어보세요.' : 'Let’s look at this challenge together. Tell me where you are stuck.')
    : (ko ? '안녕하세요, FlagBox 학습 도우미예요. 보안 개념이나 문제 풀이의 다음 단계를 물어보세요.' : 'Hi, I’m the FlagBox learning helper. Ask about security concepts or your next step.')
  useEffect(() => { if (open && messages.length === 0) setMessages([{ role: 'assistant', content: greeting }]) }, [open, greeting, messages.length])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    if (!user) { onLogin(); return }
    setDraft('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: message }])
    try {
      setBusy(true)
      const reply = await api.assistantChat({ message, challengeId: challengeId ? Number(challengeId) : undefined, language, history: messages.slice(-6) })
      setMessages((current) => [...current, { role: 'assistant', content: reply.message }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ko ? 'AI 도우미에 연결하지 못했어요.' : 'Could not reach the AI helper.'))
    } finally { setBusy(false) }
  }
  const shortcuts = ko ? ['개념을 쉽게 설명해줘', '어디부터 봐야 해?', '다음 단계만 알려줘'] : ['Explain the concept simply', 'Where should I start?', 'Give me one next step']
  return <div className={open ? 'assistant-widget open' : 'assistant-widget'} data-no-specular>
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-label={ko ? 'FlagBox AI 도우미' : 'FlagBox AI helper'}>
      <header><div><span className="assistant-status" /><div><strong>{ko ? 'AI 학습 도우미' : 'AI Learning Helper'}</strong><small>{challengeId ? (ko ? '현재 문제를 함께 보는 중' : 'Looking at this challenge') : (ko ? '초보자용 보안 가이드' : 'Beginner-friendly security guide')}</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label={ko ? 'AI 도우미 닫기' : 'Close AI helper'}>×</button></header>
      <div className="assistant-messages" ref={listRef}>{messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.content}</span></article>)}{busy && <article className="assistant-message assistant"><span className="assistant-typing"><i /><i /><i /></span></article>}</div>
      {!user ? <button className="assistant-login" type="button" onClick={onLogin}>{ko ? '로그인하고 AI 도우미 사용하기' : 'Sign in to use the AI helper'}</button> : <><div className="assistant-shortcuts">{shortcuts.map((shortcut) => <button type="button" key={shortcut} onClick={() => setDraft(shortcut)}>{shortcut}</button>)}</div><form onSubmit={(event) => void send(event)}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder={ko ? '질문을 입력하세요' : 'Ask a question'} /><button type="submit" disabled={busy || !draft.trim()}>{ko ? '보내기' : 'Send'}</button></form></>}
      <p className="assistant-note">{ko ? '정답 FLAG나 완성 풀이 대신, 이해를 돕는 다음 단계만 안내해요.' : 'It gives learning guidance, not FLAGS or complete solutions.'}</p>{error && <p className="assistant-error">{error}</p>}
    </section>}
    <button className="assistant-fab" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={ko ? 'AI 학습 도우미 열기' : 'Open AI learning helper'}><span className="assistant-fab-spark" aria-hidden="true">{open ? '×' : '✦'}</span><span className="assistant-fab-tooltip" aria-hidden="true">{ko ? 'AI 도움' : 'AI Help'}</span></button>
  </div>
}

void LegacyFloatingAssistant

function FloatingAssistant({ user, language, path, onLogin, open, onOpenChange }: { user: User | null; language: Language; path: string; onLogin: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [feedbackNotice, setFeedbackNotice] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const challengeId = /^\/challenges\/(\d+)$/.exec(path)?.[1]
  const ko = language === 'ko'
  const greeting = challengeId
    ? (ko ? '현재 문제를 함께 살펴볼게요. 막힌 부분을 편하게 알려 주세요.' : 'Let’s look at this challenge together. Tell me where you are stuck.')
    : (ko ? '안녕하세요. FlagBox AI 학습 도우미예요. 보안 개념이나 다음 학습 단계를 물어보세요.' : 'Hi, I’m the FlagBox learning helper. Ask about security concepts or your next step.')
  useEffect(() => { if (open && messages.length === 0) setMessages([{ role: 'assistant', content: greeting }]) }, [open, greeting, messages.length])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    if (!user) { onLogin(); return }
    setDraft('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: message }])
    try {
      setBusy(true)
      const reply = await api.assistantChat({ message, challengeId: challengeId ? Number(challengeId) : undefined, language, history: messages.slice(-6) })
      setMessages((current) => [...current, { role: 'assistant', content: reply.message }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ko ? 'AI 도우미에 연결하지 못했어요.' : 'Could not reach the AI helper.'))
    } finally { setBusy(false) }
  }
  const shortcuts = ko ? ['개념을 쉽게 설명해줘', '어디부터 봐야 해?', '다음 단계만 알려줘'] : ['Explain the concept simply', 'Where should I start?', 'Give me one next step']
  const scrollShortcutsHorizontally = (event: WheelEvent<HTMLDivElement>) => {
    const shortcutsElement = event.currentTarget
    if (shortcutsElement.scrollWidth <= shortcutsElement.clientWidth) return
    event.preventDefault()
    shortcutsElement.scrollLeft += event.deltaY || event.deltaX
  }
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!busy && draft.trim()) event.currentTarget.form?.requestSubmit()
  }
  const sendFeedback = async (rating: number) => {
    if (!user) { onLogin(); return }
    const comment = window.prompt(ko ? '도우미를 더 좋게 만들 의견이 있으면 적어 주세요. (선택)' : 'Tell us how to improve the helper. (Optional)')
    try {
      await api.submitAssistantFeedback({ rating, comment: comment?.trim() || undefined })
      setFeedbackNotice(ko ? '피드백을 보내 주셔서 고마워요.' : 'Thanks for your feedback.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ko ? '피드백을 보내지 못했어요.' : 'Could not send feedback.'))
    }
  }
  void sendFeedback
  if (!open) return null
  return <section className="ai-chat" role="dialog" aria-modal="false" aria-label={ko ? 'FlagBox AI 도우미' : 'FlagBox AI helper'} data-no-specular>
    <header className="ai-chat-header"><div className="ai-chat-title"><span className="ai-chat-mark" aria-hidden="true">✦</span><div><strong>{ko ? 'AI 학습 도우미' : 'AI Learning Helper'}</strong><small>{challengeId ? (ko ? '현재 문제를 함께 보는 중' : 'Looking at this challenge') : (ko ? '초보자용 보안 가이드' : 'Beginner-friendly security guide')}</small></div></div><button className="ai-chat-close" type="button" onClick={() => onOpenChange(false)} aria-label={ko ? 'AI 도우미 닫기' : 'Close AI helper'}>×</button></header>
    <div className="ai-chat-messages" ref={listRef}>{messages.map((message, index) => <article className={`ai-chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.content}</span></article>)}{busy && <article className="ai-chat-message assistant"><span>{ko ? '답변을 준비하고 있어요…' : 'Preparing a reply…'}</span></article>}</div>
    {!user ? <button className="button primary" type="button" onClick={onLogin}>{ko ? '로그인하고 AI 도우미 사용하기' : 'Sign in to use the AI helper'}</button> : <><div className="assistant-shortcuts" onWheel={scrollShortcutsHorizontally}>{shortcuts.map((shortcut) => <button type="button" key={shortcut} onClick={() => setDraft(shortcut)}>{shortcut}</button>)}</div><form className="ai-chat-input" onSubmit={(event) => void send(event)}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} maxLength={1200} placeholder={ko ? '질문을 입력하세요 (Enter 전송 · Shift+Enter 줄바꿈)' : 'Ask a question (Enter to send · Shift+Enter for a new line)'} /><button type="submit" disabled={busy || !draft.trim()} aria-label={ko ? '보내기' : 'Send'}>↑</button></form></>}
    <p className="assistant-note">{ko ? '정답 FLAG나 완성 풀이 대신, 이해를 돕는 다음 단계만 안내해요.' : 'It gives learning guidance, not FLAGS or complete solutions.'}</p>{feedbackNotice && <p className="assistant-feedback-notice">{feedbackNotice}</p>}{error && <p className="assistant-error">{error}</p>}
  </section>
}

function AssistantFeedbackDialog({ user, language, onClose, onLogin }: { user: User | null; language: Language; onClose: () => void; onLogin: () => void }) {
  const ko = language === 'ko'
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) { onLogin(); return }
    if (!rating) { setError(ko ? '별점을 선택해 주세요.' : 'Please choose a rating.'); return }
    if (!comment.trim()) { setError(ko ? '의견을 한 줄 이상 입력해 주세요.' : 'Please enter a short comment.'); return }
    try {
      setBusy(true); setError('')
      await api.submitAssistantFeedback({ rating, comment: comment.trim() })
      setNotice(ko ? '피드백을 보내 주셔서 고마워요.' : 'Thanks for your feedback.')
      setComment('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ko ? '피드백을 보내지 못했어요.' : 'Could not send feedback.'))
    } finally { setBusy(false) }
  }
  const visibleRating = hoverRating ?? rating ?? 0
  const ratingText = !rating && !hoverRating ? (ko ? '별점을 클릭해 주세요' : 'Click a star to rate') : (ko ? ['아쉬워요', '조금 아쉬워요', '보통이에요', '만족해요', '매우 만족해요'][visibleRating - 1] : ['Very poor', 'Needs improvement', 'Okay', 'Good', 'Excellent'][visibleRating - 1])
  return <section className="assistant-feedback-dialog" role="dialog" aria-modal="false" aria-label={ko ? 'FlagBox 피드백' : 'FlagBox feedback'} data-no-specular>
    <header className="ai-chat-header"><div className="ai-chat-title"><span className="ai-chat-mark" aria-hidden="true">✎</span><div><strong>{ko ? 'FlagBox 피드백' : 'FlagBox feedback'}</strong><small>{ko ? 'AI 학습 도우미를 더 좋게 만들 의견을 들려주세요.' : 'Help us improve the AI learning helper.'}</small></div></div><button className="ai-chat-close" type="button" onClick={onClose} aria-label={ko ? '피드백 닫기' : 'Close feedback'}>×</button></header>
    <form className="assistant-feedback-form" onSubmit={(event) => void submit(event)}><fieldset className="assistant-rating-field"><legend>{ko ? '별점' : 'Rating'}</legend><div className="assistant-rating-line"><div className="assistant-rating" onMouseLeave={() => setHoverRating(null)}>{[1, 2, 3, 4, 5].map((value) => <label key={value} className={value <= visibleRating ? 'selected' : ''} onMouseEnter={() => setHoverRating(value)} onClick={(event) => { if (rating === value) { event.preventDefault(); setRating(null); setHoverRating(null) } }} aria-label={`${value} stars`}><input type="radio" name="assistant-rating" value={value} checked={rating === value} onChange={() => { setRating(value); setError('') }} /><RatingStarIcon /></label>)}</div><strong className="assistant-rating-score">{visibleRating.toFixed(1)}</strong></div><div className="assistant-rating-status"><p className={rating || hoverRating ? 'assistant-rating-caption selected' : 'assistant-rating-caption'}>{ratingText}</p>{rating && <button className="assistant-rating-reset" type="button" onClick={() => { setRating(null); setHoverRating(null); setError('') }}>{ko ? '별점 취소' : 'Clear rating'}</button>}</div></fieldset><label>{ko ? '의견' : 'Comment'}<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder={ko ? '좋았던 점이나 불편했던 점을 자유롭게 적어 주세요.' : 'Tell us what worked well or what felt inconvenient.'} /></label><button className="button primary" type="submit" disabled={busy}>{busy ? (ko ? '보내는 중…' : 'Sending…') : (ko ? '피드백 보내기' : 'Send feedback')}</button></form>
    {notice && <p className="assistant-feedback-notice">{notice}</p>}{error && <p className="assistant-error">{error}</p>}
  </section>
}

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span className="loading-mark" aria-hidden="true" /><p>{label}</p></div>
}

function FlagBoxIntro({ onSkip }: { onSkip: () => void }) {
  return <div className="flagbox-intro flagbox-stroke-intro" role="status" aria-label="FlagBox is loading.">
    <Beams className="flagbox-stroke-intro__beams" beamWidth={2} beamHeight={42} beamNumber={18} rotation={90} />
    <button type="button" className="flagbox-intro-skip" onClick={onSkip}>Skip</button>
    <StrokeText text="FlagBox" className="flagbox-stroke-intro__wordmark" fontSize={230} letterSpacing={-19} strokeColor="#f8fafc" fillColor="#f8fafc" strokeWidth={1.7} drawDuration={2.2} fillDelay={0.4} fillDuration={0.45} />
    <p className="flagbox-stroke-intro__copy">LEARN · ANALYZE · CAPTURE</p>
  </div>
}


function LearnView({ lang, loggedIn }: { lang: 'ko' | 'en'; loggedIn: boolean }) {
  const routerNavigate = useNavigate()
  const [field, setField] = useState<'ALL' | 'WEB' | 'FORENSIC' | 'REVERSING'>('ALL')
  const list = learnArticles.filter((article) => field === 'ALL' || article.field === field)
  return (
    <div className="page">
      <LearningSnapshot lang={lang} loggedIn={loggedIn} />
      <PageIntro eyebrow="LEARN" title={lang === 'ko' ? '개념부터 차근차근' : 'Concepts first.'} description={lang === 'ko' ? '문제를 풀기 전에 읽으면 이해가 달라져요. 각 글은 5~9분이면 읽혀요.' : 'Read before you solve — each article is a 5–9 minute read.'} />
      <div className="filter-tabs" aria-label="학습 분야">
        {LEARN_FIELDS.map((item) => (
          <button key={item.key} type="button" className={field === item.key ? 'filter-tab active' : 'filter-tab'} onClick={() => setField(item.key)}>
            {lang === 'ko' ? (item.key === 'ALL' ? '전체' : item.label) : item.key === 'ALL' ? 'All' : item.key}
          </button>
        ))}
      </div>
      <div className="learn-list">
        {list.map((article) => (
          <button key={article.slug} type="button" className="learn-card" onClick={() => routerNavigate(`/learn/${article.slug}`)}>
            <span className={`badge ${article.field.toLowerCase()}`}>{lang === 'ko' ? ({ WEB: '웹', FORENSIC: '포렌식', REVERSING: '리버싱' } as Record<string, string>)[article.field] ?? article.field : article.field}</span>
            <strong>{lang === 'ko' ? article.title : learnEn[article.slug]?.title ?? article.title}</strong>
            <small>{lang === 'ko' ? article.summary : learnEn[article.slug]?.summary ?? article.summary}</small>
            <span className="learn-minutes">⏱ {article.minutes}{lang === 'ko' ? '분 소요' : ' min read'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function LearningSnapshot({ lang, loggedIn }: { lang: 'ko' | 'en'; loggedIn: boolean }) {
  const [overview, setOverview] = useState<LearningOverview | null>(null)
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState(3)
  const [error, setError] = useState('')
  const ko = lang === 'ko'
  const routerNavigate = useNavigate()
  const refresh = useCallback(async () => {
    try {
      const next = await api.learningOverview()
      setOverview(next)
      setTarget(next.weeklyTarget)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your learning progress.')
    }
  }, [])
  useEffect(() => { if (loggedIn) void refresh() }, [loggedIn, refresh])
  const saveGoal = async () => {
    try {
      setError('')
      const next = await api.updateLearningGoal(target)
      setOverview(next)
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the weekly goal.')
    }
  }
  if (!loggedIn) return <section className="learning-snapshot learning-snapshot-guest"><div className="learning-snapshot-main"><span className="vault-kicker">MY LEARNING</span><h2>{ko ? '내 학습 기록을 시작해 보세요.' : 'Start your learning record.'}</h2><p>{ko ? '로그인하면 주간 목표, 풀이 기록, 업적을 한곳에서 확인할 수 있어요.' : 'Sign in to track weekly goals, solves, and achievements in one place.'}</p></div><button type="button" className="button primary" onClick={() => routerNavigate('/login')}>{ko ? '로그인하기' : 'Sign in'}</button></section>
  if (!overview && !error) return <div className="learning-snapshot loading"><span className="loading-mark" />{ko ? '학습 기록을 불러오는 중…' : 'Loading your learning progress…'}</div>
  if (error) return <p className="learning-snapshot-error">{error}</p>
  if (!overview) return null
  const progress = Math.min(100, Math.round((overview.weeklySolved / overview.weeklyTarget) * 100))
  return <section className="learning-snapshot" aria-label={ko ? '내 학습 현황' : 'My learning progress'}>
    <div className="learning-snapshot-main"><span className="vault-kicker">MY LEARNING</span><h2>{ko ? '이번 주 학습 목표' : 'This week’s goal'}</h2><p>{ko ? `${overview.weeklySolved}문제 해결 · 전체 ${overview.totalSolved}문제 완료` : `${overview.weeklySolved} solved this week · ${overview.totalSolved} total solved`}</p><div className="learning-progress"><span style={{ width: `${progress}%` }} /></div></div>
    <div className="learning-goal-control">{editing ? <><input aria-label="Weekly solve target" type="number" min="1" max="20" value={target} onChange={(event) => setTarget(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /><button type="button" className="button secondary" onClick={() => void saveGoal()}>{ko ? '저장' : 'Save'}</button></> : <><strong>{overview.weeklySolved}/{overview.weeklyTarget}</strong><button type="button" className="text-link" onClick={() => setEditing(true)}>{ko ? '목표 변경' : 'Edit goal'}</button></>}</div>
    <div className="learning-snapshot-meta"><span>{ko ? `북마크 ${overview.bookmarkedCount}개` : `${overview.bookmarkedCount} bookmarks`}</span>{overview.achievements.map((achievement) => <span key={achievement.code} title={achievement.description}>✦ {achievement.name}</span>)}</div>
  </section>
}

function BookmarksView() {
  const routerNavigate = useNavigate()
  const [items, setItems] = useState<LearningBookmark[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setItems(await api.learningBookmarks())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load bookmarks.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const remove = async (challengeId: number) => {
    try {
      await api.removeLearningBookmark(challengeId)
      setItems((current) => current.filter((item) => item.challengeId !== challengeId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the bookmark.')
    }
  }
  return <div className="page bookmarks-page"><PageIntro eyebrow="BOOKMARKS" title="저장한 문제" description="나중에 다시 풀고 싶은 문제를 한곳에서 확인하세요." />{loading ? <LoadingState label="북마크를 불러오는 중…" /> : error ? <p className="alert error">{error}</p> : items.length === 0 ? <section className="bookmark-empty"><BookmarkOutlineIcon /><h2>저장한 문제가 없어요.</h2><p>문제 상세의 북마크 아이콘을 누르면 여기에 모입니다.</p><button type="button" className="button primary" onClick={() => routerNavigate('/challenges')}>문제 둘러보기</button></section> : <div className="bookmark-list">{items.map((item) => <article className="bookmark-card" key={item.challengeId}><BookmarkOutlineIcon filled /><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyLabel(item.difficulty)}</Badge></div><h2>{item.title}</h2><p>{item.score} points {item.solved ? '· Solved' : ''}</p></div><div className="bookmark-actions"><button type="button" className="button secondary" onClick={() => routerNavigate(`/challenges/${item.challengeId}`)}>열기</button><button type="button" className="text-link" onClick={() => void remove(item.challengeId)}>해제</button></div></article>)}</div>}</div>
}

function BookmarkOutlineIcon({ filled = false }: { filled?: boolean }) {
  return <svg className={`bookmark-ribbon-icon ${filled ? 'is-filled' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z" /></svg>
}

function ChallengeHeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg className={`challenge-heart-icon ${filled ? 'is-filled' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2 3.8 12.6a5.4 5.4 0 0 1 7.6-7.7L12 5.5l.6-.6a5.4 5.4 0 0 1 7.6 7.7z" /></svg>
}

function PopularChallengesView() {
  const [items, setItems] = useState<PopularChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const routerNavigate = useNavigate()
  const ko = document.documentElement.lang !== 'en'
  useEffect(() => {
    let active = true
    api.popularChallenges().then((next) => { if (active) setItems(next) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load popular challenges.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return <div className="page bookmarks-page"><PageIntro eyebrow="POPULAR" title={ko ? '많은 학습자가 좋아한 문제' : 'Popular challenges'} description={ko ? '하트 3개 이상을 받은 문제만 모았습니다.' : 'Only challenges with at least three hearts appear here.'} />{loading ? <LoadingState label={ko ? '인기 문제를 불러오는 중…' : 'Loading popular challenges…'} /> : error ? <p className="alert error">{error}</p> : items.length === 0 ? <section className="bookmark-empty"><ChallengeHeartIcon /><h2>{ko ? '아직 인기 문제가 없어요.' : 'No popular challenges yet.'}</h2><p>{ko ? '문제에 하트가 3개 이상 모이면 여기에 나타납니다.' : 'A challenge appears here after receiving three hearts.'}</p><button type="button" className="button primary" onClick={() => routerNavigate('/challenges')}>{ko ? '문제 둘러보기' : 'Browse challenges'}</button></section> : <div className="bookmark-list">{items.map((item) => <article className="bookmark-card" key={item.challengeId}><ChallengeHeartIcon filled /><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyLabel(item.difficulty)}</Badge></div><h2>{item.title}</h2><p>{item.score} pts · ♥ {item.likeCount}{item.solved ? (ko ? ' · 해결 완료' : ' · Solved') : ''}</p></div><div className="bookmark-actions"><button type="button" className="button secondary" onClick={() => routerNavigate(`/challenges/${item.challengeId}`)}>{ko ? '열기' : 'Open'}</button></div></article>)}</div>}</div>
}

function LearnArticleRoute({ lang }: { lang: 'ko' | 'en' }) {
  const { slug } = useParams()
  const routerNavigate = useNavigate()
  const article = slug ? articleBySlug(slug) : undefined
  if (!article) return <Navigate to="/learn" replace />
  return (
    <div className="page article-page">
      <button className="back-link" type="button" onClick={() => routerNavigate('/learn')}>
        ← Back to learn
      </button>
      <article className="learn-article">
        <p className="eyebrow">{article.field} · {article.minutes}{lang === 'ko' ? '분' : ' min read'}</p>
        <h1>{lang === 'ko' ? article.title : learnEn[article.slug]?.title ?? article.title}</h1>
        <p className="learn-summary">{lang === 'ko' ? article.summary : learnEn[article.slug]?.summary ?? article.summary}</p>{lang === 'en' && <p className="learn-notice">Article bodies are currently provided in Korean.</p>}
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>
        ))}
        <section className="learn-check">
          <h2>✅ Quick self-check</h2>
          <ul>{(lang === 'ko' ? article.check : learnEn[article.slug]?.check ?? article.check).map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
        <div className="learn-cta">
          <p>Concepts ready? Time to solve!</p>
          <button type="button" className="button primary" onClick={() => routerNavigate('/challenges')}>
            Go to wargames
          </button>
        </div>
      </article>
    </div>
  )
}

function Home({ language, challenges, onExplore, onCommunity, onRanking, onOpen }: { language: Language; challenges: ChallengeSummary[]; onExplore: () => void; onCommunity: () => void; onRanking: () => void; onOpen: (item: ChallengeSummary) => void }) {
  const banners = [
    { label: 'START FROM ZERO', title: '처음 배우는 보안도\nFlagBox와 함께.', description: '복잡한 이론보다 쉬운 문제부터. 직접 풀며 기초를 익혀 보세요.', action: '첫 문제 풀어보기', onClick: onExplore },
    { label: 'DAILY PRACTICE', title: '하루 한 문제로\n가볍게 시작해요.', description: '짧은 도전이 모여 실력이 됩니다. 오늘의 학습 기록을 남겨 보세요.', action: '워게임 둘러보기', onClick: onExplore },
    { label: 'ASK AND GROW', title: '혼자 고민하지 말고\n함께 배워요.', description: '커뮤니티에서 질문하고, 다른 학습자의 풀이 경험도 만나 보세요.', action: '커뮤니티 둘러보기', onClick: onCommunity },
    { label: 'BEGINNER WARGAME', title: '보안은, 직접 풀어보면\n더 쉬워집니다.', description: '처음부터 차근차근. 부담 없이 시작하는 FlagBox 워게임입니다.', action: '첫 문제 풀어보기', onClick: onExplore },
    { label: 'LEARN AT YOUR PACE', title: '막혀도 괜찮아요.\n힌트가 함께해요.', description: '문제를 읽고, 단서를 찾고, 필요한 순간에는 힌트를 사용해 보세요.', action: '워게임 둘러보기', onClick: onExplore },
    { label: 'KEEP THE MOMENTUM', title: '오늘의 작은 풀이가\n내일의 실력이 돼요.', description: '매일의 도전과 학습 기록을 FlagBox에서 이어가 보세요.', action: '랭킹 둘러보기', onClick: onRanking },
  ]
  const englishBanners = [
    { label: 'START FROM ZERO', title: 'New to security?\nStart with FlagBox.', description: 'Skip the jargon. Build the fundamentals by solving safe, approachable problems.', action: 'Solve your first challenge', onClick: onExplore },
    { label: 'DAILY PRACTICE', title: 'One challenge a day.\nA great place to start.', description: 'Small and safe practice sessions add up. Keep track of today’s learning.', action: 'Browse wargames', onClick: onExplore },
    { label: 'ASK AND GROW', title: 'Do not get stuck alone.\nLearn together.', description: 'Ask questions in the community and learn from other learners’ experiences.', action: 'Visit community', onClick: onCommunity },
    { label: 'BEGINNER WARGAME', title: 'Security gets easier\nwhen you solve it.', description: 'Take it one step at a time. FlagBox wargames are made for a safe first start.', action: 'Solve your first challenge', onClick: onExplore },
    { label: 'LEARN AT YOUR PACE', title: 'Take your time.\nHints are here.', description: 'Read the prompt, find your bearings, and use a hint whenever you need one.', action: 'Browse wargames', onClick: onExplore },
    { label: 'KEEP THE MOMENTUM', title: 'Small challenges today.\nStronger skills tomorrow.', description: 'Keep your attendance and learning record going in FlagBox.', action: 'Explore rankings', onClick: onRanking },
  ]
  const localizedBanners = language === 'en' ? englishBanners : banners
  const [activeBanner, setActiveBanner] = useState(0)
  const bannerContentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setInterval(() => setActiveBanner((current) => (current + 1) % localizedBanners.length), 5000)
    return () => window.clearInterval(timer)
  }, [activeBanner, localizedBanners.length])
  useEffect(() => {
    bannerContentRef.current?.animate(
      [{ opacity: 0, transform: 'translateX(56px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: 620, easing: 'cubic-bezier(.2, .78, .24, 1)', fill: 'both' },
    )
  }, [activeBanner])
  const banner = localizedBanners[activeBanner]
  const moveBanner = (direction: -1 | 1) => setActiveBanner((current) => (current + direction + localizedBanners.length) % localizedBanners.length)
  return <div className="page home-page"><section className="hero-section hero-banner" aria-roledescription="carousel" aria-label="FlagBox banner"><button className="hero-banner-arrow previous" type="button" aria-label="Previous banner" onClick={() => moveBanner(-1)} /><div className="hero-banner-content banner-slide" ref={bannerContentRef}><p className="eyebrow">{banner.label}</p><h1>{banner.title.split('\n').map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1><p>{banner.description}</p><button className="button primary" type="button" onClick={banner.onClick}>{banner.action}</button></div><span className="hero-banner-wordmark" aria-hidden="true">FlagBox</span><button className="hero-banner-arrow next" type="button" aria-label="Next banner" onClick={() => moveBanner(1)} /><div className="hero-banner-dots" role="tablist" aria-label="Banner selection">{localizedBanners.map((item, index) => <button key={item.label} className={index === activeBanner ? 'active' : ''} type="button" role="tab" aria-selected={index === activeBanner} aria-label={`Banner ${index + 1}`} onClick={() => setActiveBanner(index)} />)}</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>{language === 'en' ? 'Challenges to try now' : '지금 도전할 문제'}</h2></div><button type="button" className="text-link" onClick={onExplore}>{language === 'en' ? 'View all wargames' : '워게임 전체 보기'}</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
  /*
  return <div className="page home-page"><section className="hero-section hero-banner" aria-roledescription="carousel" aria-label="FlagBox 안내 배너"><div className="hero-banner-content"><p className="eyebrow">{banner.label}</p><h1>{banner.title.split('\n').map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1><p>{banner.description}</p><button className="button primary" type="button" onClick={banner.onClick}>{banner.action}</button></div><div className="hero-banner-dots" role="tablist" aria-label="배너 선택">{banners.map((item, index) => <button key={lang === 'ko' ? (item.key === 'ALL' ? '전체' : item.label) : item.key === 'ALL' ? 'All' : item.key} className={index === activeBanner ? 'active' : ''} type="button" role="tab" aria-selected={index === activeBanner} aria-label={`${index + 1}번 배너`} onClick={() => setActiveBanner(index)} />)}</div></section><section className="stat-strip" aria-label="플랫폼 현황"><Stat value={stats.challenges} label="워게임 문제" detail="천천히 도전해 보세요" /><Stat value={stats.solves} label="문제 해결" detail="함께 쌓은 기록" /><Stat value={stats.users} label="학습 중인 사람" detail="FlagBox 동료" /><div className="live-badge">함께 배우는 중</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>지금 도전할 문제</h2></div><button type="button" className="text-link" onClick={onExplore}>워게임 전체 보기</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
  /*
  return <div className="page home-page"><section className="hero-section"><div className="hero-copy"><p className="eyebrow">SECURITY LEARNING, MADE FRIENDLY</p><h1>처음이어도 괜찮아요.<br /><span>한 문제씩 풀어봐요.</span></h1><p className="hero-description">FlagBox는 보안을 처음 배우는 사람을 위한 쉽고 안전한 워게임 학습 공간입니다.</p><div className="hero-actions"><button className="button primary" type="button" onClick={onExplore}>첫 문제 풀어보기</button><button className="button ghost" type="button" onClick={onRanking}>랭킹 둘러보기</button></div></div><button className="hero-visual hero-vault-trigger" type="button" onClick={onVault} aria-label="FlagBox 로고"><ThemeLogo className="hero-hero-logo" alt="FlagBox 로고" /></button></section><section className="stat-strip" aria-label="플랫폼 현황"><Stat value={stats.challenges} label="워게임 문제" detail="천천히 도전해 보세요" /><Stat value={stats.solves} label="문제 해결" detail="함께 쌓은 기록" /><Stat value={stats.users} label="학습 중인 사람" detail="FlagBox 동료" /><div className="live-badge">함께 배우는 중</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>지금 도전할 문제</h2></div><button type="button" className="text-link" onClick={onExplore}>워게임 전체 보기</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
  */
}

function VaultOpening() {
  return <div className="vault-opening" role="status" aria-label="Opening hidden operation"><div className="vault-opening-scan" /><div className="vault-rings" aria-hidden="true"><i /><i /><i /></div><div className="vault-opening-mark">◆</div><p>SEQUENCE ACCEPTED</p><strong>ACCESS GRANTED</strong><small>OPENING HIDDEN OPERATION</small></div>
}

function HiddenOperation({ user, language, onClose }: { user: User; language: Language; onClose: () => void }) {
  const [summary, setSummary] = useState<HiddenSummary | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.discoverHiddenVault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the hidden operation.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  const claim = async (id: string) => {
    try { setBusy(id); setError(''); setSummary(await api.claimHiddenMission(id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hidden mission failed.') } finally { setBusy(null) }
  }
  const ko = language === 'ko'
  const completedCount = summary?.missions.filter((mission) => mission.completed).length ?? 0
  return <div className="hidden-operation-backdrop" role="dialog" aria-modal="true" aria-label={ko ? '히든 미션' : 'Hidden operation'}><section className="hidden-operation"><header><div><p className="eyebrow">{ko ? '비공개 작전 // 05' : 'UNLISTED CHANNEL // 05'}</p><h2>{ko ? '숨겨진 신호를 찾았어요.' : 'Signal recovered.'}</h2><p>{ko ? '로고는 입구였어요. 아래 미션 3개를 모두 완료하면 전용 프로필 보상을 받을 수 있어요.' : 'The logo was the entrance. Complete all three missions to claim the exclusive profile rewards.'}</p></div><button className="vault-close" type="button" onClick={onClose} aria-label={ko ? '닫기' : 'Close hidden operation'}>×</button></header>{!summary ? <LoadingState label={ko ? '숨겨진 신호를 해독하는 중...' : 'Decrypting the recovered signal...'} /> : <><div className="hidden-operation-status"><span className="ruby-gem" aria-hidden="true" /><div><strong>{summary.rewarded ? (ko ? '작전 완료' : 'Operation complete') : (ko ? `${completedCount}/3 미션 완료` : `${completedCount}/3 missions complete`)}</strong><small>{summary.rewarded ? (ko ? '전용 테두리, 장식, 칭호가 내 꾸미기에 추가됐어요.' : 'The exclusive frame, accent, and title are now in your loadout.') : user.role === 'ADMIN' ? (ko ? '관리자 계정은 모든 보상을 바로 사용할 수 있어요.' : 'Administrator access: all rewards available.') : (ko ? '세 가지 조각을 모아 전용 보상을 해제하세요.' : 'Collect all three fragments to unlock the reward set.')}</small></div></div><section className="hidden-section"><div className="hidden-section-heading"><h3>{ko ? '미션' : 'Missions'}</h3><small>{ko ? '완료 조건을 확인하고 보상을 받으세요.' : 'Check each requirement and claim its fragment.'}</small></div><div className="hidden-mission-list">{summary.missions.map((mission, index) => { const text = hiddenMissionText(mission.id, mission.name, mission.description, ko); return <article className={`hidden-mission ${mission.completed ? 'complete' : ''}`} key={mission.id}><span className="hidden-mission-number">0{index + 1}</span><div><span className="vault-kicker">{ko ? '비밀 미션' : 'CLASSIFIED TASK'}</span><h3>{text.name}</h3><p>{text.description}</p></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void claim(mission.id)}>{mission.completed ? (ko ? '완료' : 'Complete') : mission.eligible ? (ko ? '조각 받기' : 'Claim fragment') : (ko ? '조건 미달' : 'Locked')}</button></article> })}</div></section><section className="hidden-section hidden-rewards"><div className="hidden-section-heading"><h3>{ko ? '완료 보상' : 'Completion rewards'}</h3><small>{ko ? '미션을 모두 완료하면 3개 보상을 한 번에 획득해요.' : 'Finish every mission to unlock all three rewards.'}</small></div><div className="hidden-reward-grid">{summary.rewards.map((reward) => { const text = hiddenRewardText(reward.id, reward.name, ko); return <div className={`hidden-reward ${reward.owned ? 'owned' : ''}`} key={reward.id}><span>{reward.type === 'FRAME' ? '▣' : reward.type === 'TITLE' ? '✦' : '◇'}</span><div><strong>{text.name}</strong><small>{reward.type === 'TITLE' ? (ko ? '칭호 보상' : 'TITLE REWARD') : reward.type === 'FRAME' ? (ko ? '프로필 테두리' : 'PROFILE FRAME') : (ko ? '프로필 장식' : 'PROFILE ACCENT')}</small></div><em>{reward.owned ? (ko ? '획득 완료' : 'Unlocked') : (ko ? '미션 완료 후 해제' : 'Unlock after all missions')}</em></div> })}</div></section>{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function hiddenMissionText(id: string, name: string, description: string, ko: boolean) {
  if (!ko) return { name, description }
  const copy: Record<string, { name: string; description: string }> = {
    hidden_signal: { name: '숨겨진 신호 발견', description: '로고를 통해 이 비밀 작전을 처음 열어 보세요.' },
    hidden_pulse: { name: '신호에 맞추기', description: '오늘 출석 체크를 완료하세요.' },
    hidden_breaker: { name: '암호 해독', description: '플랫폼의 워게임 문제를 하나 이상 해결하세요.' },
  }
  return copy[id] ?? { name, description }
}

function hiddenRewardText(id: string, name: string, ko: boolean) {
  if (!ko) return { name }
  const copy: Record<string, string> = { crimson_lock_frame: '크림슨 락', ruby_signal: '루비 시그널', zero_day_title: '제로데이 탐험가' }
  return { name: copy[id] ?? name }
}

function LegacyCipherVault({ user, onClose }: { user: User; onClose: () => void }) {
  const [summary, setSummary] = useState<VaultSummary | null>(null)
  const [tab, setTab] = useState<'missions' | 'shop' | 'craft' | 'collection'>('shop')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.discoverVault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open Cipher Vault.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  const run = async (key: string, action: () => Promise<VaultSummary>) => {
    try { setBusy(key); setError(''); setSummary(await action()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vault action failed.') } finally { setBusy(null) }
  }
  const visible = (item: VaultCosmetic) => !item.hidden || item.owned || user.role === 'ADMIN'
  const cosmetics = summary?.cosmetics.filter(visible) ?? []
  const shop = cosmetics.filter((item) => item.source === 'STORE')
  const craft = cosmetics.filter((item) => item.source === 'CRAFT')
  const collection = cosmetics.filter((item) => item.owned)
  return <div className="vault-backdrop" role="dialog" aria-modal="true" aria-label="Cipher Vault"><section className="cipher-vault"><header className="vault-header"><div><p className="eyebrow">CLASSIFIED COLLECTION // VAULT-05</p><h2>Cipher Vault</h2><p>Complete daily operations. Collect fragments. Wear the proof.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="Close Cipher Vault">×</button></header>{!summary ? <LoadingState label="Decrypting your vault..." /> : <><div className="vault-wallet"><div><span>◈</span><strong>{summary.gems}</strong><small>Cipher Gems</small></div><div><span>◇</span><strong>{summary.fragments}</strong><small>Vault Fragments</small></div><div className="vault-admin-status">{user.role === 'ADMIN' ? 'ADMIN ACCESS: ALL COSMETICS UNLOCKED' : 'Daily rewards reset at midnight (KST)'}</div></div><nav className="vault-tabs" aria-label="Cipher Vault sections">{([['missions', 'Today'], ['shop', 'Shop'], ['craft', 'Forge'], ['collection', 'Collection']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} type="button" onClick={() => setTab(id)}>{label}</button>)}</nav>{tab === 'missions' && <div className="vault-grid mission-grid">{summary.missions.map((mission) => <article className={`vault-card mission-card ${mission.completed ? 'complete' : ''}`} key={mission.id}><div className="vault-card-icon">{mission.completed ? '✓' : '◌'}</div><div><span className="vault-kicker">DAILY MISSION</span><h3>{mission.name}</h3><p>{mission.description}</p><div className="vault-reward">◈ {mission.gemReward}{mission.fragmentReward > 0 && <> <b>+</b> ◇ {mission.fragmentReward}</>}</div></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void run(mission.id, () => api.claimVaultMission(mission.id))}>{mission.completed ? 'Claimed' : mission.eligible ? 'Claim reward' : 'In progress'}</button></article>)}</div>}{tab === 'shop' && <VaultItems items={shop} gems={summary.gems} busy={busy} action={(item) => run(item.id, () => api.buyVaultItem(item.id))} actionLabel="Buy" />}{tab === 'craft' && <VaultItems items={craft} fragments={summary.fragments} busy={busy} action={(item) => run(item.id, () => api.craftVaultItem(item.id))} actionLabel="Craft" />}{tab === 'collection' && <VaultItems items={collection} busy={busy} action={(item) => run(item.id, () => api.equipVaultItem(item.id))} actionLabel="Equip" />}{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function CipherVault({ user, onClose, onAppearanceChanged }: { user: User; onClose: () => void; onAppearanceChanged: () => Promise<void> }) {
  const [summary, setSummary] = useState<VaultSummary | null>(null)
  const [tab, setTab] = useState<'exchange' | 'shop' | 'missions'>('exchange')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<VaultCosmetic | null>(null)
  const equippedKey = summary?.cosmetics.filter((item) => item.equipped).map((item) => item.id).sort().join('|') ?? ''
  const previousEquippedKey = useRef<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.vault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open Cipher Vault.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  useEffect(() => {
    if (previousEquippedKey.current !== null && previousEquippedKey.current !== equippedKey) void onAppearanceChanged()
    previousEquippedKey.current = equippedKey
  }, [equippedKey, onAppearanceChanged])
  const run = async (key: string, action: () => Promise<VaultSummary>, appearanceChanged = false) => {
    try { setBusy(key); setError(''); setSummary(await action()); if (appearanceChanged) await onAppearanceChanged() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vault action failed.') } finally { setBusy(null) }
  }
  const items = summary?.cosmetics.filter((item) => !item.hidden || item.owned || user.role === 'ADMIN') ?? []
  const exchangeItems = items.filter((item) => item.source === 'STORE')
  const shop = exchangeItems.filter((item) => item.type === 'CREDIT' || summary?.dailyShopIds?.includes(item.id))
  const preview = previewItem ?? (tab === 'exchange' ? exchangeItems[0] : shop[0]) ?? null
  return <div className="vault-backdrop" role="dialog" aria-modal="true" aria-label="레드 루비 교환소"><section className="cipher-vault vault-redesign"><header className="vault-header"><div><p className="eyebrow">CIPHER VAULT</p><h2>레드 루비 교환소</h2><p>학습으로 얻은 루비로 프로필을 나답게 꾸며 보세요.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="상점 닫기">×</button></header>{!summary ? <LoadingState label="보관함을 불러오는 중..." /> : <><div className="vault-wallet vault-wallet-redesigned"><div className="ruby-wallet"><span className="ruby-gem" aria-hidden="true" /><strong>{summary.gems}</strong><small>보유 루비</small></div><div className="vault-balance"><strong>{summary.hintCredits}</strong><small>힌트 크레딧</small></div><p className="vault-admin-status">{user.role === 'ADMIN' ? '관리자 계정은 모든 아이템을 자유롭게 사용할 수 있어요.' : '출석과 미션을 완료하면 루비를 얻을 수 있어요.'}</p></div><nav className="vault-tabs" aria-label="레드 루비 교환소 메뉴"><button className={tab === 'exchange' ? 'active' : ''} type="button" onClick={() => setTab('exchange')}>교환소</button><button className={tab === 'shop' ? 'active' : ''} type="button" onClick={() => setTab('shop')}>오늘의 상점</button><button className={tab === 'missions' ? 'active' : ''} type="button" onClick={() => setTab('missions')}>오늘의 미션</button></nav>{(tab === 'exchange' || tab === 'shop') && <><div className="vault-shop-heading"><div><span className="vault-kicker">TODAY'S SHOP</span><h3>{tab === 'exchange' ? '교환소' : '오늘의 상점'}</h3><p>{tab === 'exchange' ? '보유 루비로 원하는 꾸미기 아이템을 교환하세요.' : '매일 자정에 새로운 6개의 꾸미기 아이템이 바뀝니다.'}</p></div><span>{tab === 'exchange' ? '전체 상품' : '매일 00:00 갱신'}</span></div><div className="vault-shop-layout"><div className="vault-grid item-grid vault-shop-grid">{(tab === 'exchange' ? exchangeItems : shop).map((item) => <article className={`vault-card item-card vault-shop-card ${item.equipped ? 'equipped' : ''}`} key={item.id} onMouseEnter={() => setPreviewItem(item)} onFocus={() => setPreviewItem(item)}><span className="vault-kicker">{item.type === 'FRAME' ? '프로필 테두리' : item.type === 'ACCESSORY' ? '프로필 장식' : item.type === 'TITLE' ? '칭호' : '힌트 크레딧'}</span><div className="vault-item-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◇' : item.type === 'TITLE' ? '✦' : '+'}</div><h3>{item.name}</h3><p>{item.description}</p><VaultItemHoverPreview user={user} item={item} equipped={summary.cosmetics.filter((cosmetic) => cosmetic.equipped)} /><div className="item-footer"><span className="ruby-price"><span className="ruby-gem small" aria-hidden="true" />{item.gemCost}</span><button className="button primary" type="button" disabled={(!item.consumable && item.owned) || busy === item.id || (user.role !== 'ADMIN' && summary.gems < item.gemCost)} onClick={() => void run(item.id, () => api.buyVaultItem(item.id))}>{item.consumable ? '크레딧 추가' : item.owned ? '보유 중' : '교환하기'}</button></div></article>)}</div><VaultCosmeticPreview user={user} item={preview} equipped={summary.cosmetics.filter((item) => item.equipped)} /></div></>}{tab === 'missions' && <div className="vault-grid mission-grid">{summary.missions.map((mission) => <article className={`vault-card mission-card ${mission.completed ? 'complete' : ''}`} key={mission.id}><div className="vault-card-icon">{mission.completed ? '✓' : '◌'}</div><div><span className="vault-kicker">오늘의 미션</span><h3>{mission.name}</h3><p>{mission.description}</p></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void run(mission.id, () => api.claimVaultMission(mission.id))}>{mission.completed ? '완료' : mission.eligible ? '보상 받기' : '진행 중'}</button></article>)}</div>}{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function VaultItemHoverPreview({ user, item, equipped }: { user: User; item: VaultCosmetic; equipped: VaultCosmetic[] }) {
  const selected = (type: VaultCosmetic['type']) => item.type === type ? item.id : equipped.find((cosmetic) => cosmetic.type === type)?.id
  const frame = selected('FRAME')
  const title = selected('TITLE')
  const accessory = selected('ACCESSORY')
  if (item.type === 'CREDIT') return <div className="vault-hover-preview vault-hover-credit" aria-hidden="true"><span className="vault-preview-tag">구매 효과</span><strong>힌트 크레딧</strong><span>막힌 문제에서 힌트를 열 수 있어요.</span></div>
  return <div className="vault-hover-preview" aria-hidden="true"><span className="vault-preview-tag">착용 미리보기</span><span className={`vault-preview-avatar ${frame ? `equipped-${frame}` : ''}`}>{(user.nickname || user.username).slice(0, 2).toUpperCase()}</span><strong>{user.nickname || user.username}{accessory && <i className="profile-accessory">◈</i>}</strong>{title && <span className={`profile-title vault-profile-title ${titleTone(title)}`}>{cosmeticLabel(title)}</span>}<small>내 프로필에 적용된 모습</small></div>
}

function VaultCosmeticPreview({ user, item, equipped }: { user: User; item: VaultCosmetic | null; equipped: VaultCosmetic[] }) {
  const selected = (type: VaultCosmetic['type']) => item?.type === type ? item.id : equipped.find((cosmetic) => cosmetic.type === type)?.id
  const frame = selected('FRAME')
  const accessory = selected('ACCESSORY')
  const title = selected('TITLE')
  const isCredit = item?.type === 'CREDIT'
  return <aside className="vault-cosmetic-preview" aria-live="polite"><p className="eyebrow">{isCredit ? '구매 효과' : '착용 미리보기'}</p>{isCredit ? <div className="vault-credit-preview"><strong>힌트 크레딧</strong><span>문제 풀이 중 막혔을 때 힌트를 열 수 있어요.</span></div> : <><div className={`vault-preview-avatar ${frame ? `equipped-${frame}` : ''}`}>{(user.nickname || user.username).slice(0, 2).toUpperCase()}</div><div className="vault-preview-identity"><strong>{user.nickname || user.username}{accessory && <i className="profile-accessory">◈</i>}</strong>{title && <span className={`profile-title vault-profile-title ${titleTone(title)}`}>{cosmeticLabel(title)}</span>}<small>@{user.username}</small></div><p>상품 위에 커서를 올리면 실제 프로필에 적용될 모습을 확인할 수 있어요.</p></>}</aside>
}

function VaultItems({ items, gems = 0, fragments = 0, busy, action, actionLabel }: { items: VaultCosmetic[]; gems?: number; fragments?: number; busy: string | null; action: (item: VaultCosmetic) => Promise<void>; actionLabel: string }) {
  if (items.length === 0) return <div className="vault-empty"><span>◇</span><h3>Nothing here yet.</h3><p>Complete missions to fill this collection.</p></div>
  return <div className="vault-grid item-grid">{items.map((item) => { const canAfford = item.source === 'STORE' ? gems >= item.gemCost : item.source === 'CRAFT' ? fragments >= item.fragmentCost : true; const disabled = item.owned && actionLabel !== 'Equip' || !canAfford || busy === item.id; const hasArt = ['blue_terminal_frame', 'violet_circuit_frame', 'signal_orbit', 'vault_key', 'neon_cipher_frame', 'spectral_core'].includes(item.id); return <article className={`vault-card item-card ${hasArt ? 'has-art' : ''} ${item.hidden ? 'hidden-item' : ''} ${item.equipped ? 'equipped' : ''}`} key={item.id}>{hasArt ? <div className={`item-art art-${item.id}`} style={{ backgroundImage: `url(${cipherVaultRelics})` }} aria-hidden="true" /> : <div className="item-emblem">{item.type === 'FRAME' ? '▣' : item.type === 'TITLE' ? '✦' : '◈'}</div>}<span className="vault-kicker">{item.hidden ? 'CLASSIFIED' : item.source}</span><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span>{item.source === 'STORE' ? `◈ ${item.gemCost}` : item.source === 'CRAFT' ? `◇ ${item.fragmentCost}` : item.type === 'TITLE' ? 'Quest reward' : 'Secret unlock'}</span><button className="button secondary" type="button" disabled={disabled} onClick={() => void action(item)}>{item.equipped ? 'Equipped' : item.owned && actionLabel !== 'Equip' ? 'Owned' : actionLabel}</button></div></article> })}</div>
}

function Stat({ value, label, detail }: { value: number; label: string; detail: string }) { return <div className="stat"><strong>{value}</strong><div><span>{label}</span><small>{detail}</small></div></div> }
function cosmeticLabel(id: string) { return id.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') }
function difficultyLabel(difficulty: string) {
  const ko = document.documentElement.lang !== 'en'
  const labels = ko
    ? { BEGINNER: '첫걸음', EASY: '쉬움', NORMAL: '보통', ADVANCED: '어려움', EXPERT: '도전' }
    : { BEGINNER: 'Beginner', EASY: 'Easy', NORMAL: 'Normal', ADVANCED: 'Advanced', EXPERT: 'Expert' }
  return (labels as Record<string, string>)[difficulty] ?? difficulty
}
function titleTone(id: string) { return ['beginner', 'rookie', 'junior', 'senior', 'veteran', 'master', 'root'].includes(id.toLowerCase()) ? `tier-title-${id.toLowerCase()}` : '' }
function ChallengeRow({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(item)}><span className={`category-mark ${item.category.toLowerCase()}`} /><span className="row-main"><strong>{item.title}</strong><small>{item.category} · {item.difficulty}</small></span><span className="row-meta"><b>{item.score} pts</b>{item.solved && <span className="solved">SOLVED</span>}</span></button> }

function ChallengesProgress({ items, total }: { items: ChallengeSummary[]; total: number }) {
  const solved = items.filter((item) => item.solved).length
  const percent = items.length === 0 ? 0 : Math.round((solved / items.length) * 100)
  return <section className="challenge-progress-overview"><div><span className="vault-kicker">YOUR PROGRESS</span><h2>문제 풀이 현황</h2><p>현재 선택한 분야와 난이도 기준이에요.</p></div><div className="challenge-progress-stats"><strong>{solved}<small> / {items.length} solved</small></strong><span>{percent}%</span></div><div className="challenge-progress-track" aria-label={`${solved} of ${items.length} challenges solved`}><i style={{ width: `${percent}%` }} /></div><small className="challenge-progress-total">전체 {total}문제 중 현재 조건 {items.length}문제</small></section>
}

function ChallengeSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ko = document.documentElement.lang !== 'en'
  return <label className="challenge-search"><span>{ko ? '문제 제목 검색' : 'Search challenge titles'}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={ko ? '문제 제목을 입력하세요' : 'Type a challenge title'} autoComplete="off" /></label>
}

function CategoryProgressChart({ items }: { items: ChallengeSummary[] }) {
  const [open, setOpen] = useState(false)
  const ko = document.documentElement.lang !== 'en'
  const fields = (['WEB', 'FORENSIC', 'REVERSING'] as const).map((category) => {
    const fieldItems = items.filter((item) => item.category === category)
    const solved = fieldItems.filter((item) => item.solved).length
    const percent = fieldItems.length === 0 ? 0 : Math.round((solved / fieldItems.length) * 100)
    return { category, solved, total: fieldItems.length, percent }
  })
  return <section className="category-progress-panel"><div><span className="vault-kicker">FIELD PROGRESS</span><h2>{ko ? '분야별 성취도' : 'Progress by field'}</h2><p>{ko ? '웹, 포렌식, 리버싱 문제 풀이율을 한눈에 확인하세요.' : 'Review your solve rate for web, forensic, and reversing.'}</p></div><button type="button" className="button secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? (ko ? '그래프 닫기' : 'Close chart') : (ko ? '그래프로 보기' : 'View chart')}</button>{open && <div className="category-progress-chart">{fields.map((field) => <div key={field.category} className="category-progress-row"><div><strong>{field.category}</strong><span>{field.solved} / {field.total} · {field.percent}%</span></div><div className="category-progress-bar"><i style={{ width: `${field.percent}%` }} /></div></div>)}</div>}</section>
}

function ChallengesView({ items, total, category, onCategory, difficulty, onDifficulty, onOpen }: { items: ChallengeSummary[]; total: number; category: Filter; onCategory: (value: Filter) => void; difficulty: DifficultyFilter; onDifficulty: (value: DifficultyFilter) => void; onOpen: (item: ChallengeSummary) => void }) {
  const pageSize = 24
  const [page, setPage] = useState(1)
  const popular = false
  const onPopular = (_value: boolean) => undefined
  const matchingItems = items
  const pageCount = Math.max(1, Math.ceil(matchingItems.length / pageSize))
  const visibleItems = matchingItems.slice((page - 1) * pageSize, page * pageSize)
  const ko = document.documentElement.lang !== 'en'
  return <div className="page"><PageIntro eyebrow="WARGAME" title={ko ? '다음 문제를 골라보세요.' : 'Pick your next challenge.'} description={ko ? '문제를 읽고, 단서를 따라 한 단계씩 풀어보세요.' : 'Read the brief, then follow the guide one step at a time.'} /><section className="challenge-toolbar"><div className="filter-tabs" aria-label={ko ? '문제 정렬' : 'Challenge sorting'}><button className={popular ? 'filter-tab' : 'filter-tab active'} type="button" onClick={() => onPopular(false)}>{ko ? '전체 문제' : 'All challenges'}</button><button className={popular ? 'filter-tab active popular-filter' : 'filter-tab popular-filter'} type="button" onClick={() => onPopular(true)}>★ {ko ? '인기 문제' : 'Popular'}</button></div><div className="filter-tabs" aria-label={ko ? '카테고리' : 'Category'}>{(['ALL', 'WEB', 'FORENSIC', 'REVERSING'] as Filter[]).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item === 'ALL' ? (ko ? '전체 분야' : 'All fields') : item}</button>)}</div><div className="filter-tabs difficulty-tabs" aria-label={ko ? '난이도' : 'Difficulty'}>{(['ALL', 'BEGINNER', 'EASY', 'NORMAL', 'ADVANCED', 'EXPERT'] as DifficultyFilter[]).map((item) => <button key={item} className={difficulty === item ? 'filter-tab active diff-' + item.toLowerCase() : 'filter-tab diff-' + item.toLowerCase()} type="button" onClick={() => onDifficulty(item)}>{item === 'ALL' ? (ko ? '전체 난이도' : 'All levels') : difficultyLabel(item)}</button>)}</div></section><div className="challenge-count"><span>{ko ? `전체 ${total}개 중 조건에 맞는 ${items.length}개 문제` : `${items.length} matching challenges of ${total}`}</span><strong>{page} / {pageCount}</strong></div><div className="challenge-grid">{visibleItems.map((item) => <ChallengeCard key={item.id} item={item} onOpen={onOpen} />)}</div><nav className="challenge-pagination" aria-label={ko ? '문제 페이지 선택' : 'Challenge pages'}>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={page === pageNumber ? 'page-number active' : 'page-number'} type="button" aria-current={page === pageNumber ? 'page' : undefined} aria-label={ko ? `${pageNumber}페이지` : `Page ${pageNumber}`} onClick={() => { setPage(pageNumber); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{pageNumber}</button>)}</nav>{items.length === 0 && <EmptyState />}</div>
}

function ChallengeCard({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { const ko = document.documentElement.lang !== 'en'; return <article className="challenge-card"><div className="card-top"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyLabel(item.difficulty)}</Badge></div><h3>{item.title}</h3><p>{ko ? '문제 설명을 읽고 단서를 따라 FLAG를 찾아보세요.' : 'Read each brief and hunt for clues step by step. Submit the FLAG when you find it.'}</p><div className="card-bottom"><strong>{item.score}<small>pts</small></strong><span className="challenge-solve-count">★ {item.solveCount} {ko ? '명 해결' : 'solves'}</span>{item.solved && <span className="solved">{ko ? '해결 완료' : 'Solved'}</span>}<button className="card-open" type="button" onClick={() => onOpen(item)}>{item.solved ? (ko ? '다시 보기' : 'Review') : (ko ? '열기' : 'Open')}</button></div></article> }

function LegacyChallengeDetailView({ item, loggedIn, onBack, onLogin, onSubmitted }: { item: ChallengeDetail; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!loggedIn) return
    void api.challengeActivity(item.id, 'OPENED').catch(() => undefined)
    const visibility = () => void api.challengeActivity(item.id, document.hidden ? 'FOCUS_LOST' : 'FOCUS_RESTORED').catch(() => undefined)
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [item.id, loggedIn])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { const result = await api.submitFlag(item.id, flag); setMessage(result.result === 'correct' ? `Correct flag — ${result.awardedScore} points awarded.` : result.result === 'already_solved' ? 'You have already solved this challenge.' : result.result); setFlag(''); onSubmitted() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Submission failed.') }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyLabel(item.difficulty)}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p></section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function ChallengeDetailView({ challengeId, loggedIn, onBack, onLogin, onSubmitted }: { challengeId: string; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const id = Number(challengeId)
  const [item, setItem] = useState<ChallengeDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [flag, setFlag] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  const [awarded, setAwarded] = useState<number | null>(null)
  const [awardedGems, setAwardedGems] = useState<number | null>(null)
  const [hintCredits, setHintCredits] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkBusy, setBookmarkBusy] = useState(false)
  useEffect(() => {
    let active = true
    api.challenge(id).then((next) => { if (active) setItem(next) }).catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Could not load this challenge.') })
    return () => { active = false }
  }, [id])
  useEffect(() => {
    if (!loggedIn || !Number.isFinite(id)) return
    void api.challengeActivity(id, 'OPENED').catch(() => undefined)
  }, [id, loggedIn])
  useEffect(() => {
    if (!loggedIn || !Number.isFinite(id)) return
    let active = true
    api.learningBookmarks()
      .then((items: LearningBookmark[]) => { if (active) setBookmarked(items.some((bookmark) => bookmark.challengeId === id)) })
      .catch(() => undefined)
    return () => { active = false }
  }, [id, loggedIn])
  useEffect(() => {
    if (!loggedIn || !item?.hintAvailable) return
    let active = true
    api.vault().then((summary) => { if (active) setHintCredits(summary.hintCredits) }).catch(() => undefined)
    return () => { active = false }
  }, [loggedIn, item?.hintAvailable])
  useEffect(() => {
    if (!loggedIn || !item) return
    const target = document.querySelector('.detail-page .detail-score')
    if (!(target instanceof HTMLElement)) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'challenge-bookmark'
    button.disabled = bookmarkBusy
    button.setAttribute('aria-pressed', String(bookmarked))
    button.setAttribute('aria-label', bookmarked ? '북마크 해제' : '북마크 저장')
    button.title = bookmarked ? '북마크 해제' : '북마크 저장'
    button.innerHTML = '<svg class="bookmark-ribbon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z" /></svg>'
    const click = async () => {
      try {
        setBookmarkBusy(true)
        if (bookmarked) await api.removeLearningBookmark(item.id)
        else await api.addLearningBookmark(item.id)
        setBookmarked((current) => !current)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not update the bookmark.')
      } finally {
        setBookmarkBusy(false)
      }
    }
    button.addEventListener('click', click)
    target.append(button)
    return () => { button.removeEventListener('click', click); button.remove() }
  }, [bookmarkBusy, bookmarked, item, loggedIn])
  useEffect(() => {
    if (!loggedIn || !item) return
    const target = document.querySelector('.detail-page .detail-score')
    if (!(target instanceof HTMLElement)) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'challenge-heart'
    button.setAttribute('aria-pressed', String(item.liked))
    button.setAttribute('aria-label', item.liked ? '좋아요 취소' : '문제 좋아요')
    button.title = item.liked ? '좋아요 취소' : '문제 좋아요'
    button.innerHTML = '<svg class="challenge-heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2 3.8 12.6a5.4 5.4 0 0 1 7.6-7.7L12 5.5l.6-.6a5.4 5.4 0 0 1 7.6 7.7z" /></svg><small>♥ ' + item.likeCount + '</small>'
    const click = async () => {
      try {
        button.disabled = true
        if (item.liked) await api.removeChallengeLike(item.id)
        else await api.addChallengeLike(item.id)
        setItem((current) => current ? { ...current, liked: !current.liked, likeCount: current.likeCount + (current.liked ? -1 : 1) } : current)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not update the challenge heart.')
      } finally {
        button.disabled = false
      }
    }
    button.addEventListener('click', click)
    target.append(button)
    return () => { button.removeEventListener('click', click); button.remove() }
  }, [item, loggedIn])
  if (loadError) return <div className="page"><p className="alert error">{loadError}</p><button type="button" className="button secondary" onClick={onBack}>← Back to challenges</button></div>
  if (!item) return <div className="page"><LoadingState label="Opening challenge..." /></div>
  const guide = guideForChallenge(item.title, item.category, item.difficulty)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setAwarded(null)
    setAwardedGems(null)
    try { const result = await api.submitFlag(item.id, flag.trim()); if (result.result === 'correct') { setMessage('Correct!'); setAwarded(result.awardedScore); setAwardedGems(result.awardedGems) } else if (result.result === 'already_solved') { setMessage('You have already solved this challenge.') } else { setMessage(result.result) } setFlag(''); onSubmitted() } catch (cause) { const reason = cause instanceof Error ? cause.message : ''; setError(/rate|limit|too many/i.test(reason) ? 'Too many attempts. Please wait a moment and try again.' : /connect|network|failed/i.test(reason) ? reason || 'Submission failed.' : 'Not the correct flag. Double-check the format and try again.') }
  }
  const revealHint = async () => {
    try { setHintBusy(true); setError(''); const result = await api.challengeHint(item.id); setHint(result.hint); setHintCredits(result.remainingCredits) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reveal the hint.') } finally { setHintBusy(false) }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyLabel(item.difficulty)}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p>{guide && <div className="guide-panel"><button type="button" className="guide-toggle" aria-expanded={guideOpen} onClick={() => setGuideOpen((open) => !open)}>📚 Study guide — concept · tools · steps {guideOpen ? 'Collapse ▲' : 'Expand ▼'}</button>{guideOpen && <><div className="guide-block"><strong>The concept</strong><p>{guide.concept}</p></div><div className="guide-block"><strong>Tools you need</strong><ul>{guide.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul></div><div className="guide-block"><strong>Step-by-step approach</strong><ol>{guide.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div></>}</div>}{loggedIn && item.hintAvailable && <div className="hint-panel"><div><strong>Need a nudge?</strong><small>Reveal a hint for {item.hintCost} credit{item.hintCost === 1 ? '' : 's'}.</small>{hintCredits !== null && (hintCredits < item.hintCost ? <small>Not enough hint credits.</small> : <small> · {hintCredits} <span>credits</span></small>)}</div><button type="button" className="button secondary" disabled={hintBusy || hint !== null || (hintCredits !== null && hintCredits < item.hintCost)} onClick={() => void revealHint()}>{hint ? 'Hint revealed' : 'Reveal hint'}</button>{hint && <p>{hint}</p>}</div>}</section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}{awarded !== null && <> +{awarded} <span>points</span>{awardedGems !== null && <> · <span className="earned-rubies"><span className="ruby-gem small" aria-hidden="true" />+{awardedGems} 루비</span></>}</>}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function ChallengeDetailRoute({ loggedIn, onSubmitted }: { loggedIn: boolean; onSubmitted: () => void }) {
  const { challengeId } = useParams()
  const routerNavigate = useNavigate()
  if (!challengeId || !Number.isFinite(Number(challengeId))) return <Navigate to="/challenges" replace />
  return <ChallengeDetailView key={challengeId} challengeId={challengeId} loggedIn={loggedIn} onBack={() => routerNavigate('/challenges')} onLogin={() => routerNavigate('/login')} onSubmitted={onSubmitted} />
}

function CallbackRoute() {
  const routerNavigate = useNavigate()
  const location = useLocation()
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  useEffect(() => {
    if (token) {
      setAuthToken(token)
      void api.me()
          .then(() => window.location.replace('/'))
          .catch(() => {
            clearAuthToken()
            routerNavigate('/login?oauthError=oauth_token_validation_failed', { replace: true })
          })
      return
    }
    const query = new URLSearchParams(location.search)
    if (!query.has('oauthError')) query.set('oauthError', 'oauth_callback_failed')
    routerNavigate(`/login?${query.toString()}`, { replace: true })
  }, [location.search, routerNavigate, token])
  return null
}

function LegacyRankingView({ rows, attendanceRows }: { rows: RankingRow[]; attendanceRows: AttendanceRankingRow[] }) {
  const [section, setSection] = useState<'score' | 'attendance'>('score')
  return <div className="page"><PageIntro eyebrow="GLOBAL RANKING" title="Earn your place." description={section === 'score' ? 'Live scores and solve counts from the API.' : 'Daily check-ins, streaks, and long-term consistency.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>Score ranking</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>Attendance ranking</button></div>{section === 'score' ? <section className="panel ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>SOLVED</span><span>SCORE</span></div>{rows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.solvedCount}</span><b>{row.score}</b></div>)}{rows.length === 0 && <EmptyState />}</section> : <section className="panel ranking-panel attendance-ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>DAYS</span><span>STREAK</span></div>{attendanceRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.totalDays}</span><b>{row.currentStreak} days</b></div>)}{attendanceRows.length === 0 && <EmptyState />}</section>}</div>
}

function EnhancedRankingView({ rows, attendanceRows }: { rows: RankingRow[]; attendanceRows: AttendanceRankingRow[] }) {
  const [section, setSection] = useState<'score' | 'attendance'>('score')
  const visibleRows = section === 'score' ? rows : attendanceRows
  const tierGuide = [
    ['beginner', '0점 이상'], ['rookie', '300점 이상'], ['junior', '1,000점 이상'],
    ['senior', '2,500점 이상'], ['veteran', '4,000점 이상'], ['master', '7,000점 이상'], ['root', '15,000점 이상'],
  ] as const
  return <div className="page ranking-page"><PageIntro eyebrow="RANKING" title="함께 쌓아가는 기록" description={section === 'score' ? '문제를 해결하며 쌓은 점수와 기록이에요.' : '매일 학습을 이어온 꾸준한 기록이에요.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>점수 랭킹</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>출석 랭킹</button></div><div className="ranking-content-layout"><section className="panel ranking-panel"><div className="ranking-head"><span>순위</span><span>학습자</span><span>{section === 'score' ? '해결' : '누적'}</span><span>{section === 'score' ? '점수' : '연속'}</span></div>{visibleRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><RankIdentity row={row} /><span>{section === 'score' ? (row as RankingRow).solvedCount : `${(row as AttendanceRankingRow).totalDays}일`}</span><b>{section === 'score' ? (row as RankingRow).score : `${(row as AttendanceRankingRow).currentStreak}일`}</b></div>)}{visibleRows.length === 0 && <EmptyState />}</section><aside className="tier-guide"><span className="vault-kicker">TIER GUIDE</span><h2>티어 기준</h2><p>점수가 오르면 다음 티어로 자동 승급해요.</p><div>{tierGuide.map(([tier, threshold]) => <span key={tier}><TierEmblem tier={tier} /><small>{threshold}</small></span>)}</div></aside></div></div>
}

function RankIdentity({ row }: { row: Pick<RankingRow, 'username' | 'nickname' | 'avatarUrl' | 'equippedFrame' | 'equippedAccessory' | 'equippedTitle' | 'tier'> }) {
  const name = row.nickname || row.username
  return <button className="operator public-profile-trigger" type="button" onClick={() => openPublicProfile(row.username)} aria-label={`${name} profile`}><span className={`mini-avatar ranking-avatar ${row.equippedFrame ? `equipped-${row.equippedFrame}` : ''}`}>{row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : name.slice(0, 2).toUpperCase()}</span><span className="ranking-identity"><strong>{name}{row.equippedAccessory && <i className="profile-accessory" aria-label={cosmeticLabel(row.equippedAccessory)}>◈</i>}</strong><TierEmblem tier={row.tier} />{row.equippedTitle && <small className={row.equippedTitle.toLowerCase() === 'super_user' ? 'ranking-title super-user-title' : `ranking-title ${titleTone(row.equippedTitle)}`}>{cosmeticLabel(row.equippedTitle)}</small>}</span></button>
}

function TierEmblem({ tier }: { tier: string }) {
  const label = tierLabel(tier).toUpperCase()
  return <span className={`tier-emblem tier-emblem-${tier}`} data-i18n-skip aria-label={`${label} tier`}>{label}</span>
}
function tierLabel(tier: string) { return ({ beginner: 'Beginner', rookie: 'Rookie', junior: 'Junior', senior: 'Senior', veteran: 'Veteran', master: 'Master', root: 'Root' } as Record<string, string>)[tier] ?? 'Beginner' }

function PublicProfileDialog() {
  const [username, setUsername] = useState<string | null>(null)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')
  const [loadedUsername, setLoadedUsername] = useState<string | null>(username)
  if (username !== loadedUsername) {
    setLoadedUsername(username)
    setProfile(null)
    setError('')
  }
  useEffect(() => {
    const open = (event: Event) => setUsername((event as CustomEvent<string>).detail)
    window.addEventListener(publicProfileEvent, open)
    return () => window.removeEventListener(publicProfileEvent, open)
  }, [])
  useEffect(() => {
    const openCommunityAuthor = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-profile-username]') : null
      if (!target) return
      const reference = target.getAttribute('data-profile-username')
      if (!reference) return
      event.preventDefault(); event.stopPropagation()
      setUsername(reference)
    }
    window.addEventListener('click', openCommunityAuthor, true)
    return () => window.removeEventListener('click', openCommunityAuthor, true)
  }, [])
  useEffect(() => {
    if (!username) return
    void api.publicProfile(username).then(setProfile).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load this profile.'))
  }, [username])
  if (!username) return null
  const name = profile?.nickname || username
  return <div className="public-profile-backdrop" role="dialog" aria-modal="true" aria-label="Public profile" onMouseDown={() => setUsername(null)}><section className="public-profile-card" onMouseDown={(event) => event.stopPropagation()}><button className="vault-close" type="button" onClick={() => setUsername(null)} aria-label="Close profile">×</button>{!profile && !error && <LoadingState label="Loading profile..." />}{error && <p className="alert error">{error}</p>}{profile && <><div className={`public-profile-hero ${profile.equippedFrame ? `equipped-${profile.equippedFrame}` : ''} ${profile.equippedTitle?.toLowerCase() === 'super_user' ? 'super-user-profile' : ''}`}><span className="profile-avatar avatar-large">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : name.slice(0, 2).toUpperCase()}</span><div><p className="eyebrow">PUBLIC PROFILE</p><h2>{name}{profile.equippedAccessory && <i className="profile-accessory">◈</i>}<TierEmblem tier={profile.tier} /></h2>{profile.equippedTitle && <p className="profile-title vault-profile-title">{cosmeticLabel(profile.equippedTitle)}</p>}<p className="muted">@{profile.username}</p></div></div><p className="public-profile-status">{profile.statusMessage || 'No status message yet.'}</p><div className="public-profile-stats"><span><b>{profile.score}</b> Score</span><span><b>{profile.solvedCount}</b> Solves</span></div><section className="public-profile-friends"><h3>Friends <span>{profile.friends.length}</span></h3>{profile.friends.length === 0 ? <p className="muted">No public friends yet.</p> : <div>{profile.friends.map((friend) => <button type="button" key={friend.username} onClick={() => openPublicProfile(friend.username)}><span className={`mini-avatar ${friend.equippedFrame ? `equipped-${friend.equippedFrame}` : ''}`}>{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}{friend.equippedAccessory && <i className="profile-accessory">◈</i>}</strong>{friend.equippedTitle && <small className="ranking-title">{cosmeticLabel(friend.equippedTitle)}</small>}</span></button>)}</div>}</section></>}</section></div>
}

function RankingView({ rows, attendanceRows }: { rows: RankingRow[]; attendanceRows: AttendanceRankingRow[] }) {
  const [section, setSection] = useState<'score' | 'attendance'>('score')
  return <div className="page"><PageIntro eyebrow="RANKING" title="함께 쌓아가는 기록" description={section === 'score' ? '문제를 해결하며 쌓은 점수와 기록이에요.' : '매일 학습을 이어온 꾸준한 기록이에요.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>점수 랭킹</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>출석 랭킹</button></div>{section === 'score' ? <section className="panel ranking-panel"><div className="ranking-head"><span>순위</span><span>학습자</span><span>해결</span><span>점수</span></div>{rows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className={`mini-avatar ${row.equippedFrame ? `equipped-${row.equippedFrame}` : ''}`}>{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span><strong>{row.nickname || row.username}</strong>{row.equippedTitle && <small className="ranking-title">{cosmeticLabel(row.equippedTitle)}</small>}</span></div><span>{row.solvedCount}</span><b>{row.score}</b></div>)}{rows.length === 0 && <EmptyState />}</section> : <section className="panel ranking-panel attendance-ranking-panel"><div className="ranking-head"><span>순위</span><span>학습자</span><span>누적</span><span>연속</span></div>{attendanceRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.totalDays}일</span><b>{row.currentStreak}일</b></div>)}{attendanceRows.length === 0 && <EmptyState />}</section>}</div>
}

void LegacyCipherVault
void LegacyChallengeDetailView
void LegacyRankingView
void RankingView
void VaultOpening
void HiddenOperation
void hiddenMissionText
void hiddenRewardText

function ProfileView({ user, onChallenges, onLogin, onVault, onAppearanceChanged }: { user: User | null; onChallenges: () => void; onLogin: () => void; onVault: () => void; onAppearanceChanged: () => Promise<void> }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [error, setError] = useState('')
  const [avatarRevision, setAvatarRevision] = useState(() => Date.now())
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async () => {
    const [profileResult, friendsResult, attendanceResult, vaultResult] = await Promise.allSettled([api.profile(), api.friends(), api.attendance(), api.vault()])
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    else setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load profile.')
    if (friendsResult.status === 'fulfilled') setFriends(friendsResult.value)
    else setError(friendsResult.reason instanceof Error ? friendsResult.reason.message : 'Could not load friends.')
    if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value)
    else setError(attendanceResult.reason instanceof Error ? attendanceResult.reason.message : 'Could not load attendance.')
    if (vaultResult.status === 'fulfilled') setVault(vaultResult.value)
    else setError(vaultResult.reason instanceof Error ? vaultResult.reason.message : 'Could not load cosmetics.')
  }, [])
  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [user, refresh])
  useEffect(() => { if (selectedFriend) void api.messages(selectedFriend).then(setMessages).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load messages.')) }, [selectedFriend])
  useEffect(() => {
    if (!user) return
    return subscribeToSocialUpdates({
      onMessage: (message) => {
        const other = message.sender === user.username ? message.recipient : message.sender
        if (other !== selectedFriend) return
        setMessages((currentMessages) => currentMessages.some((item) => item.id === message.id)
          ? currentMessages.map((item) => item.id === message.id ? message : item)
          : [...currentMessages, message])
      },
      onMessageDeleted: (message) => {
        const other = message.sender === user.username ? message.recipient : message.sender
        if (other === selectedFriend) setMessages((currentMessages) => currentMessages.filter((item) => item.id !== message.id))
      },
      onFriendship: (friendship) => {
        setFriends((currentFriends) => {
          const index = currentFriends.findIndex((item) => item.username === friendship.username)
          if (index === -1) return [...currentFriends, friendship]
          return currentFriends.map((item) => item.username === friendship.username ? friendship : item)
        })
      },
    })
  }, [user, selectedFriend])
  useEffect(() => {
    const messageList = document.querySelector<HTMLDivElement>('.message-list')
    if (!messageList || messages.length === 0) return
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' })
  }, [messages, selectedFriend])
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])
  useEffect(() => {
    const select = document.querySelector<HTMLSelectElement>('.attendance-title-select select')
    if (!select || select.querySelector('option[value="NONE"]')) return
    const option = document.createElement('option')
    option.value = 'NONE'
    option.textContent = 'Unequip title'
    select.append(option)
    return () => option.remove()
  }, [attendance])
  if (!user) return <div className="page"><PageIntro eyebrow="YOUR PROGRESS" title="Sign in to track your progress." description="Your score and solved challenges are tied to your authenticated account." /><button className="button primary" type="button" onClick={onLogin}>Sign in</button></div>
  const current = profile ?? { ...user, rank: 0, solvedCount: 0, statusMessage: null, avatarUrl: null, equippedFrame: null, equippedAccessory: null, equippedTitle: null, tier: 'beginner' }
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setProfile(await api.updateProfile({ nickname: String(form.get('nickname')), statusMessage: String(form.get('statusMessage')) })); await onAppearanceChanged() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save profile.') } }
  const checkIn = async () => { try { setAttendance(await api.checkIn()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not complete the daily check-in.') } }
  const selectTitle = async (event: ChangeEvent<HTMLSelectElement>) => { try { setAttendance(await api.selectAttendanceTitle(event.target.value)); await onAppearanceChanged() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the title.') } }
  const uploadAvatar = async (file: File) => { setError(''); setAvatarPreview(URL.createObjectURL(file)); try { setProfile(await api.uploadAvatar(file)); setAvatarRevision(Date.now()); await onAppearanceChanged() } catch (cause) { setAvatarPreview(null); setError(cause instanceof Error ? cause.message : 'Could not upload avatar.') } }
  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (!file) return; const validType = !file.type || ['image/png', 'image/jpeg'].includes(file.type); const validName = /\.(png|jpe?g)$/i.test(file.name); if (!validType && !validName) { setError('PNG 또는 JPG 이미지만 업로드할 수 있습니다.'); return } if (file.size > 2 * 1024 * 1024) { setError('프로필 이미지는 2MB 이하만 업로드할 수 있습니다.'); return } void uploadAvatar(file) }
  const addFriend = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const formElement = event.currentTarget; setError(''); const reference = String(new FormData(formElement).get('username')).trim(); if (!reference || reference.length > 80) { setError('Enter an account ID or display name.'); return } try { await api.requestFriend(reference); await refresh(); formElement.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send friend request.') } }
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const formElement = event.currentTarget; if (!selectedFriend) return; const form = new FormData(formElement); try { const sent = await api.sendMessage(selectedFriend, String(form.get('content'))); setMessages((currentMessages) => [...currentMessages, sent]); formElement.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send message.') } }
  const editMessage = async (message: DirectMessage) => { const content = window.prompt('Edit message', message.content)?.trim(); if (!content || content === message.content) return; try { const updated = await api.updateMessage(message.id, content); setMessages((currentMessages) => currentMessages.map((item) => item.id === updated.id ? updated : item)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not edit message.') } }
  const deleteMessage = async (message: DirectMessage) => { if (!window.confirm('Delete this message?')) return; try { await api.deleteMessage(message.id); setMessages((currentMessages) => currentMessages.filter((item) => item.id !== message.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete message.') } }
  const equipItem = async (item: VaultCosmetic) => { try { setVault(await api.equipVaultItem(item.id)); await onAppearanceChanged() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update loadout.') } }
  const ownedCosmetics = vault?.cosmetics.filter((item) => item.owned) ?? []
  const ownedFrames = ownedCosmetics.filter((i) => i.type === 'FRAME')
  const ownedAccessories = ownedCosmetics.filter((i) => i.type === 'ACCESSORY')
  const ownedTitles = ownedCosmetics.filter((i) => i.type === 'TITLE')
  const loadoutGroups = [{ label: '프레임', items: ownedFrames }, { label: '액세서리', items: ownedAccessories }, { label: '칭호', items: ownedTitles }].filter((g) => g.items.length > 0)
  const avatarSrc = avatarPreview ?? (current.avatarUrl ? `${current.avatarUrl}${current.avatarUrl.includes('?') ? '&' : '?'}view=${avatarRevision}` : null)
  const activeTitle = attendance?.earnedTitles.find((title) => title.id === attendance.activeTitle)
  return <div className="page profile-page">
    <div className={`profile-hero ${current.equippedFrame ? `equipped-${current.equippedFrame}` : ''} ${current.equippedTitle === 'super_user' || attendance?.activeTitle === 'SUPER_USER' ? 'super-user-profile' : ''}`}>
      <button className="profile-avatar avatar-large avatar-picker" type="button" onClick={() => avatarInput.current?.click()} aria-label="Upload profile photo">
        {avatarSrc ? <img src={avatarSrc} alt="" /> : (current.nickname || current.username).slice(0, 2).toUpperCase()}
        <span className="avatar-picker-label">Change photo</span>
      </button>
      <input ref={avatarInput} className="sr-only" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={selectAvatar} />
      <div><p className="eyebrow">OPERATOR PROFILE</p><h1>{current.nickname || current.username} {current.equippedAccessory && <span className="profile-accessory" title={cosmeticLabel(current.equippedAccessory)}>◈</span>}<TierEmblem tier={current.tier} /></h1>{current.equippedTitle ? <p className={`profile-title vault-profile-title ${titleTone(current.equippedTitle)}`}>{cosmeticLabel(current.equippedTitle)}</p> : activeTitle && <p className={`profile-title ${titleTone(activeTitle.id)}`}>{activeTitle.name}</p>}<p className="muted">@{current.username}</p><p className="status-message">{current.statusMessage || 'No status message yet.'}</p></div>
    </div>
    <div className="profile-stats"><Stat value={current.score} label="Score" detail="total points" /><Stat value={current.solvedCount} label="Solves" detail={`rank #${current.rank || '—'}`} /></div>
    <section className="profile-layout"><div>{attendance && <section className="panel attendance-panel"><div className="attendance-heading"><div><p className="eyebrow">DAILY OPERATIONS</p><h2>Attendance</h2></div><button type="button" className="button primary" disabled={attendance.checkedInToday} onClick={() => void checkIn()}>{attendance.checkedInToday ? 'Checked in today' : 'Check in today'}</button></div><div className="attendance-stats"><div><strong>{attendance.currentStreak}</strong><small>Current streak</small></div><div><strong>{attendance.longestStreak}</strong><small>Longest streak</small></div><div><strong>{attendance.totalDays}</strong><small>Total days</small></div></div><label className="attendance-title-select">Profile title<select value={attendance.activeTitle ?? ''} onChange={selectTitle} disabled={attendance.earnedTitles.length === 0}><option value="" disabled>Earn a title to equip it</option>{attendance.earnedTitles.map((title) => <option key={title.id} value={title.id}>{title.name} · {title.requirement}</option>)}</select></label><div className="attendance-badges">{attendance.badges.map((badge) => <span className="attendance-badge" key={badge.id} title={badge.description}>✦ {badge.name}</span>)}</div></section>}<section className="panel profile-editor"><h2>Customize profile</h2><form onSubmit={(event) => void saveProfile(event)}><label>Display name<input name="nickname" defaultValue={current.nickname} maxLength={80} /></label><label>Status message<textarea name="statusMessage" defaultValue={current.statusMessage || ''} maxLength={160} placeholder="What are you working on?" /></label><button className="button primary" type="submit">Save profile</button></form><button className="button secondary profile-vault-button" type="button" onClick={onVault}>상점에서 구매</button></section>{loadoutGroups.length > 0 && <section className="panel loadout-panel"><p className="eyebrow">MY LOADOUT</p><h2>꾸미기</h2>{loadoutGroups.map(({ label, items }) => <div className="loadout-group" key={label}><h3>{label}</h3><div className="loadout-grid">{items.map((item) => <button className={`loadout-item ${item.equipped ? 'equipped' : ''}`} key={item.id} type="button" onClick={() => void equipItem(item)}><span className="loadout-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◈' : '✦'}</span><span className="loadout-name">{item.name}</span>{item.equipped && <span className="loadout-badge">장착 중</span>}</button>)}</div></div>)}<div className="loadout-footer"><small>{vault?.gems} <span>루비</span></small><button className="button secondary" type="button" onClick={onVault}>상점에서 더 보기</button></div></section>}<section className="content-section"><button className="button secondary" type="button" onClick={onChallenges}>Browse challenges</button></section></div><aside className="social-panel"><h2>Friends</h2><form className="friend-request" onSubmit={(event) => void addFriend(event)}><input name="username" placeholder="Account username (e.g. @player_1)" minLength={3} maxLength={51} autoComplete="off" required /><button className="button primary" type="submit">Add</button></form><div className="friend-list">{friends.length === 0 && <p className="muted">No friends yet.</p>}{friends.map((friend) => <div className="friend-row" key={friend.username}><button type="button" onClick={() => friend.relationshipStatus === 'ACCEPTED' && setSelectedFriend(friend.username)}><span className="mini-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}</strong><small>@{friend.username} · {friend.relationshipStatus}</small></span></button>{friend.incomingRequest ? <button type="button" className="button secondary" onClick={async () => { try { await api.acceptFriend(friend.username); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not accept request.') } }}>Accept</button> : <button type="button" className="text-link" onClick={async () => { if (!window.confirm('Remove this friend?')) return; try { await api.removeFriend(friend.username); if (selectedFriend === friend.username) setSelectedFriend(null); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove friend.') } }}>Remove</button>}</div>)}</div>{selectedFriend && <section className="message-panel"><h3>Message @{selectedFriend}</h3><div className="message-list">{messages.map((message) => <article className={message.sender === current.username ? 'message sent' : 'message received'} key={message.id}><span>{message.content}</span>{message.sender === current.username && <div className="message-actions"><button type="button" onClick={() => void editMessage(message)}>Edit</button><button type="button" onClick={() => void deleteMessage(message)}>Delete</button></div>}</article>)}</div><form onSubmit={(event) => void sendMessage(event)}><textarea name="content" maxLength={2000} required placeholder="Write a private message" /><button className="button primary" type="submit">Send</button></form></section>}</aside></section>
    {error && <p className="alert error">{error}</p>}
  </div>
}

function FriendsView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [error, setError] = useState('')
  const messageList = useRef<HTMLDivElement>(null)
  const refresh = useCallback(async () => {
    try { setFriends(await api.friends()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load friends.') }
  }, [])
  const upsertMessage = useCallback((message: DirectMessage) => {
    setMessages((current) => current.some((item) => item.id === message.id)
      ? current.map((item) => item.id === message.id ? message : item)
      : [...current, message])
  }, [])
  useEffect(() => { if (!user) return; const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [user, refresh])
  useEffect(() => {
    if (!selectedFriend) return
    let active = true
    void api.messages(selectedFriend).then((next) => { if (active) { setMessages(next); setError('') } }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load messages.') })
    return () => { active = false }
  }, [selectedFriend])
  useEffect(() => {
    if (!user) return
    return subscribeToSocialUpdates({
      onMessage: (message) => {
        const other = message.sender === user.username ? message.recipient : message.sender
        if (other === selectedFriend) upsertMessage(message)
      },
      onMessageDeleted: (message) => {
        const other = message.sender === user.username ? message.recipient : message.sender
        if (other === selectedFriend) setMessages((current) => current.filter((item) => item.id !== message.id))
      },
      onFriendship: (friendship) => setFriends((current) => {
        const exists = current.some((item) => item.username === friendship.username)
        return exists ? current.map((item) => item.username === friendship.username ? friendship : item) : [...current, friendship]
      }),
    })
  }, [selectedFriend, upsertMessage, user])
  useEffect(() => {
    if (messages.length) messageList.current?.scrollTo({ top: messageList.current.scrollHeight, behavior: 'smooth' })
  }, [messages])
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLSpanElement>('.friends-page .message-meta small').forEach((label) => {
      label.classList.toggle('is-read', label.textContent === 'Read')
    })
  }, [messages])
  if (!user) return <div className="page"><PageIntro eyebrow="FRIENDS" title="Sign in to message your friends." description="Friend requests and private messages are available after sign-in." /><button className="button primary" type="button" onClick={onLogin}>Sign in</button></div>
  const addFriend = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const username = String(new FormData(form).get('username')).trim(); try { await api.requestFriend(username); await refresh(); form.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send friend request.') } }
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedFriend) return; const form = event.currentTarget; try { upsertMessage(await api.sendMessage(selectedFriend, String(new FormData(form).get('content')))); form.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send message.') } }
  const editMessage = async (message: DirectMessage) => { const content = window.prompt('Edit message', message.content)?.trim(); if (!content || content === message.content) return; try { upsertMessage(await api.updateMessage(message.id, content)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not edit message.') } }
  const deleteMessage = async (message: DirectMessage) => { if (!window.confirm('Delete this message?')) return; try { await api.deleteMessage(message.id); setMessages((current) => current.filter((item) => item.id !== message.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete message.') } }
  return <div className="page friends-page"><PageIntro eyebrow="FRIENDS & MESSAGES" title="Friends" description="Add fellow learners and keep the conversation private." /><section className="social-panel"><form className="friend-request" onSubmit={(event) => void addFriend(event)}><input name="username" placeholder="Account username (e.g. @player_1)" minLength={3} maxLength={80} autoComplete="off" required /><button className="button primary" type="submit">Add</button></form><div className="friend-list">{friends.length === 0 && <p className="muted">No friends yet.</p>}{friends.map((friend) => <div className="friend-row" key={friend.username}><button type="button" onClick={() => friend.relationshipStatus === 'ACCEPTED' && setSelectedFriend(friend.username)}><span className="mini-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}</strong><small>@{friend.username} · {friend.relationshipStatus}</small></span></button>{friend.incomingRequest ? <button type="button" className="button secondary" onClick={() => void api.acceptFriend(friend.username).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not accept request.'))}>Accept</button> : <button type="button" className="text-link" onClick={() => { if (!window.confirm('Remove this friend?')) return; void api.removeFriend(friend.username).then(() => { if (selectedFriend === friend.username) setSelectedFriend(null); return refresh() }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not remove friend.')) }}>Remove</button>}</div>)}</div>{selectedFriend && <section className="message-panel"><h3>Message @{selectedFriend}</h3><div className="message-list" ref={messageList}>{messages.map((message) => <article className={message.sender === user.username ? 'message sent' : 'message received'} key={message.id}><span>{message.content}</span>{message.sender === user.username && <div className="message-meta"><small>{message.read ? 'Read' : 'Sent'}</small><div className="message-actions"><button type="button" onClick={() => void editMessage(message)}>Edit</button><button type="button" onClick={() => void deleteMessage(message)}>Delete</button></div></div>}</article>)}</div><form onSubmit={(event) => void sendMessage(event)}><textarea name="content" maxLength={2000} required placeholder="Write a private message" /><button className="button primary" type="submit">Send</button></form></section>}</section>{error && <p className="alert error">{error}</p>}</div>
}

function communityCategoryFromSearch(search: string): CommunityCategory | undefined {
  const value = new URLSearchParams(search).get('category')
  return value === 'NOTICE' || value === 'QUESTION' ? value : undefined
}

function EnhancedCommunityView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const location = useLocation()
  const [category, setCategory] = useState<CommunityCategory | undefined>(() => communityCategoryFromSearch(location.search))
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [notices, setNotices] = useState<PostSummary[]>([])
  const [error, setError] = useState('')
  const routerNavigate = useNavigate()
  const refresh = useCallback(async () => {
    try {
      const [nextPosts, nextNotices] = await Promise.all([api.communityPosts(category), api.communityPosts('NOTICE')])
      setPosts(category === 'NOTICE' ? [] : nextPosts.content.filter((post) => post.category !== 'NOTICE'))
      setNotices(nextNotices.content)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load community posts.')
    }
  }, [category])
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  const openPost = (id: number) => routerNavigate(`/community/${id}`)
  const visiblePosts = category === 'NOTICE' ? notices : posts
  return <div className="page community-page"><PageIntro eyebrow="COMMUNITY" title="Learn together." description="Ask questions, share safe write-ups, and discuss the Mini CTF training labs." />
    {category !== 'NOTICE' && notices.length > 0 && <section className="pinned-notices"><div className="pinned-notices-heading"><p className="eyebrow">PINNED NOTICES</p><span>{notices.length}</span></div>{notices.map((notice) => <button type="button" className="pinned-notice" key={notice.id} onClick={() => openPost(notice.id)}><Badge tone="NOTICE">NOTICE</Badge><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleDateString()}</small></button>)}</section>}
    <div className="community-toolbar"><div className="filter-tabs">{(['FREE', 'QUESTION', 'CTF', 'NOTICE'] as CommunityCategory[]).map((item) => <button key={item} type="button" className={category === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(category === item ? undefined : item)}>{item}</button>)}</div>{user ? <CommunityWriter onCreated={(post) => { setPosts((current) => [{ ...post, commentCount: 0, likeCount: 0, dislikeCount: 0, recommendCount: 0, viewerReactions: [] }, ...current]); routerNavigate(`/community/${post.id}`) }} /> : <button type="button" className="button primary" onClick={onLogin}>Sign in to write</button>}</div>
    {error && <p className="alert error">{error}</p>}<div className="community-list">{visiblePosts.map((post) => <button type="button" className="community-post-row" key={post.id} onClick={() => openPost(post.id)}><Badge tone={post.category}>{post.category}</Badge><strong>{post.title}</strong><span data-profile-username={post.author}>{post.authorNickname || post.author}{post.authorTitle && <small className="community-title">{cosmeticLabel(post.authorTitle)}</small>}</span><small>{post.commentCount} comments · {post.likeCount} likes · {new Date(post.createdAt).toLocaleDateString()}</small></button>)}{visiblePosts.length === 0 && <EmptyState />}</div>
  </div>
}

function EnhancedCommunityPostView({ post, user, onBack }: { post: PostDetail; user: User | null; onBack: () => void }) {
  const [current, setCurrent] = useState(post)
  const [comments, setComments] = useState<PostComment[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const refreshComments = useCallback(() => api.postComments(current.id).then((nextComments) => {
    setComments(nextComments)
    setCurrent((previous) => ({ ...previous, commentCount: nextComments.length }))
  }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load comments.')), [current.id])
  useEffect(() => { void refreshComments() }, [refreshComments])
  const react = async (reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND') => { if (!user) return; try { setCurrent(await api.reactToPost(current.id, reaction)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your reaction.') } }
  const deletePost = async () => { if (!window.confirm('Delete this post?')) return; try { await api.deletePost(current.id); onBack() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete post.') } }
  const deleteComment = async (id: number) => { if (!window.confirm('Delete this comment?')) return; try { await api.deletePostComment(id); await refreshComments() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete comment.') } }
  const pinReply = async (id: number) => { try { await api.pinPostReply(current.id, id); await refreshComments() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not pin this reply.') } }
  const roots = comments.filter((comment) => comment.parentId === null)
  const repliesFor = (parentId: number) => comments.filter((comment) => comment.parentId === parentId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt.localeCompare(b.createdAt))
  return <div className="page community-page"><button className="back-link" type="button" onClick={onBack}>← Back to community</button><article className="community-detail"><div className="badge-line"><Badge tone={current.category}>{current.category}</Badge></div>{editing ? <PostEditor post={current} onSaved={(next) => { setCurrent(next); setEditing(false) }} onCancel={() => setEditing(false)} /> : <><h1>{current.title}</h1><p className="muted">by {current.authorNickname || current.author}{current.authorTitle && <span className="community-title"> · {cosmeticLabel(current.authorTitle)}</span>} · {new Date(current.createdAt).toLocaleString()}</p><p className="community-content">{current.content}</p><ReactionBar post={current} disabled={!user} onReact={(reaction) => void react(reaction)} />{current.editable && <div className="inline-actions"><button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit</button><button className="button ghost danger-button" type="button" onClick={() => void deletePost()}>Delete</button></div>}</>}</article>
    <section className="comment-section"><div className="comment-section-heading"><h2>Comments <span>{current.commentCount}</span></h2><small>Replies can be pinned by the post author.</small></div>{user ? <ThreadedCommentWriter postId={current.id} onCreated={(comment) => { setComments((items) => [...items, comment]); setCurrent((previous) => ({ ...previous, commentCount: previous.commentCount + 1 })) }} /> : <p className="muted">Sign in to join the conversation.</p>}{error && <p className="alert error">{error}</p>}{roots.map((comment) => <ThreadedComment key={comment.id} comment={comment} replies={repliesFor(comment.id)} postId={current.id} canPin={user?.username === current.author} signedIn={Boolean(user)} onReplyAdded={(reply) => { setComments((items) => [...items, reply]); setCurrent((previous) => ({ ...previous, commentCount: previous.commentCount + 1 })) }} onDelete={(id) => void deleteComment(id)} onPin={(id) => void pinReply(id)} />)}</section>
  </div>
}

function CommunityPostRoute({ user }: { user: User | null }) {
  const { postId } = useParams()
  const routerNavigate = useNavigate()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const id = Number(postId)
    if (!Number.isFinite(id)) return
    let active = true
    api.communityPost(id).then((next) => { if (active) setPost(next) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not open post.') })
    return () => { active = false }
  }, [postId])
  if (!postId || !Number.isFinite(Number(postId))) return <Navigate to="/community" replace />
  if (error) return <div className="page"><p className="alert error">{error}</p><button type="button" className="button secondary" onClick={() => routerNavigate('/community')}>← Back to community</button></div>
  if (!post) return <div className="page"><LoadingState label="Opening post..." /></div>
  return <EnhancedCommunityPostView key={post.id} post={post} user={user} onBack={() => routerNavigate('/community')} />
}

function ReactionBar({ post, disabled, onReact }: { post: PostDetail; disabled: boolean; onReact: (reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND') => void }) {
  const items: { reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND'; label: string; count: number }[] = [{ reaction: 'LIKE', label: 'Like', count: post.likeCount }, { reaction: 'DISLIKE', label: 'Dislike', count: post.dislikeCount }, { reaction: 'RECOMMEND', label: 'Recommend', count: post.recommendCount }]
  return <div className="reaction-bar">{items.map((item) => <button key={item.reaction} type="button" aria-label={item.label} title={item.label} disabled={disabled} className={post.viewerReactions.includes(item.reaction) ? 'reaction-button active' : 'reaction-button'} onClick={() => onReact(item.reaction)}><ReactionIcon reaction={item.reaction} /><span>{item.count}</span></button>)}</div>
}

function ReactionIcon({ reaction }: { reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND' }) {
  if (reaction === 'LIKE') return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v10H4V10h3Zm2 10V10l4-6 1 1v4h4.8c1.1 0 1.7 1 1.4 2l-2.1 8A2 2 0 0 1 16.2 20H9Z" fill="currentColor" /></svg>
  if (reaction === 'DISLIKE') return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V4H4v10h3Zm2-10v10l4 6 1-1v-4h4.8c1.1 0 1.7-1 1.4-2l-2.1-8A2 2 0 0 0 16.2 4H9Z" fill="currentColor" /></svg>
  return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.38 1.06 6.18L12 17.18 6.44 20.1 7.5 13.92 3 9.54l6.22-.91L12 3Z" fill="currentColor" /></svg>
}

function ThreadedComment({ comment, replies, postId, canPin, signedIn, onReplyAdded, onDelete, onPin }: { comment: PostComment; replies: PostComment[]; postId: number; canPin: boolean; signedIn: boolean; onReplyAdded: (comment: PostComment) => void; onDelete: (id: number) => void; onPin: (id: number) => void }) {
  const [replying, setReplying] = useState(false)
  return <article className="threaded-comment"><div className="comment"><strong data-profile-username={comment.author}>{comment.authorNickname || comment.author}{comment.authorTitle && <small className="community-title"> · {cosmeticLabel(comment.authorTitle)}</small>}</strong><small>{new Date(comment.createdAt).toLocaleString()}</small><p>{comment.content}</p><div className="comment-actions">{signedIn && <button type="button" onClick={() => setReplying((open) => !open)}>Reply</button>}{comment.editable && <button type="button" onClick={() => onDelete(comment.id)}>Delete</button>}</div></div>{replying && <ThreadedCommentWriter postId={postId} parentId={comment.id} compact onCreated={(reply) => { onReplyAdded(reply); setReplying(false) }} />}{replies.map((reply) => <div className={reply.pinned ? 'comment reply pinned' : 'comment reply'} key={reply.id}>{reply.pinned && <span className="pinned-reply-label">PINNED REPLY</span>}<strong data-profile-username={reply.author}>{reply.authorNickname || reply.author}{reply.authorTitle && <small className="community-title"> · {cosmeticLabel(reply.authorTitle)}</small>}</strong><small>{new Date(reply.createdAt).toLocaleString()}</small><p>{reply.content}</p><div className="comment-actions">{canPin && <button type="button" onClick={() => onPin(reply.id)}>Pin reply</button>}{reply.editable && <button type="button" onClick={() => onDelete(reply.id)}>Delete</button>}</div></div>)}</article>
}

function ThreadedCommentWriter({ postId, parentId, compact = false, onCreated }: { postId: number; parentId?: number; compact?: boolean; onCreated: (comment: PostComment) => void }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { onCreated(await api.createPostComment(postId, content, parentId)); setContent('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post comment.') } }
  return <form className={compact ? 'comment-writer reply-writer' : 'comment-writer'} onSubmit={(event) => void submit(event)}><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={parentId ? 'Write a reply' : 'Add a constructive comment'} maxLength={2000} required /><button type="submit" className="button primary">{parentId ? 'Reply' : 'Comment'}</button>{error && <p className="alert error">{error}</p>}</form>
}

void CommunityView

function CommunityView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [category, setCategory] = useState<CommunityCategory | undefined>()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [selected, setSelected] = useState<PostDetail | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => api.communityPosts(category).then((data) => setPosts(data.content)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load community posts.')), [category])
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  if (selected) return <CommunityPostView post={selected} user={user} onBack={() => { setSelected(null); void refresh() }} />
  return <div className="page community-page"><PageIntro eyebrow="COMMUNITY" title="Learn together." description="Ask questions, share safe write-ups, and discuss the Mini CTF training labs." /><div className="community-toolbar"><div className="filter-tabs">{(['FREE', 'QUESTION', 'CTF', 'NOTICE'] as CommunityCategory[]).map((item) => <button key={item} type="button" className={category === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(category === item ? undefined : item)}>{item}</button>)}</div>{user ? <CommunityWriter onCreated={(post) => { setPosts((current) => [{ ...post, commentCount: 0 }, ...current]); setSelected(post) }} /> : <button type="button" className="button primary" onClick={onLogin}>Sign in to write</button>}</div>{error && <p className="alert error">{error}</p>}<div className="community-list">{posts.map((post) => <button type="button" className="community-post-row" key={post.id} onClick={() => api.communityPost(post.id).then(setSelected).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not open post.'))}><Badge tone={post.category}>{post.category}</Badge><strong>{post.title}</strong><span>{post.authorNickname || post.author}</span><small>{post.commentCount} comments · {new Date(post.createdAt).toLocaleDateString()}</small></button>)}{posts.length === 0 && <EmptyState />}</div></div>
}

function CommunityWriter({ onCreated }: { onCreated: (post: PostDetail) => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const post = await api.createPost({ title: String(form.get('title')), content: String(form.get('content')), category: String(form.get('category')) as CommunityCategory }); onCreated(post) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish post.') } }
  if (!open) return <button type="button" className="button secondary" onClick={() => setOpen(true)}>Write a post</button>
  return <form className="community-editor" onSubmit={submit}><input name="title" placeholder="Post title" maxLength={200} required /><select name="category" defaultValue="FREE"><option value="FREE">Free</option><option value="QUESTION">Question</option><option value="CTF">CTF</option></select><textarea name="content" placeholder="Write plain text only. Do not post live flags or solutions in public threads." maxLength={20000} required /><div><button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancel</button><button className="button primary" type="submit">Publish</button></div>{error && <p className="alert error">{error}</p>}</form>
}

function CommunityPostView({ post, user, onBack }: { post: PostDetail; user: User | null; onBack: () => void }) {
  const [current, setCurrent] = useState(post)
  const [comments, setComments] = useState<PostComment[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const refreshComments = useCallback(() => api.postComments(current.id).then(setComments).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load comments.')), [current.id])
  useEffect(() => { void refreshComments() }, [refreshComments])
  const deletePost = async () => { if (!window.confirm('Delete this post?')) return; try { await api.deletePost(current.id); onBack() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete post.') } }
  return <div className="page community-page"><button className="back-link" type="button" onClick={onBack}>← Back to community</button><article className="community-detail"><div className="badge-line"><Badge tone={current.category}>{current.category}</Badge></div>{editing ? <PostEditor post={current} onSaved={(next) => { setCurrent(next); setEditing(false) }} onCancel={() => setEditing(false)} /> : <><h1>{current.title}</h1><p className="muted">by {current.authorNickname || current.author} · {new Date(current.createdAt).toLocaleString()}</p><p className="community-content">{current.content}</p>{current.editable && <div className="inline-actions"><button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit</button><button className="button ghost danger-button" type="button" onClick={() => void deletePost()}>Delete</button></div>}</>}</article><section className="comment-section"><h2>Comments</h2>{user ? <CommentWriter postId={current.id} onCreated={(comment) => setComments((items) => [...items, comment])} /> : <p className="muted">Sign in to join the conversation.</p>}{error && <p className="alert error">{error}</p>}{comments.map((comment) => <article className="comment" key={comment.id}><strong>{comment.authorNickname || comment.author}</strong><small>{new Date(comment.createdAt).toLocaleString()}</small><p>{comment.content}</p>{comment.editable && <div className="comment-actions"><button type="button" onClick={async () => { const content = window.prompt('Edit comment', comment.content); if (!content) return; try { const next = await api.updatePostComment(comment.id, content); setComments((items) => items.map((item) => item.id === next.id ? next : item)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not edit comment.') } }}>Edit</button><button type="button" onClick={async () => { if (!window.confirm('Delete this comment?')) return; try { await api.deletePostComment(comment.id); setComments((items) => items.filter((item) => item.id !== comment.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete comment.') } }}>Delete</button></div>}</article>)}</section></div>
}

function PostEditor({ post, onSaved, onCancel }: { post: PostDetail; onSaved: (post: PostDetail) => void; onCancel: () => void }) {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { const form = new FormData(event.currentTarget); onSaved(await api.updatePost(post.id, { title: String(form.get('title')), content: String(form.get('content')), category: String(form.get('category')) as CommunityCategory })) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save changes.') } }
  return <form className="community-editor" onSubmit={(event) => void submit(event)}>{error && <p className="alert error">{error}</p>}<input name="title" defaultValue={post.title} maxLength={200} required /><select name="category" defaultValue={post.category}><option value="FREE">Free</option><option value="QUESTION">Question</option><option value="CTF">CTF</option><option value="NOTICE">Notice</option></select><textarea name="content" defaultValue={post.content} maxLength={20000} required /><div><button className="button ghost" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit">Save</button></div></form>
}

function CommentWriter({ postId, onCreated }: { postId: number; onCreated: (comment: PostComment) => void }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { onCreated(await api.createPostComment(postId, content)); setContent('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post comment.') } }
  return <form className="comment-writer" onSubmit={(event) => void submit(event)}><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add a constructive comment" maxLength={2000} required /><button type="submit" className="button primary">Comment</button>{error && <p className="alert error">{error}</p>}</form>
}

type AdminTab = 'overview' | 'accounts' | 'content' | 'notices' | 'security' | 'logs' | 'ai-feedback'

function AdminConsole() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [assistantFeedback, setAssistantFeedback] = useState<AssistantFeedback[]>([])
  const [contentLoaded, setContentLoaded] = useState(false)
  const [feedbackLoaded, setFeedbackLoaded] = useState(false)
  const [tab, setTab] = useState<AdminTab>('overview')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      setDashboard(await api.adminDashboard())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load administrator data.')
    }
  }, [])

  const loadContent = useCallback(async () => {
    try {
      setError('')
      const [nextPosts, nextComments] = await Promise.all([api.adminPosts(), api.adminComments()])
      setPosts(nextPosts)
      setComments(nextComments)
      setContentLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load moderation data.')
    }
  }, [])

  const loadAssistantFeedback = useCallback(async () => {
    try {
      setError('')
      setAssistantFeedback(await api.assistantFeedback())
      setFeedbackLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load AI feedback.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (tab === 'content' || tab === 'notices') void loadContent()
    if (tab === 'ai-feedback') void loadAssistantFeedback()
  }, [tab, loadAssistantFeedback, loadContent])

  const editUser = async (id: number, nickname: string) => {
    const next = window.prompt('Display name', nickname)
    if (!next) return
    try { await api.updateAdminUser(id, next); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the account.') }
  }
  const suspend = async (id: number) => {
    const reason = window.prompt('Suspension reason (shown to the user)')
    if (!reason) return
    try { await api.suspendUser(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not suspend the account.') }
  }
  const deactivate = async (id: number, username: string) => {
    if (!window.confirm(`Delete @${username}? Their score, ranking, solves, profile, and community activity will be hidden. The account can be restored later.`)) return
    try { await api.deactivateUser(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the account.') }
  }
  const permanentlyDelete = async (id: number, username: string) => {
    if (!window.confirm(`Permanently delete @${username}? This cannot be undone and all account data will be removed.`)) return
    try { await api.permanentlyDeleteUser(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not permanently delete the account.') }
  }
  const adjustScore = async (id: number) => {
    const amount = Number(window.prompt('Point change (use a negative number to remove points)', '0'))
    if (!Number.isInteger(amount) || amount === 0) return
    const reason = window.prompt('Reason for this point adjustment')?.trim()
    if (!reason) return
    try { await api.adjustAdminUserScore(id, amount, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not adjust score.') }
  }
  const setCosmetic = async (id: number, granted: boolean) => {
    const cosmeticId = window.prompt(granted ? 'Cosmetic ID to grant (for example: steady_solver)' : 'Cosmetic ID to remove')?.trim()
    if (!cosmeticId) return
    try { await api.setAdminUserCosmetic(id, cosmeticId, granted); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update cosmetic ownership.') }
  }
  const removePost = async (id: number, title: string) => {
    if (!window.confirm(`Delete “${title}”?`)) return
    try { await api.deleteAdminPost(id); await Promise.all([refresh(), loadContent()]) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the post.') }
  }
  const removeComment = async (id: number) => {
    if (!window.confirm('Delete this comment?')) return
    try { await api.deleteAdminComment(id); await Promise.all([refresh(), loadContent()]) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the comment.') }
  }
  const publishNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api.publishNotice({ title: String(form.get('title')).trim(), content: String(form.get('content')).trim() })
      event.currentTarget.reset()
      await Promise.all([refresh(), loadContent()])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish the notice.')
    }
  }
  const controlLog = async (type: 'audit' | 'security', id: number, hide: boolean) => {
    const reason = window.prompt(hide ? 'Reason for hiding this record' : 'Reason for redacting sensitive information')
    if (!reason) return
    try {
      if (type === 'audit') {
        if (hide) await api.hideAuditLog(id, reason)
        else await api.redactAuditLog(id, reason)
      } else if (hide) await api.hideSecurityEvent(id, reason)
      else await api.redactSecurityEvent(id, reason)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the log.')
    }
  }

  const banIp = async () => {
    const ipAddress = window.prompt('차단할 IP 주소를 입력하세요.')?.trim()
    if (!ipAddress) return
    const reason = window.prompt('차단 사유를 입력하세요.')?.trim()
    if (!reason) return
    try { await api.banIp(ipAddress, reason); window.alert(`${ipAddress} IP를 차단했습니다.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'IP를 차단하지 못했습니다.') }
  }
  void banIp

  const banRegisteredIp = async () => {
    const username = window.prompt('차단할 사용자 아이디를 입력하세요.')?.trim()
    if (!username) return
    const reason = window.prompt('차단 사유를 입력하세요.')?.trim()
    if (!reason) return
    try {
      await api.banRegisteredIp(username, reason)
      window.alert(`${username} 계정의 가입 IP를 차단했습니다.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '계정의 가입 IP를 차단하지 못했습니다.')
    }
  }
  const manageIpBans = async () => {
    try {
      const bans = await api.ipBans()
      if (bans.length === 0) { window.alert('현재 차단된 IP가 없습니다.'); return }
      const selected = window.prompt(`차단 목록\n${bans.map((ban) => `${ban.id}. ${ban.ipAddress} — ${ban.reason}`).join('\n')}\n\n해제할 번호를 입력하세요.`)?.trim()
      if (!selected) return
      const id = Number(selected)
      if (!Number.isInteger(id) || !bans.some((ban) => ban.id === id)) { setError('목록에 있는 번호를 입력해 주세요.'); return }
      await api.unbanIp(id)
      window.alert('IP 차단을 해제했습니다.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IP 차단 목록을 불러오지 못했습니다.') }
  }
  if (!dashboard) return <div className="page admin-page"><PageIntro eyebrow="ADMIN CONSOLE" title="Administrator console" description="Loading platform status and moderation controls." />{error && <p className="alert error">{error}</p>}<p className="muted">Loading administrator data...</p></div>

  const notices = posts.filter((post) => post.category === 'NOTICE')
  const accountPowerTools = tab === 'accounts' && <section className="admin-section admin-card admin-account-power-tools"><div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT POWERS</p><h2>Score and cosmetic controls</h2></div><small>Permanent deletion is available only after a reversible deletion.</small></div><div className="admin-table">{dashboard.users.filter((item) => item.role !== 'ADMIN').map((item) => <div className="admin-row" key={`powers-${item.id}`}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.status}</small></div><div className="inline-actions">{item.status === 'DELETED' ? <button type="button" className="text-button danger-text" onClick={() => void permanentlyDelete(item.id, item.username)}>Permanent delete</button> : <><button type="button" className="button secondary" onClick={() => void adjustScore(item.id)}>Adjust score</button><button type="button" className="button secondary" onClick={() => void setCosmetic(item.id, true)}>Grant cosmetic</button><button type="button" className="button ghost" onClick={() => void setCosmetic(item.id, false)}>Remove cosmetic</button></>}</div></div>)}</div></section>
  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts', count: dashboard.users.length },
    { id: 'content', label: 'Content', count: contentLoaded ? posts.length + comments.length : undefined },
    { id: 'notices', label: 'Notices', count: contentLoaded ? notices.length : undefined },
    { id: 'security', label: 'Security', count: dashboard.antiCheatEvents.length },
    { id: 'logs', label: 'Audit logs', count: dashboard.auditLogs.length + dashboard.securityEvents.length },
    { id: 'ai-feedback', label: 'AI feedback', count: feedbackLoaded ? assistantFeedback.length : undefined },
  ]

  return <div className="page admin-page admin-console">
    <PageIntro eyebrow="ADMIN CONSOLE" title="Run the platform clearly." description="Manage accounts, community content, notices, and security records in focused workspaces." />
    <div className="admin-quick-actions admin-ip-ban-actions"><button type="button" className="button ghost danger-button" onClick={() => void banRegisteredIp()}>계정 IP 차단</button><button type="button" className="button secondary" onClick={() => void manageIpBans()}>IP 차단 관리</button></div>
    {accountPowerTools}
    {error && <p className="alert error">{error}</p>}
    <div className="admin-summary-grid">
      <div><small>ACTIVE ACCOUNTS</small><strong>{dashboard.users.filter((item) => item.status === 'ACTIVE').length}</strong></div>
      <div><small>CONTENT RECORDS</small><strong>{contentLoaded ? posts.length + comments.length : '—'}</strong></div>
      <div><small>SECURITY EVENTS</small><strong>{dashboard.antiCheatEvents.length}</strong></div>
      <div><small>RECENT SUBMISSIONS</small><strong>{dashboard.recentSubmissions.length}</strong></div>
    </div>
    <div className="admin-tabs" role="tablist">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(item.id)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}
    </div>

    {tab === 'overview' && <div className="admin-overview-grid">
      <div className="admin-overview-stack">
        <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Operations shortcuts</h2></div></div><div className="admin-quick-actions"><button type="button" className="button secondary" onClick={() => setTab('accounts')}>Review accounts</button><button type="button" className="button secondary" onClick={() => setTab('content')}>Manage content</button><button type="button" className="button primary" onClick={() => setTab('notices')}>Write a notice</button></div></section>
        <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY</p><h2>Events to review</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminEventList items={dashboard.antiCheatEvents.slice(0, 5)} /></section>
      </div>
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent submissions</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminSubmissionList items={dashboard.recentSubmissions.slice(0, 5)} /></section>
    </div>}

    {tab === 'accounts' && <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h2>Account management</h2></div><small>Edit names, suspend, restore, or delete accounts. Deleted accounts keep a private restore snapshot.</small></div><div className="admin-table">{dashboard.users.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.role} · {item.status}</small>{item.suspensionReason && <small className="danger-text">Suspension reason: {item.suspensionReason}</small>}</div>{item.role !== 'ADMIN' && <div className="inline-actions">{item.status !== 'DELETED' && <button type="button" className="button secondary" onClick={() => void editUser(item.id, item.nickname)}>Edit name</button>}{item.status === 'ACTIVE' ? <button type="button" className="button ghost danger-button" onClick={() => void suspend(item.id)}>Suspend</button> : <button type="button" className="button secondary" onClick={() => void api.reinstateUser(item.id).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not restore the account.'))}>{item.status === 'DELETED' ? 'Restore account' : 'Restore'}</button>}{item.status !== 'DELETED' && <button type="button" className="text-button danger-text" onClick={() => void deactivate(item.id, item.username)}>Delete account</button>}</div>}</div>)}</div></section>}

    {tab === 'content' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMUNITY POSTS</p><h2>Post management</h2></div><small>Latest {posts.length}</small></div><div className="admin-table">{posts.filter((post) => post.category !== 'NOTICE').map((post) => <div className="admin-row" key={post.id}><div><strong>{post.title}</strong><small><Badge tone={post.category}>{post.category}</Badge> @{post.authorNickname || post.author} · {post.commentCount} comments · {new Date(post.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(post.id, post.title)}>Delete</button></div>)}</div></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMENTS</p><h2>Comment management</h2></div><small>Latest {comments.length}</small></div><div className="admin-table">{comments.map((comment) => <div className="admin-row" key={comment.id}><div><strong>{comment.content}</strong><small>“{comment.postTitle}” · @{comment.authorNickname || comment.author} · {new Date(comment.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removeComment(comment.id)}>Delete</button></div>)}</div></section></div>}

    {tab === 'notices' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISH NOTICE</p><h2>Write a new notice</h2></div></div><form className="community-editor admin-notice-form" onSubmit={(event) => void publishNotice(event)}><input name="title" placeholder="Notice title" maxLength={200} required /><textarea name="content" placeholder="Write the notice content" maxLength={20000} required /><div><button className="button primary" type="submit">Publish notice</button></div></form></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISHED</p><h2>Published notices</h2></div><small>{notices.length} total</small></div><div className="admin-table">{notices.map((notice) => <div className="admin-row" key={notice.id}><div><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(notice.id, notice.title)}>Delete</button></div>)}</div></section></div>}

    {tab === 'security' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ANTI-CHEAT</p><h2>Security events</h2></div><small>Latest {dashboard.antiCheatEvents.length}</small></div><AdminEventList items={dashboard.antiCheatEvents} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">CHALLENGE ACTIVITY</p><h2>Submission history</h2></div><small>Latest {dashboard.recentSubmissions.length}</small></div><AdminSubmissionList items={dashboard.recentSubmissions} /></section></div>}

    {tab === 'logs' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY LOG</p><h2>Login and account events</h2></div></div><LogList items={dashboard.securityEvents.map((event) => ({ id: event.id, title: `${event.eventType} · ${event.username || event.subject || 'unknown'}`, detail: event.detail || '', date: event.createdAt }))} onControl={(id, hide) => void controlLog('security', id, hide)} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Administrator activity</h2></div></div><LogList items={dashboard.auditLogs.map((log) => ({ id: log.id, title: `${log.action} · ${log.adminUsername}`, detail: log.detail, date: log.createdAt }))} onControl={(id, hide) => void controlLog('audit', id, hide)} /></section></div>}

    {tab === 'ai-feedback' && <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">AI LEARNING HELPER</p><h2>AI feedback</h2></div><small>Only administrators can view these responses.</small></div><div className="admin-table">{assistantFeedback.length === 0 ? <p className="muted">No AI feedback yet.</p> : assistantFeedback.map((item) => <div className="admin-row" key={item.id}><div><strong>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)} · @{item.nickname || item.username}</strong><small>{item.comment || 'No written comment'} · {new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div></section>}
  </div>
}

function AdminSubmissionList({ items }: { items: AdminDashboard['recentSubmissions'] }) {
  const [visibleCount, setVisibleCount] = useState(24)
  useEffect(() => setVisibleCount(24), [items])
  if (items.length === 0) return <p className="muted">No records yet.</p>
  const visibleItems = items.slice(0, visibleCount)
  return <><div className="admin-table">{visibleItems.map((item, index) => <div className="admin-row" key={`${item.username}-${item.submittedAt}-${index}`}><div><strong>@{item.username}</strong><small>{item.challengeTitle} · {new Date(item.submittedAt).toLocaleString()}</small></div><span className={item.correct ? 'success-text' : 'danger-text'}>{item.correct ? 'Correct' : 'Incorrect'}</span></div>)}</div><ProgressiveListAction remaining={items.length - visibleItems.length} onClick={() => setVisibleCount((count) => count + 24)} /></>
}

function AdminEventList({ items }: { items: AdminDashboard['antiCheatEvents'] }) {
  const [visibleCount, setVisibleCount] = useState(24)
  useEffect(() => setVisibleCount(24), [items])
  if (items.length === 0) return <p className="muted">No security events to review.</p>
  const visibleItems = items.slice(0, visibleCount)
  return <><div className="admin-table">{visibleItems.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.eventType} · @{item.username}</strong><small>{item.challengeTitle || 'Platform'} · {item.detail || 'No additional details'} · {new Date(item.createdAt).toLocaleString()}</small></div><span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span></div>)}</div><ProgressiveListAction remaining={items.length - visibleItems.length} onClick={() => setVisibleCount((count) => count + 24)} /></>
}

function AdminView() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => api.adminDashboard().then(setDashboard).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load administrator data.')), [])
  useEffect(() => { void refresh() }, [refresh])
  const editUser = async (id: number, nickname: string) => { const next = window.prompt('Display name', nickname); if (!next) return; try { await api.updateAdminUser(id, next); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update user.') } }
  const suspend = async (id: number) => { const reason = window.prompt('Suspension reason (shown to the user)'); if (!reason) return; try { await api.suspendUser(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not suspend user.') } }
  const controlLog = async (type: 'audit' | 'security', id: number, hide: boolean) => { const reason = window.prompt(hide ? 'Reason for hiding this log' : 'Reason for redacting this log'); if (!reason) return; try { if (type === 'audit') { if (hide) await api.hideAuditLog(id, reason); else await api.redactAuditLog(id, reason) } else if (hide) await api.hideSecurityEvent(id, reason); else await api.redactSecurityEvent(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update log.') } }
  return <div className="page admin-page"><PageIntro eyebrow="ADMINISTRATION" title="Platform control." description="Security log facts stay traceable. Redact hides details; Hide removes a record from the active dashboard with a reason." />{error && <p className="alert error">{error}</p>}{!dashboard ? <p className="muted">Loading administrator dashboard…</p> : <><section className="admin-section"><h2>Users</h2><div className="admin-table">{dashboard.users.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.role}</small>{item.suspensionReason && <small className="danger-text">Suspended: {item.suspensionReason}</small>}</div>{item.role !== 'ADMIN' && <div className="inline-actions"><button type="button" className="button secondary" onClick={() => void editUser(item.id, item.nickname)}>Edit</button>{item.status === 'ACTIVE' ? <button type="button" className="button ghost danger-button" onClick={() => void suspend(item.id)}>Suspend</button> : <button type="button" className="button secondary" onClick={() => void api.reinstateUser(item.id).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not reinstate user.'))}>Reinstate</button>}</div>}</div>)}</div></section><section className="admin-section"><h2>Login and account events</h2><LogList items={dashboard.securityEvents.map((event) => ({ id: event.id, title: `${event.eventType} · ${event.username || event.subject || 'unknown'}`, detail: event.detail || '', date: event.createdAt }))} onControl={(id, hide) => void controlLog('security', id, hide)} /></section><section className="admin-section"><h2>Moderation audit log</h2><LogList items={dashboard.auditLogs.map((log) => ({ id: log.id, title: `${log.action} · ${log.adminUsername}`, detail: log.detail, date: log.createdAt }))} onControl={(id, hide) => void controlLog('audit', id, hide)} /></section><section className="admin-section"><h2>Recent submissions</h2><div className="admin-table">{dashboard.recentSubmissions.map((submission, index) => <div className="admin-row" key={`${submission.username}-${submission.submittedAt}-${index}`}><span>{submission.username}</span><span>{submission.challengeTitle}</span><span className={submission.correct ? 'success-text' : 'danger-text'}>{submission.correct ? 'Correct' : 'Incorrect'}</span></div>)}</div></section></>}</div>
}

void AdminView

function LogList({ items, onControl }: { items: { id: number; title: string; detail: string; date: string }[]; onControl: (id: number, hide: boolean) => void }) {
  const [visibleCount, setVisibleCount] = useState(24)
  useEffect(() => setVisibleCount(24), [items])
  if (items.length === 0) return <p className="muted">No records yet.</p>
  const visibleItems = items.slice(0, visibleCount)
  return <><div className="admin-table">{visibleItems.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.title}</strong><small>{item.detail} · {new Date(item.date).toLocaleString()}</small></div><div className="inline-actions"><button className="button secondary" type="button" onClick={() => onControl(item.id, false)}>Redact</button><button className="button ghost danger-button" type="button" onClick={() => onControl(item.id, true)}>Hide</button></div></div>)}</div><ProgressiveListAction remaining={items.length - visibleItems.length} onClick={() => setVisibleCount((count) => count + 24)} /></>
}

function ProgressiveListAction({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null
  return <div className="progressive-list-action"><button className="button secondary" type="button" onClick={onClick}>더 보기 ({remaining})</button></div>
}

function LegacyLoginView({ onBack, onAuth, language: _language }: { onBack: () => void; onAuth: (result: { token: string; user: User }) => void; language: Language }) {
  const location = useLocation()
  const resetToken = new URLSearchParams(location.search).get('resetToken') ?? ''
  const [mode, setMode] = useState<'login' | 'register' | 'username' | 'password' | 'reset'>(resetToken ? 'reset' : 'login')
  const [error, setError] = useState(() => oauthErrorMessage(new URLSearchParams(location.search).get('oauthError')))
  const [notice, setNotice] = useState('')
  // Keep the standard providers visible while a free Render instance wakes up. Previously this
  // began as an empty list, making every OAuth button briefly disappear during a cold start.
  const [providers, setProviders] = useState<string[]>(['google', 'github', 'discord'])
  useEffect(() => {
    api.oauthProviders()
      .then((available) => { if (available.length > 0) setProviders(available) })
      .catch(() => undefined)
  }, [])
  const title = mode === 'register' ? '계정을 만들어 보세요.' : mode === 'username' ? '아이디 찾기' : mode === 'password' ? '비밀번호 재설정' : mode === 'reset' ? '새 비밀번호 설정' : '계속하려면 로그인하세요.'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const passwordConfirmation = String(form.get('passwordConfirmation') ?? '')
    try {
      if (mode === 'register') {
        if (password !== passwordConfirmation) throw new Error('비밀번호 확인이 일치하지 않습니다.')
        onAuth(await api.register({ username, nickname: String(form.get('nickname') ?? '').trim(), email, password, passwordConfirmation }))
      } else if (mode === 'login') onAuth(await api.login({ username, password }))
      else if (mode === 'username') setNotice((await api.recoverUsername(email)).message)
      else if (mode === 'password') setNotice((await api.requestPasswordReset(username, email)).message)
      else { setNotice((await api.resetPassword(resetToken, password, passwordConfirmation)).message); setMode('login') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.') }
  }
  const switchMode = (next: typeof mode) => { setError(''); setNotice(''); setMode(next) }
  const isRecovery = mode === 'username' || mode === 'password' || mode === 'reset'
  return <div className="auth-page"><button className="back-link" type="button" onClick={onBack}>← 홈으로</button><div className="auth-card"><p className="eyebrow">SECURE ACCESS</p><h1>{title}</h1>{isRecovery && <p className="auth-recovery-copy">{mode === 'username' ? '일반 회원가입 때 등록한 이메일로 아이디를 안내합니다. OAuth 계정은 제외됩니다.' : mode === 'password' ? '아이디와 가입 이메일이 일치하면 안전한 비밀번호 재설정 링크를 보냅니다.' : '새 비밀번호를 입력해 주세요. 링크는 한 번만 사용할 수 있습니다.'}</p>}<form className="auth-form" onSubmit={submit}>{(mode === 'login' || mode === 'register' || mode === 'password') && <label>아이디<input name="username" placeholder="예: flagbox_01 (영문·숫자·_)" required minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" autoComplete="username" /></label>}{mode === 'register' && <label>표시 이름 (선택)<input name="nickname" placeholder="예: 플래그박스 새싹" maxLength={80} /></label>}{(mode === 'register' || mode === 'username' || mode === 'password') && <label>가입 이메일<input name="email" type="email" placeholder="예: flagbox@example.com" required maxLength={254} autoComplete="email" /></label>}{(mode === 'login' || mode === 'register' || mode === 'reset') && <label>{mode === 'reset' ? '새 비밀번호' : '비밀번호'}<input name="password" type="password" placeholder={mode === 'login' ? '비밀번호 입력' : '8자 이상 비밀번호 입력'} required minLength={mode === 'login' ? undefined : 8} maxLength={100} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}{(mode === 'register' || mode === 'reset') && <label>비밀번호 확인<input name="passwordConfirmation" type="password" placeholder="비밀번호를 한 번 더 입력" required minLength={8} maxLength={100} autoComplete="new-password" /></label>}<button className="button primary" type="submit">{mode === 'register' ? '계정 만들기' : mode === 'username' ? '아이디 안내 받기' : mode === 'password' ? '재설정 링크 받기' : mode === 'reset' ? '비밀번호 변경' : '로그인'}</button></form>{notice && <p className="alert success">{notice}</p>}{error && <p className="alert error">{error}</p>}{(mode === 'login' || mode === 'register') && <><div className="auth-divider"><span>또는</span></div><div className="social-buttons">{providers.map((provider) => <button className={`social-button oauth-${provider}`} type="button" key={provider} onClick={() => { window.location.href = `${oauthBaseUrl}/api/auth/oauth/${provider}/authorize` }}><ProviderIcon provider={provider} /><span>{provider[0].toUpperCase() + provider.slice(1)}로 계속하기</span></button>)}</div></>}<div className="auth-footnote auth-links">{mode === 'login' && <><button type="button" onClick={() => switchMode('username')}>아이디를 잊으셨나요?</button><button type="button" onClick={() => switchMode('password')}>비밀번호를 잊으셨나요?</button><span>처음이신가요? <button type="button" onClick={() => switchMode('register')}>회원가입</button></span></>}{mode === 'register' && <span>이미 계정이 있으신가요? <button type="button" onClick={() => switchMode('login')}>로그인</button></span>}{isRecovery && <button type="button" onClick={() => switchMode('login')}>로그인으로 돌아가기</button>}</div></div></div>
}
function LoginView({ onBack, onAuth, language }: { onBack: () => void; onAuth: (result: { token: string; user: User }) => void; language: Language }) {
  return <div className="auth-login-shell"><section className="auth-showcase" aria-label="Interactive constellation background"><AetherFlowHero className="auth-showcase__aether" showContent={false} /><span className="auth-showcase__wordmark" aria-hidden="true">FlagBox</span></section><LegacyLoginView onBack={onBack} onAuth={onAuth} language={language} /></div>
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') return <svg className="oauth-provider-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.56-5.17 3.56-8.64Z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.38-2.3V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4-3.1Z" /><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.14 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z" /></svg>
  if (provider === 'github') return <svg className="oauth-provider-icon" viewBox="0 0 19 19" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clipRule="evenodd" /></svg>
  if (provider === 'discord') return <svg className="oauth-provider-icon" viewBox="0 0 20 19" aria-hidden="true"><path fill="currentColor" d="M16.224 3.768a14.5 14.5 0 0 0-3.67-1.153c-.158.286-.343.67-.47.976a13.5 13.5 0 0 0-4.067 0c-.128-.306-.317-.69-.476-.976A14.4 14.4 0 0 0 3.868 3.77C1.546 7.28.916 10.703 1.231 14.077a14.7 14.7 0 0 0 4.5 2.306q.545-.748.965-1.587a9.5 9.5 0 0 1-1.518-.74q.191-.14.372-.293c2.927 1.369 6.107 1.369 8.999 0q.183.152.372.294-.723.437-1.52.74.418.838.963 1.588a14.6 14.6 0 0 0 4.504-2.308c.37-3.911-.63-7.302-2.644-10.309m-9.13 8.234c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.894 0 1.614.82 1.599 1.82.001 1-.705 1.82-1.6 1.82m5.91 0c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.893 0 1.614.82 1.599 1.82 0 1-.706 1.82-1.6 1.82" /></svg>
  return <span className="oauth-provider-fallback" aria-hidden="true">{provider[0].toUpperCase()}</span>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section> }
function Badge({ tone, children }: { tone: string; children: string }) { return <span className={`badge ${tone.toLowerCase()}`}>{children}</span> }
function EmptyState() { return <div className="empty-state"><h2>Nothing here yet.</h2><p>New content is on the way. Check back soon.</p></div> }

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  override render() {
    if (!this.state.hasError) return this.props.children
    return <div className="app-crash"><h1>문제가 생겼어요.</h1><p>새로고침하면 다시 사용할 수 있어요.</p><button type="button" className="button primary" onClick={() => window.location.reload()}>새로고침</button></div>
  }
}

export default function AppRoot() {
  return <AppErrorBoundary><App /></AppErrorBoundary>
}
