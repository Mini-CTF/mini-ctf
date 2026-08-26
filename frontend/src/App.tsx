import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, rankingChangedEvent, sessionExpiredEvent, sessionExpiredMessage } from './api/client'
import { clearAuthToken, getAuthToken, setAuthToken } from './api/session'
import { subscribeToSocialUpdates } from './api/realtime'
import type { AdminComment, AdminDashboard, AdminPost, AttendanceRankingRow, AttendanceSummary, ChallengeDetail, ChallengeSummary, CommunityCategory, DirectMessage, Friend, HiddenSummary, PostComment, PostDetail, PostSummary, Profile, PublicProfile, RankingRow, Stats, User, VaultCosmetic, VaultSummary } from './types/api'
import flagBoxLogo from './assets/flagbox-logo-transparent.png'
import cipherVaultRelics from './assets/cipher-vault-relic-grid.png'
import './App.css'
import './typography.css'

type Filter = 'ALL' | 'WEB' | 'FORENSIC' | 'REVERSING'
type DifficultyFilter = 'ALL' | 'EASY' | 'MEDIUM' | 'HARD'
const difficultyOrder: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2, INSANE: 3 }
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
const publicProfileEvent = 'flagbox:open-public-profile'
function openPublicProfile(username: string) { window.dispatchEvent(new CustomEvent<string>(publicProfileEvent, { detail: username })) }

const uiCopy = {
  ko: { home: '홈', wargame: '워게임', ranking: '랭킹', community: '커뮤니티', profile: '마이 페이지', shop: '상점', admin: '관리', login: '로그인', logout: '로그아웃', language: '영어로 변경', footer: '안전하게 배우고, 직접 풀어보세요.', status: '학습 플랫폼 정상 운영 중' },
  en: { home: 'Home', wargame: 'Wargames', ranking: 'Rankings', community: 'Community', profile: 'My Page', shop: 'Shop', admin: 'Admin', login: 'Sign in', logout: 'Sign out', language: '한국어로 변경', footer: 'Learn safely. Solve it yourself.', status: 'Learning platform online' },
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
  'Challenge': '문제', 'Challenges': '문제', 'All': '전체', 'Open': '열기', 'Back': '뒤로', 'Submit': '제출', 'Correct': '정답', 'Incorrect': '오답', 'Solved': '해결함', 'Locked': '잠김',
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
  'Customize profile': '프로필 꾸미기', 'Profile appearance': '프로필 장식', 'Choose a frame, accessory, or title from items you own.': '보유한 테두리, 장식, 칭호를 바로 적용해 보세요.', 'No appearance items yet.': '아직 보유한 꾸미기 아이템이 없어요.', 'Status message': '상태 메시지', 'What are you working on?': '지금 어떤 학습을 하고 있나요?', 'Save profile': '프로필 저장', 'Open Cipher Vault': '상점 열기', 'Browse challenges': '워게임 둘러보기',
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
  'EASY': '쉬움', 'MEDIUM': '보통', 'HARD': '어려움', 'INSANE': '도전', 'WEB': '웹', 'FORENSIC': '포렌식', 'REVERSING': '리버싱', 'credits': '크레딧',
  'You have credits left.': '남은 크레딧을 확인하세요.', 'Opening challenge...': '문제를 여는 중...', 'Could not load this challenge.': '문제를 불러오지 못했어요.', 'Not enough hint credits.': '힌트 크레딧이 부족해요.',
}
const koreanToEnglish = Object.fromEntries(Object.entries(englishToKorean).map(([english, korean]) => [korean, english])) as Record<string, string>

function localizeSystemInterface(language: Language) {
  const root = document.querySelector('.app-shell')
  if (!root) return
  const dictionary = language === 'ko' ? englishToKorean : koreanToEnglish
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
  return <BrowserRouter><AppShell /></BrowserRouter>
}

function AppShell() {
  const routerNavigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [, setStats] = useState<Stats>(emptyStats)
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [attendanceRanking, setAttendanceRanking] = useState<AttendanceRankingRow[]>([])
  const [category, setCategory] = useState<Filter>('ALL')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('ALL')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [compactLayout, setCompactLayout] = useState(() => window.innerWidth <= 620)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('flagbox-intro-seen') !== 'true')
  const [introFilled, setIntroFilled] = useState(false)

  useEffect(() => {
    if (!showIntro) return
    const timer = window.setTimeout(() => {
      setShowIntro(false)
      sessionStorage.setItem('flagbox-intro-seen', 'true')
    }, 3850)
    return () => window.clearTimeout(timer)
  }, [showIntro])
  useEffect(() => {
    if (!showIntro) return
    const timer = window.setTimeout(() => setIntroFilled(true), 140)
    return () => window.clearTimeout(timer)
  }, [showIntro])

  useEffect(() => {
    document.documentElement.classList.toggle('flagbox-intro-active', showIntro)
    return () => document.documentElement.classList.remove('flagbox-intro-active')
  }, [showIntro])

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextStats, nextChallenges, nextRanking, nextAttendanceRanking] = await Promise.all([api.stats(), api.challenges(), api.ranking(), api.attendanceRanking()])
      setStats(nextStats)
      setChallenges(nextChallenges)
      setRanking(nextRanking)
      setAttendanceRanking(nextAttendanceRanking)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to the API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const expireSession = () => {
      clearAuthToken()
      setUser(null)
      setError(sessionExpiredMessage)
      routerNavigate('/login?sessionExpired=1', { replace: true })
    }
    window.addEventListener(sessionExpiredEvent, expireSession)
    return () => window.removeEventListener(sessionExpiredEvent, expireSession)
  }, [routerNavigate])

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) {
      setAuthToken(token)
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (getAuthToken()) {
      api.me().then(setUser).catch(() => clearAuthToken())
    }
    void Promise.all([api.stats(), api.challenges(), api.ranking(), api.attendanceRanking()])
      .then(([nextStats, nextChallenges, nextRanking, nextAttendanceRanking]) => {
        setStats(nextStats)
        setChallenges(nextChallenges)
        setRanking(nextRanking)
        setAttendanceRanking(nextAttendanceRanking)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not connect to the API.')
      })
      .finally(() => setLoading(false))
  }, [])

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
    () => [...challenges].sort(byDifficulty).slice(0, 3),
    [challenges],
  )
  const visibleChallenges = useMemo(
    () =>
      challenges
        .filter((item) => category === 'ALL' || item.category === category)
        .filter((item) => difficulty === 'ALL' || item.difficulty === difficulty)
        .sort(byDifficulty),
    [category, difficulty, challenges],
  )
  const go = (path: string) => {
    setMobileNavOpen(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'auto' })
    routerNavigate(path)
  }
  const completeAuth = (result: { token: string; user: User }) => {
    setAuthToken(result.token)
    setUser(result.user)
    go('/challenges')
    void refresh()
  }
  const syncAppearance = async () => {
    try {
      setUser(await api.me())
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh your profile.')
    }
  }
  const logout = () => {
    clearAuthToken()
    setUser(null)
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
    {showIntro && <FlagBoxIntro onSkip={dismissIntro} filled={introFilled} />}
    <header className="site-header">
      <button className="brand" type="button" onClick={() => go('/')} aria-label="FlagBox 홈으로 이동"><img src={flagBoxLogo} alt="" /><span>FlagBox</span></button>
      {compactLayout && <button className="menu-toggle" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="primary-navigation" style={{ display: 'block', position: 'fixed', top: '21px', right: '20px', zIndex: 10 }}>Menu<span className="sr-only"> navigation</span></button>}
      <nav id="primary-navigation" className={mobileNavOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary navigation">
        <NavButton active={path === '/'} onClick={() => go('/')}>{text.home}</NavButton>
        <NavButton active={path.startsWith('/challenges')} onClick={() => go('/challenges')}>{text.wargame}</NavButton>
        <NavButton active={path.startsWith('/ranking')} onClick={() => go('/ranking')}>{text.ranking}</NavButton>
        <NavButton active={path.startsWith('/community')} onClick={() => go('/community')}>{text.community}</NavButton>
        <NavButton active={path.startsWith('/profile')} onClick={() => go('/profile')}>{text.profile}</NavButton>
        {user && <NavButton active={path.startsWith('/friends')} onClick={() => go('/friends')}>Friends</NavButton>}
        {user && <NavButton active={false} onClick={() => { setMobileNavOpen(false); setVaultOpen(true) }}>{text.shop}</NavButton>}
        {user?.role === 'ADMIN' && <NavButton active={path.startsWith('/admin')} onClick={() => go('/admin')}>{text.admin}</NavButton>}
        <button className="nav-button mobile-language" type="button" onClick={() => setLanguage((current) => current === 'ko' ? 'en' : 'ko')} aria-label={text.language}><GlobeIcon /> {language === 'ko' ? 'EN' : 'KO'}</button>
        {user ? <button className="nav-button mobile-auth" type="button" onClick={logout}>{text.logout}</button> : <button className="nav-button mobile-auth" type="button" onClick={() => go('/login')}>{text.login}</button>}
      </nav>
      <div className="header-actions"><button className={`language-toggle ${language === 'en' ? 'is-english' : ''}`} type="button" aria-pressed={language === 'en'} aria-label={text.language} onClick={() => setLanguage((current) => current === 'ko' ? 'en' : 'ko')}><span className="language-toggle-track" aria-hidden="true"><span className="language-toggle-thumb"><GlobeIcon /></span></span><span>{language === 'ko' ? 'KO' : 'EN'}</span></button><button className={`theme-toggle ${theme === 'light' ? 'is-light' : ''}`} type="button" aria-pressed={theme === 'light'} aria-label={theme === 'dark' ? '라이트 테마로 변경' : '다크 테마로 변경'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb">{theme === 'dark' ? '☾' : '☀'}</span></span></button>{user ? <><span className="header-login header-identity">{user.nickname || user.username}</span><button className="header-login" type="button" onClick={logout}>{text.logout}</button></> : <button className="header-login" type="button" onClick={() => go('/login')}>{text.login}</button>}</div>
    </header>
    <main>
      {error && <div className="page"><div className="inline-alert"><p className="alert error">{error}</p><button type="button" className="button secondary" onClick={() => void refresh()}>Retry</button></div></div>}
      <Routes>
        <Route path="/" element={guarded(<Home language={language} challenges={featuredChallenges} onExplore={() => go('/challenges')} onRanking={() => go('/ranking')} onOpen={(item) => go(`/challenges/${item.id}`)} />)} />
        <Route path="/challenges" element={guarded(<ChallengesView items={visibleChallenges} total={challenges.length} category={category} onCategory={setCategory} difficulty={difficulty} onDifficulty={setDifficulty} onOpen={(item) => go(`/challenges/${item.id}`)} />)} />
        <Route path="/challenges/:challengeId" element={guarded(<ChallengeDetailRoute loggedIn={Boolean(user)} onSubmitted={refresh} />)} />
        <Route path="/ranking" element={guarded(<EnhancedRankingView rows={ranking} attendanceRows={attendanceRanking} />)} />
        <Route path="/profile" element={guarded(<ProfileView user={user} onChallenges={() => go('/challenges')} onLogin={() => go('/login')} onVault={() => setVaultOpen(true)} onAppearanceChanged={syncAppearance} />)} />
        <Route path="/friends" element={guarded(<FriendsView user={user} onLogin={() => go('/login')} />)} />
        <Route path="/community" element={guarded(<EnhancedCommunityView user={user} onLogin={() => go('/login')} />)} />
        <Route path="/community/:postId" element={guarded(<CommunityPostRoute user={user} />)} />
        <Route path="/admin" element={user?.role === 'ADMIN' ? guarded(<AdminConsole />) : <Navigate to="/" replace />} />
        <Route path="/login" element={<LoginView onBack={() => go('/')} onAuth={completeAuth} />} />
        <Route path="/auth/callback" element={<CallbackRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    {vaultOpen && user && <CipherVault user={user} onClose={() => setVaultOpen(false)} onAppearanceChanged={syncAppearance} />}
    <PublicProfileDialog />
    <footer className="site-footer"><span><strong>FlagBox</strong> · {text.footer}</span><span className="footer-status">{text.status}</span></footer>
  </div>
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>{children}</button> }
function GlobeIcon() { return <svg className="language-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.5 2.35 3.75 5.18 3.75 8.5S14.5 18.15 12 20.5M12 3.5C9.5 5.85 8.25 8.68 8.25 12S9.5 18.15 12 20.5" /></svg> }

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span className="loading-mark" aria-hidden="true" /><p>{label}</p></div>
}

function FlagBoxIntro({ onSkip, filled }: { onSkip: () => void; filled: boolean }) {
  return <div className={`flagbox-intro flagbox-wordmark-intro${filled ? ' is-filled' : ''}`} role="status" aria-label="FlagBox를 준비하고 있습니다."><button type="button" className="flagbox-intro-skip" onClick={onSkip}>건너뛰기</button><svg className="flagbox-intro-watermark" viewBox="0 0 1500 310" aria-hidden="true"><text x="750" y="232" textAnchor="middle">FlagBox</text><g className="flagbox-intro-flag"><path className="flagbox-intro-pole" d="M1148 226L1194 62L1207 22L1209 76L1163 232Z" /><path className="flagbox-intro-pennant" d="M1212 80C1248 63 1290 68 1321 96C1315 125 1308 153 1299 182C1265 166 1240 150 1211 151Z" /></g></svg></div>
}

function Home({ language, challenges, onExplore, onRanking, onOpen }: { language: Language; challenges: ChallengeSummary[]; onExplore: () => void; onRanking: () => void; onOpen: (item: ChallengeSummary) => void }) {
  const banners = [
    { label: 'START FROM ZERO', title: '처음 배우는 보안도\nFlagBox와 함께.', description: '복잡한 이론보다 쉬운 문제부터. 직접 풀며 기초를 익혀 보세요.', action: '첫 문제 풀어보기', onClick: onExplore },
    { label: 'DAILY PRACTICE', title: '하루 한 문제로\n가볍게 시작해요.', description: '짧은 도전이 모여 실력이 됩니다. 오늘의 학습 기록을 남겨 보세요.', action: '워게임 둘러보기', onClick: onExplore },
    { label: 'ASK AND GROW', title: '혼자 고민하지 말고\n함께 배워요.', description: '커뮤니티에서 질문하고, 다른 학습자의 풀이 경험도 만나 보세요.', action: '커뮤니티 둘러보기', onClick: onRanking },
    { label: 'BEGINNER WARGAME', title: '보안은, 직접 풀어보면\n더 쉬워집니다.', description: '처음부터 차근차근. 부담 없이 시작하는 FlagBox 워게임입니다.', action: '첫 문제 풀어보기', onClick: onExplore },
    { label: 'LEARN AT YOUR PACE', title: '막혀도 괜찮아요.\n힌트가 함께해요.', description: '문제를 읽고, 단서를 찾고, 필요한 순간에는 힌트를 사용해 보세요.', action: '워게임 둘러보기', onClick: onExplore },
    { label: 'KEEP THE MOMENTUM', title: '오늘의 작은 풀이가\n내일의 실력이 돼요.', description: '매일의 도전과 학습 기록을 FlagBox에서 이어가 보세요.', action: '랭킹 둘러보기', onClick: onRanking },
  ]
  const englishBanners = [
    { label: 'START FROM ZERO', title: 'New to security?\nStart with FlagBox.', description: 'Skip the jargon. Build the fundamentals by solving safe, approachable problems.', action: 'Solve your first challenge', onClick: onExplore },
    { label: 'DAILY PRACTICE', title: 'One challenge a day.\nA great place to start.', description: 'Small and safe practice sessions add up. Keep track of today’s learning.', action: 'Browse wargames', onClick: onExplore },
    { label: 'ASK AND GROW', title: 'Do not get stuck alone.\nLearn together.', description: 'Ask questions in the community and learn from other learners’ experiences.', action: 'Visit community', onClick: onRanking },
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
  return <div className="page home-page"><section className="hero-section hero-banner" aria-roledescription="carousel" aria-label="FlagBox 안내 배너"><div className="hero-banner-content"><p className="eyebrow">{banner.label}</p><h1>{banner.title.split('\n').map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h1><p>{banner.description}</p><button className="button primary" type="button" onClick={banner.onClick}>{banner.action}</button></div><div className="hero-banner-dots" role="tablist" aria-label="배너 선택">{banners.map((item, index) => <button key={item.label} className={index === activeBanner ? 'active' : ''} type="button" role="tab" aria-selected={index === activeBanner} aria-label={`${index + 1}번 배너`} onClick={() => setActiveBanner(index)} />)}</div></section><section className="stat-strip" aria-label="플랫폼 현황"><Stat value={stats.challenges} label="워게임 문제" detail="천천히 도전해 보세요" /><Stat value={stats.solves} label="문제 해결" detail="함께 쌓은 기록" /><Stat value={stats.users} label="학습 중인 사람" detail="FlagBox 동료" /><div className="live-badge">함께 배우는 중</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>지금 도전할 문제</h2></div><button type="button" className="text-link" onClick={onExplore}>워게임 전체 보기</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
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
  const [tab, setTab] = useState<'shop' | 'missions' | 'collection'>('shop')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
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
  const shop = items.filter((item) => item.source === 'STORE')
  const collection = items.filter((item) => item.owned)
  return <div className="vault-backdrop" role="dialog" aria-modal="true" aria-label="Cipher Vault"><section className="cipher-vault vault-redesign"><header className="vault-header"><div><p className="eyebrow">CIPHER VAULT // PERSONAL LOADOUT</p><h2>Red Ruby Exchange</h2><p>Trade earned rubies for frames, accents, titles, and hint credits.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="Close Cipher Vault">×</button></header>{!summary ? <LoadingState label="Loading your collection..." /> : <><div className="vault-wallet vault-wallet-redesigned"><div className="ruby-wallet"><span className="ruby-gem" aria-hidden="true" /><strong>{summary.gems}</strong><small>Red Rubies</small></div><div className="vault-balance"><strong>{summary.hintCredits}</strong><small>Hint Credits</small></div><div className="vault-admin-status">{user.role === 'ADMIN' ? 'ADMIN ACCESS · UNLIMITED INVENTORY' : 'Earn rubies through attendance and missions'}</div></div><nav className="vault-tabs" aria-label="Cipher Vault sections"><button className={tab === 'shop' ? 'active' : ''} type="button" onClick={() => setTab('shop')}>Exchange</button><button className={tab === 'missions' ? 'active' : ''} type="button" onClick={() => setTab('missions')}>Missions</button><button className={tab === 'collection' ? 'active' : ''} type="button" onClick={() => setTab('collection')}>My loadout</button></nav>{tab === 'shop' && <div className="vault-grid item-grid vault-shop-grid">{shop.map((item) => <article className={`vault-card item-card vault-shop-card ${item.equipped ? 'equipped' : ''}`} key={item.id}><span className="vault-kicker">{item.type === 'CREDIT' ? 'UTILITY' : item.type}</span><div className="vault-item-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◇' : '✦'}</div><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span className="ruby-price"><span className="ruby-gem small" aria-hidden="true" />{item.gemCost}</span><button className="button primary" type="button" disabled={(!item.consumable && item.owned) || busy === item.id || (user.role !== 'ADMIN' && summary.gems < item.gemCost)} onClick={() => void run(item.id, () => api.buyVaultItem(item.id))}>{item.consumable ? 'Add credit' : item.owned ? 'Owned' : 'Acquire'}</button></div></article>)}</div>}{tab === 'missions' && <div className="vault-grid mission-grid">{summary.missions.map((mission) => <article className={`vault-card mission-card ${mission.completed ? 'complete' : ''}`} key={mission.id}><div className="vault-card-icon">{mission.completed ? '✓' : '◌'}</div><div><span className="vault-kicker">DAILY MISSION</span><h3>{mission.name}</h3><p>{mission.description}</p></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void run(mission.id, () => api.claimVaultMission(mission.id))}>{mission.completed ? 'Claimed' : mission.eligible ? 'Claim reward' : 'In progress'}</button></article>)}</div>}{tab === 'collection' && <div className="vault-grid item-grid vault-shop-grid">{collection.map((item) => <article className={`vault-card item-card vault-shop-card ${item.equipped ? 'equipped' : ''}`} key={item.id}><span className="vault-kicker">{item.type}</span><div className="vault-item-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◇' : '✦'}</div><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span>{item.equipped ? 'Currently equipped' : 'Ready to equip'}</span><button className="button secondary" type="button" disabled={busy === item.id} onClick={() => void run(item.id, () => api.equipVaultItem(item.id))}>{item.equipped ? 'Detach' : 'Equip'}</button></div></article>)}</div>}{collection.length === 0 && tab === 'collection' && <div className="vault-empty"><h3>Your loadout is empty.</h3><p>Acquire a profile frame, accent, or title from the exchange.</p></div>}{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function VaultItems({ items, gems = 0, fragments = 0, busy, action, actionLabel }: { items: VaultCosmetic[]; gems?: number; fragments?: number; busy: string | null; action: (item: VaultCosmetic) => Promise<void>; actionLabel: string }) {
  if (items.length === 0) return <div className="vault-empty"><span>◇</span><h3>Nothing here yet.</h3><p>Complete missions to fill this collection.</p></div>
  return <div className="vault-grid item-grid">{items.map((item) => { const canAfford = item.source === 'STORE' ? gems >= item.gemCost : item.source === 'CRAFT' ? fragments >= item.fragmentCost : true; const disabled = item.owned && actionLabel !== 'Equip' || !canAfford || busy === item.id; const hasArt = ['blue_terminal_frame', 'violet_circuit_frame', 'signal_orbit', 'vault_key', 'neon_cipher_frame', 'spectral_core'].includes(item.id); return <article className={`vault-card item-card ${hasArt ? 'has-art' : ''} ${item.hidden ? 'hidden-item' : ''} ${item.equipped ? 'equipped' : ''}`} key={item.id}>{hasArt ? <div className={`item-art art-${item.id}`} style={{ backgroundImage: `url(${cipherVaultRelics})` }} aria-hidden="true" /> : <div className="item-emblem">{item.type === 'FRAME' ? '▣' : item.type === 'TITLE' ? '✦' : '◈'}</div>}<span className="vault-kicker">{item.hidden ? 'CLASSIFIED' : item.source}</span><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span>{item.source === 'STORE' ? `◈ ${item.gemCost}` : item.source === 'CRAFT' ? `◇ ${item.fragmentCost}` : item.type === 'TITLE' ? 'Quest reward' : 'Secret unlock'}</span><button className="button secondary" type="button" disabled={disabled} onClick={() => void action(item)}>{item.equipped ? 'Equipped' : item.owned && actionLabel !== 'Equip' ? 'Owned' : actionLabel}</button></div></article> })}</div>
}

function Stat({ value, label, detail }: { value: number; label: string; detail: string }) { return <div className="stat"><strong>{value}</strong><div><span>{label}</span><small>{detail}</small></div></div> }
function cosmeticLabel(id: string) { return id.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') }
function titleTone(id: string) { return ['beginner', 'rookie', 'junior', 'senior', 'veteran', 'master', 'root'].includes(id.toLowerCase()) ? `tier-title-${id.toLowerCase()}` : '' }
function ChallengeRow({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(item)}><span className={`category-mark ${item.category.toLowerCase()}`} /><span className="row-main"><strong>{item.title}</strong><small>{item.category} · {item.difficulty}</small></span><span className="row-meta"><b>{item.score} pts</b>{item.solved && <span className="solved">SOLVED</span>}</span></button> }

function ChallengesView({ items, total, category, onCategory, difficulty, onDifficulty, onOpen }: { items: ChallengeSummary[]; total: number; category: Filter; onCategory: (value: Filter) => void; difficulty: DifficultyFilter; onDifficulty: (value: DifficultyFilter) => void; onOpen: (item: ChallengeSummary) => void }) {
  return <div className="page"><PageIntro eyebrow="WARGAME" title="어떤 문제부터 풀어볼까요?" description="부담 없이 골라보고, 막히면 힌트를 사용해 보세요." /><section className="challenge-toolbar"><div className="filter-tabs" aria-label="카테고리">{(['ALL', 'WEB', 'FORENSIC', 'REVERSING'] as Filter[]).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item === 'ALL' ? '전체' : item}</button>)}</div><div className="filter-tabs difficulty-tabs" aria-label="난이도">{(['ALL', 'EASY', 'MEDIUM', 'HARD'] as DifficultyFilter[]).map((item) => <button key={item} className={difficulty === item ? 'filter-tab active diff-' + item.toLowerCase() : 'filter-tab diff-' + item.toLowerCase()} type="button" onClick={() => onDifficulty(item)}>{item === 'ALL' ? '모든 난이도' : item}</button>)}</div></section><div className="challenge-count"><span>전체 <strong>{total}</strong>개 중 <strong>{items.length}</strong>개 문제</span></div><div className="challenge-grid">{items.map((item) => <ChallengeCard key={item.id} item={item} onOpen={onOpen} />)}</div>{items.length === 0 && <EmptyState />}</div>
}

function ChallengeCard({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <article className="challenge-card"><div className="card-top"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h3>{item.title}</h3><p>문제를 읽고, 차근차근 단서를 찾아 FLAG를 제출해 보세요.</p><div className="card-bottom"><strong>{item.score}<small>점</small></strong>{item.solved && <span className="solved">해결 완료</span>}<button className="card-open" type="button" onClick={() => onOpen(item)}>{item.solved ? '다시 보기' : '문제 열기'}</button></div></article> }

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
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p></section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
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
  const [hintCredits, setHintCredits] = useState<number | null>(null)
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
    if (!loggedIn || !item?.hintAvailable) return
    let active = true
    api.vault().then((summary) => { if (active) setHintCredits(summary.hintCredits) }).catch(() => undefined)
    return () => { active = false }
  }, [loggedIn, item?.hintAvailable])
  if (loadError) return <div className="page"><p className="alert error">{loadError}</p><button type="button" className="button secondary" onClick={onBack}>← Back to challenges</button></div>
  if (!item) return <div className="page"><LoadingState label="Opening challenge..." /></div>
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setAwarded(null)
    try { const result = await api.submitFlag(item.id, flag.trim()); if (result.result === 'correct') { setMessage('Correct!'); setAwarded(result.awardedScore) } else if (result.result === 'already_solved') { setMessage('You have already solved this challenge.') } else { setMessage(result.result) } setFlag(''); onSubmitted() } catch (cause) { const reason = cause instanceof Error ? cause.message : ''; setError(/rate|limit|too many/i.test(reason) ? 'Too many attempts. Please wait a moment and try again.' : /connect|network|failed/i.test(reason) ? reason || 'Submission failed.' : 'Not the correct flag. Double-check the format and try again.') }
  }
  const revealHint = async () => {
    try { setHintBusy(true); setError(''); const result = await api.challengeHint(item.id); setHint(result.hint); setHintCredits(result.remainingCredits) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reveal the hint.') } finally { setHintBusy(false) }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p>{loggedIn && item.hintAvailable && <div className="hint-panel"><div><strong>Need a nudge?</strong><small>Reveal a hint for {item.hintCost} credit{item.hintCost === 1 ? '' : 's'}.</small>{hintCredits !== null && (hintCredits < item.hintCost ? <small>Not enough hint credits.</small> : <small> · {hintCredits} <span>credits</span></small>)}</div><button type="button" className="button secondary" disabled={hintBusy || hint !== null || (hintCredits !== null && hintCredits < item.hintCost)} onClick={() => void revealHint()}>{hint ? 'Hint revealed' : 'Reveal hint'}</button>{hint && <p>{hint}</p>}</div>}</section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}{awarded !== null && <> +{awarded} <span>points</span></>}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
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
  return <div className="page"><PageIntro eyebrow="RANKING" title="함께 쌓아가는 기록" description={section === 'score' ? '문제를 해결하며 쌓은 점수와 기록이에요.' : '매일 학습을 이어온 꾸준한 기록이에요.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>점수 랭킹</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>출석 랭킹</button></div><section className="panel ranking-panel"><div className="ranking-head"><span>순위</span><span>학습자</span><span>{section === 'score' ? '해결' : '누적'}</span><span>{section === 'score' ? '점수' : '연속'}</span></div>{visibleRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><RankIdentity row={row} /><span>{section === 'score' ? (row as RankingRow).solvedCount : `${(row as AttendanceRankingRow).totalDays}일`}</span><b>{section === 'score' ? (row as RankingRow).score : `${(row as AttendanceRankingRow).currentStreak}일`}</b></div>)}{visibleRows.length === 0 && <EmptyState />}</section></div>
}

function RankIdentity({ row }: { row: Pick<RankingRow, 'username' | 'nickname' | 'avatarUrl' | 'equippedFrame' | 'equippedAccessory' | 'equippedTitle' | 'tier'> }) {
  const name = row.nickname || row.username
  return <button className="operator public-profile-trigger" type="button" onClick={() => openPublicProfile(row.username)} aria-label={`${name} profile`}><span className={`mini-avatar ranking-avatar ${row.equippedFrame ? `equipped-${row.equippedFrame}` : ''}`}>{row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : name.slice(0, 2).toUpperCase()}</span><span className="ranking-identity"><strong>{name}{row.equippedAccessory && <i className="profile-accessory" aria-label={cosmeticLabel(row.equippedAccessory)}>◈</i>}</strong><TierEmblem tier={row.tier} />{row.equippedTitle && <small className={row.equippedTitle.toLowerCase() === 'super_user' ? 'ranking-title super-user-title' : `ranking-title ${titleTone(row.equippedTitle)}`}>{cosmeticLabel(row.equippedTitle)}</small>}</span></button>
}

function TierEmblem({ tier }: { tier: string }) {
  const label = tierLabel(tier).toUpperCase()
  return <span className={`tier-emblem tier-emblem-${tier}`} aria-label={`${label} tier`}>{label}</span>
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
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [error, setError] = useState('')
  const [avatarRevision, setAvatarRevision] = useState(() => Date.now())
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async () => {
    const [profileResult, friendsResult, attendanceResult] = await Promise.allSettled([api.profile(), api.friends(), api.attendance()])
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    else setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load profile.')
    if (friendsResult.status === 'fulfilled') setFriends(friendsResult.value)
    else setError(friendsResult.reason instanceof Error ? friendsResult.reason.message : 'Could not load friends.')
    if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value)
    else setError(attendanceResult.reason instanceof Error ? attendanceResult.reason.message : 'Could not load attendance.')
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
        if (message.sender !== selectedFriend) return
        setMessages((currentMessages) => currentMessages.some((item) => item.id === message.id) ? currentMessages : [...currentMessages, message])
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
    <section className="profile-layout"><div>{attendance && <section className="panel attendance-panel"><div className="attendance-heading"><div><p className="eyebrow">DAILY OPERATIONS</p><h2>Attendance</h2></div><button type="button" className="button primary" disabled={attendance.checkedInToday} onClick={() => void checkIn()}>{attendance.checkedInToday ? 'Checked in today' : 'Check in today'}</button></div><div className="attendance-stats"><div><strong>{attendance.currentStreak}</strong><small>Current streak</small></div><div><strong>{attendance.longestStreak}</strong><small>Longest streak</small></div><div><strong>{attendance.totalDays}</strong><small>Total days</small></div></div><label className="attendance-title-select">Profile title<select value={attendance.activeTitle ?? ''} onChange={selectTitle} disabled={attendance.earnedTitles.length === 0}><option value="" disabled>Earn a title to equip it</option>{attendance.earnedTitles.map((title) => <option key={title.id} value={title.id}>{title.name} · {title.requirement}</option>)}</select></label><div className="attendance-badges">{attendance.badges.map((badge) => <span className="attendance-badge" key={badge.id} title={badge.description}>✦ {badge.name}</span>)}</div></section>}<section className="panel profile-editor"><h2>Customize profile</h2><form onSubmit={(event) => void saveProfile(event)}><label>Display name<input name="nickname" defaultValue={current.nickname} maxLength={80} /></label><label>Status message<textarea name="statusMessage" defaultValue={current.statusMessage || ''} maxLength={160} placeholder="What are you working on?" /></label><button className="button primary" type="submit">Save profile</button></form><button className="button secondary profile-vault-button" type="button" onClick={onVault}>Open Cipher Vault</button></section><section className="content-section"><button className="button secondary" type="button" onClick={onChallenges}>Browse challenges</button></section></div><aside className="social-panel"><h2>Friends</h2><form className="friend-request" onSubmit={(event) => void addFriend(event)}><input name="username" placeholder="Account username (e.g. @player_1)" minLength={3} maxLength={51} autoComplete="off" required /><button className="button primary" type="submit">Add</button></form><div className="friend-list">{friends.length === 0 && <p className="muted">No friends yet.</p>}{friends.map((friend) => <div className="friend-row" key={friend.username}><button type="button" onClick={() => friend.relationshipStatus === 'ACCEPTED' && setSelectedFriend(friend.username)}><span className="mini-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}</strong><small>@{friend.username} · {friend.relationshipStatus}</small></span></button>{friend.incomingRequest ? <button type="button" className="button secondary" onClick={async () => { try { await api.acceptFriend(friend.username); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not accept request.') } }}>Accept</button> : <button type="button" className="text-link" onClick={async () => { if (!window.confirm('Remove this friend?')) return; try { await api.removeFriend(friend.username); if (selectedFriend === friend.username) setSelectedFriend(null); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove friend.') } }}>Remove</button>}</div>)}</div>{selectedFriend && <section className="message-panel"><h3>Message @{selectedFriend}</h3><div className="message-list">{messages.map((message) => <article className={message.sender === current.username ? 'message sent' : 'message received'} key={message.id}><span>{message.content}</span>{message.sender === current.username && <div className="message-actions"><button type="button" onClick={() => void editMessage(message)}>Edit</button><button type="button" onClick={() => void deleteMessage(message)}>Delete</button></div>}</article>)}</div><form onSubmit={(event) => void sendMessage(event)}><textarea name="content" maxLength={2000} required placeholder="Write a private message" /><button className="button primary" type="submit">Send</button></form></section>}</aside></section>
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
      onFriendship: (friendship) => setFriends((current) => {
        const exists = current.some((item) => item.username === friendship.username)
        return exists ? current.map((item) => item.username === friendship.username ? friendship : item) : [...current, friendship]
      }),
    })
  }, [selectedFriend, upsertMessage, user])
  useEffect(() => {
    if (messages.length) messageList.current?.scrollTo({ top: messageList.current.scrollHeight, behavior: 'smooth' })
  }, [messages])
  if (!user) return <div className="page"><PageIntro eyebrow="FRIENDS" title="Sign in to message your friends." description="Friend requests and private messages are available after sign-in." /><button className="button primary" type="button" onClick={onLogin}>Sign in</button></div>
  const addFriend = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const username = String(new FormData(form).get('username')).trim(); try { await api.requestFriend(username); await refresh(); form.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send friend request.') } }
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedFriend) return; const form = event.currentTarget; try { upsertMessage(await api.sendMessage(selectedFriend, String(new FormData(form).get('content')))); form.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send message.') } }
  const editMessage = async (message: DirectMessage) => { const content = window.prompt('Edit message', message.content)?.trim(); if (!content || content === message.content) return; try { upsertMessage(await api.updateMessage(message.id, content)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not edit message.') } }
  const deleteMessage = async (message: DirectMessage) => { if (!window.confirm('Delete this message?')) return; try { await api.deleteMessage(message.id); setMessages((current) => current.filter((item) => item.id !== message.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete message.') } }
  return <div className="page friends-page"><PageIntro eyebrow="FRIENDS & MESSAGES" title="Friends" description="Add fellow learners and keep the conversation private." /><section className="social-panel"><form className="friend-request" onSubmit={(event) => void addFriend(event)}><input name="username" placeholder="Account username (e.g. @player_1)" minLength={3} maxLength={80} autoComplete="off" required /><button className="button primary" type="submit">Add</button></form><div className="friend-list">{friends.length === 0 && <p className="muted">No friends yet.</p>}{friends.map((friend) => <div className="friend-row" key={friend.username}><button type="button" onClick={() => friend.relationshipStatus === 'ACCEPTED' && setSelectedFriend(friend.username)}><span className="mini-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}</strong><small>@{friend.username} · {friend.relationshipStatus}</small></span></button>{friend.incomingRequest ? <button type="button" className="button secondary" onClick={() => void api.acceptFriend(friend.username).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not accept request.'))}>Accept</button> : <button type="button" className="text-link" onClick={() => { if (!window.confirm('Remove this friend?')) return; void api.removeFriend(friend.username).then(() => { if (selectedFriend === friend.username) setSelectedFriend(null); return refresh() }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not remove friend.')) }}>Remove</button>}</div>)}</div>{selectedFriend && <section className="message-panel"><h3>Message @{selectedFriend}</h3><div className="message-list" ref={messageList}>{messages.map((message) => <article className={message.sender === user.username ? 'message sent' : 'message received'} key={message.id}><span>{message.content}</span>{message.sender === user.username && <div className="message-meta"><small>{message.read ? 'Read' : 'Sent'}</small><div className="message-actions"><button type="button" onClick={() => void editMessage(message)}>Edit</button><button type="button" onClick={() => void deleteMessage(message)}>Delete</button></div></div>}</article>)}</div><form onSubmit={(event) => void sendMessage(event)}><textarea name="content" maxLength={2000} required placeholder="Write a private message" /><button className="button primary" type="submit">Send</button></form></section>}</section>{error && <p className="alert error">{error}</p>}</div>
}

function EnhancedCommunityView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [category, setCategory] = useState<CommunityCategory | undefined>()
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

type AdminTab = 'overview' | 'accounts' | 'content' | 'notices' | 'security' | 'logs'

function AdminConsole() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [tab, setTab] = useState<AdminTab>('overview')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [nextDashboard, nextPosts, nextComments] = await Promise.all([
        api.adminDashboard(),
        api.adminPosts(),
        api.adminComments(),
      ])
      setDashboard(nextDashboard)
      setPosts(nextPosts)
      setComments(nextComments)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load administrator data.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

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
  const removePost = async (id: number, title: string) => {
    if (!window.confirm(`Delete “${title}”?`)) return
    try { await api.deleteAdminPost(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the post.') }
  }
  const removeComment = async (id: number) => {
    if (!window.confirm('Delete this comment?')) return
    try { await api.deleteAdminComment(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the comment.') }
  }
  const publishNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api.publishNotice({ title: String(form.get('title')).trim(), content: String(form.get('content')).trim() })
      event.currentTarget.reset()
      await refresh()
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

  if (!dashboard) return <div className="page admin-page"><PageIntro eyebrow="ADMIN CONSOLE" title="Administrator console" description="Loading platform status and moderation controls." />{error && <p className="alert error">{error}</p>}<p className="muted">Loading administrator data...</p></div>

  const notices = posts.filter((post) => post.category === 'NOTICE')
  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts', count: dashboard.users.length },
    { id: 'content', label: 'Content', count: posts.length + comments.length },
    { id: 'notices', label: 'Notices', count: notices.length },
    { id: 'security', label: 'Security', count: dashboard.antiCheatEvents.length },
    { id: 'logs', label: 'Audit logs', count: dashboard.auditLogs.length + dashboard.securityEvents.length },
  ]

  return <div className="page admin-page admin-console">
    <PageIntro eyebrow="ADMIN CONSOLE" title="Run the platform clearly." description="Manage accounts, community content, notices, and security records in focused workspaces." />
    {error && <p className="alert error">{error}</p>}
    <div className="admin-summary-grid">
      <div><small>ACTIVE ACCOUNTS</small><strong>{dashboard.users.filter((item) => item.status === 'ACTIVE').length}</strong></div>
      <div><small>CONTENT RECORDS</small><strong>{posts.length + comments.length}</strong></div>
      <div><small>SECURITY EVENTS</small><strong>{dashboard.antiCheatEvents.length}</strong></div>
      <div><small>RECENT SUBMISSIONS</small><strong>{dashboard.recentSubmissions.length}</strong></div>
    </div>
    <div className="admin-tabs" role="tablist">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(item.id)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}
    </div>

    {tab === 'overview' && <div className="admin-panel-grid">
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Operations shortcuts</h2></div></div><div className="admin-quick-actions"><button type="button" className="button secondary" onClick={() => setTab('accounts')}>Review accounts</button><button type="button" className="button secondary" onClick={() => setTab('content')}>Manage content</button><button type="button" className="button primary" onClick={() => setTab('notices')}>Write a notice</button></div></section>
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent submissions</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminSubmissionList items={dashboard.recentSubmissions.slice(0, 5)} /></section>
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY</p><h2>Events to review</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminEventList items={dashboard.antiCheatEvents.slice(0, 5)} /></section>
    </div>}

    {tab === 'accounts' && <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h2>Account management</h2></div><small>Edit names, suspend, restore, or delete accounts. Deleted accounts keep a private restore snapshot.</small></div><div className="admin-table">{dashboard.users.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.role} · {item.status}</small>{item.suspensionReason && <small className="danger-text">Suspension reason: {item.suspensionReason}</small>}</div>{item.role !== 'ADMIN' && <div className="inline-actions">{item.status !== 'DELETED' && <button type="button" className="button secondary" onClick={() => void editUser(item.id, item.nickname)}>Edit name</button>}{item.status === 'ACTIVE' ? <button type="button" className="button ghost danger-button" onClick={() => void suspend(item.id)}>Suspend</button> : <button type="button" className="button secondary" onClick={() => void api.reinstateUser(item.id).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not restore the account.'))}>{item.status === 'DELETED' ? 'Restore account' : 'Restore'}</button>}{item.status !== 'DELETED' && <button type="button" className="text-button danger-text" onClick={() => void deactivate(item.id, item.username)}>Delete account</button>}</div>}</div>)}</div></section>}

    {tab === 'content' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMUNITY POSTS</p><h2>Post management</h2></div><small>Latest {posts.length}</small></div><div className="admin-table">{posts.filter((post) => post.category !== 'NOTICE').map((post) => <div className="admin-row" key={post.id}><div><strong>{post.title}</strong><small><Badge tone={post.category}>{post.category}</Badge> @{post.authorNickname || post.author} · {post.commentCount} comments · {new Date(post.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(post.id, post.title)}>Delete</button></div>)}</div></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMENTS</p><h2>Comment management</h2></div><small>Latest {comments.length}</small></div><div className="admin-table">{comments.map((comment) => <div className="admin-row" key={comment.id}><div><strong>{comment.content}</strong><small>“{comment.postTitle}” · @{comment.authorNickname || comment.author} · {new Date(comment.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removeComment(comment.id)}>Delete</button></div>)}</div></section></div>}

    {tab === 'notices' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISH NOTICE</p><h2>Write a new notice</h2></div></div><form className="community-editor admin-notice-form" onSubmit={(event) => void publishNotice(event)}><input name="title" placeholder="Notice title" maxLength={200} required /><textarea name="content" placeholder="Write the notice content" maxLength={20000} required /><div><button className="button primary" type="submit">Publish notice</button></div></form></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISHED</p><h2>Published notices</h2></div><small>{notices.length} total</small></div><div className="admin-table">{notices.map((notice) => <div className="admin-row" key={notice.id}><div><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(notice.id, notice.title)}>Delete</button></div>)}</div></section></div>}

    {tab === 'security' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ANTI-CHEAT</p><h2>Security events</h2></div><small>Latest {dashboard.antiCheatEvents.length}</small></div><AdminEventList items={dashboard.antiCheatEvents} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">CHALLENGE ACTIVITY</p><h2>Submission history</h2></div><small>Latest {dashboard.recentSubmissions.length}</small></div><AdminSubmissionList items={dashboard.recentSubmissions} /></section></div>}

    {tab === 'logs' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY LOG</p><h2>Login and account events</h2></div></div><LogList items={dashboard.securityEvents.map((event) => ({ id: event.id, title: `${event.eventType} · ${event.username || event.subject || 'unknown'}`, detail: event.detail || '', date: event.createdAt }))} onControl={(id, hide) => void controlLog('security', id, hide)} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Administrator activity</h2></div></div><LogList items={dashboard.auditLogs.map((log) => ({ id: log.id, title: `${log.action} · ${log.adminUsername}`, detail: log.detail, date: log.createdAt }))} onControl={(id, hide) => void controlLog('audit', id, hide)} /></section></div>}
  </div>
}

function AdminSubmissionList({ items }: { items: AdminDashboard['recentSubmissions'] }) {
  if (items.length === 0) return <p className="muted">No records yet.</p>
  return <div className="admin-table">{items.map((item, index) => <div className="admin-row" key={`${item.username}-${item.submittedAt}-${index}`}><div><strong>@{item.username}</strong><small>{item.challengeTitle} · {new Date(item.submittedAt).toLocaleString()}</small></div><span className={item.correct ? 'success-text' : 'danger-text'}>{item.correct ? 'Correct' : 'Incorrect'}</span></div>)}</div>
}

function AdminEventList({ items }: { items: AdminDashboard['antiCheatEvents'] }) {
  if (items.length === 0) return <p className="muted">No security events to review.</p>
  return <div className="admin-table">{items.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.eventType} · @{item.username}</strong><small>{item.challengeTitle || 'Platform'} · {item.detail || 'No additional details'} · {new Date(item.createdAt).toLocaleString()}</small></div><span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span></div>)}</div>
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
  if (items.length === 0) return <p className="muted">No records yet.</p>
  return <div className="admin-table">{items.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.title}</strong><small>{item.detail} · {new Date(item.date).toLocaleString()}</small></div><div className="inline-actions"><button className="button secondary" type="button" onClick={() => onControl(item.id, false)}>Redact</button><button className="button ghost danger-button" type="button" onClick={() => onControl(item.id, true)}>Hide</button></div></div>)}</div>
}

function LoginView({ onBack, onAuth }: { onBack: () => void; onAuth: (result: { token: string; user: User }) => void }) {
  const location = useLocation()
  const [registering, setRegistering] = useState(false)
  const oauthError = oauthErrorMessage(new URLSearchParams(location.search).get('oauthError'))
  const sessionExpired = new URLSearchParams(location.search).get('sessionExpired') === '1'
  const [error, setError] = useState(sessionExpired ? sessionExpiredMessage : oauthError)
  const [errorCause, setErrorCause] = useState({ oauthError, sessionExpired })
  if (errorCause.oauthError !== oauthError || errorCause.sessionExpired !== sessionExpired) {
    setErrorCause({ oauthError, sessionExpired })
    setError(sessionExpired ? sessionExpiredMessage : oauthError)
  }
  const [providers, setProviders] = useState<string[]>([])
  useEffect(() => {
    api.oauthProviders().then(setProviders).catch(() => setProviders(['google', 'github', 'discord']))
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget)
    const username = String(form.get('username')).trim(); const password = String(form.get('password')); const passwordConfirmation = String(form.get('passwordConfirmation')); if (registering && password !== passwordConfirmation) { setError('Passwords do not match.'); return } try { const result = registering ? await api.register({ username, nickname: String(form.get('nickname')).trim(), password, passwordConfirmation }) : await api.login({ username, password }); onAuth(result) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed.') }
  }
  return <div className="auth-page"><div className="auth-card"><button className="back-link" type="button" onClick={onBack}>← Back home</button><p className="eyebrow">SECURE ACCESS</p><h1>{registering ? 'Create your account.' : 'Sign in to continue.'}</h1><form className="auth-form" onSubmit={submit}><label>Username<input name="username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" title="Use only letters, numbers, and underscores." autoComplete="username" /></label>{registering && <label>Display name (optional)<input name="nickname" maxLength={80} /></label>}<label>Password<input name="password" type="password" required minLength={registering ? 8 : undefined} maxLength={100} autoComplete={registering ? 'new-password' : 'current-password'} /></label>{registering && <label>Confirm password<input name="passwordConfirmation" type="password" required minLength={8} maxLength={100} autoComplete="new-password" /></label>}<button className="button primary" type="submit">{registering ? 'Create account' : 'Sign in'}</button></form>{error && <p className="alert error">{error}</p>}{providers.length > 0 && <><div className="auth-divider"><span>or continue with</span></div><div className="social-buttons">{providers.map((provider) => <button className={`social-button oauth-${provider}`} type="button" key={provider} onClick={() => { window.location.href = `${oauthBaseUrl}/api/auth/oauth/${provider}/authorize` }}><ProviderIcon provider={provider} /><span>Continue with {provider[0].toUpperCase() + provider.slice(1)}</span></button>)}</div></>}<p className="auth-footnote">{registering ? 'Already have an account?' : 'New to Mini CTF?'} <button type="button" onClick={() => setRegistering(!registering)}>{registering ? 'Sign in' : 'Create an account'}</button></p></div></div>
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
