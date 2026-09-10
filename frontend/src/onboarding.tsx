import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

type Lang = 'ko' | 'en'
type LocalizedText = { title: string; body: string; action: string }
type Step = { path?: string; selector?: string; quickMenu?: 'trigger' | 'content'; ko: LocalizedText; en: LocalizedText }

function buildTutorialSteps(firstChallengeId?: number, scope: 'public' | 'member' | 'authenticated' = 'public', authenticated = false): Step[] {
  if (scope === 'authenticated') {
    const publicSteps = buildTutorialSteps(firstChallengeId, 'public')
    const memberSteps = buildTutorialSteps(undefined, 'member')
    const continuedMemberSteps = memberSteps.map((step, index) => index === memberSteps.length - 1
      ? { ...step, ko: { ...step.ko, action: '다음' }, en: { ...step.en, action: 'Next' } }
      : step)
    const workbenchSteps: Step[] = [
      {
        path: firstChallengeId ? `/challenges/${firstChallengeId}` : '/challenges',
        selector: '.challenge-workbench',
        ko: { title: 'FlagBox 안에서 바로 분석하기', body: '문제 파일을 브라우저에서 열고, 이 문제에 실제로 필요한 변환 버튼만 사용해 FLAG를 찾아보세요. 고급 역산 문제에는 안전한 코드 연습장도 나타납니다.', action: '다음' },
        en: { title: 'Analyze inside FlagBox', body: 'Open the artifact in your browser and use only the transformation tools suggested for this challenge. Advanced reversing tasks also provide a sandboxed code workspace.', action: 'Next' },
      },
      {
        selector: '.workbench-file-actions',
        ko: { title: '브라우저 미리보기를 먼저 사용해요', body: '브라우저에서 열기를 누르면 텍스트 또는 HEX로 바로 확인할 수 있어요. 별도 프로그램이 꼭 필요한 경우에만 다운로드를 사용하세요.', action: 'FlagBox 시작!' },
        en: { title: 'Start with the browser preview', body: 'Open artifacts directly as text or HEX. Download them only when a challenge truly needs a separate program.', action: "Let's go!" },
      },
    ]
    return [...publicSteps.slice(0, -1), ...continuedMemberSteps, ...workbenchSteps]
  }
  if (scope === 'member') {
    return [
      { path: '/profile', selector: '.profile-stats', ko: { title: '내 학습 기록', body: '점수, 해결한 문제 수, 현재 순위를 여기서 바로 확인해요.', action: '다음' }, en: { title: 'Your learning record', body: 'See your score, solved challenges, and current rank at a glance.', action: 'Next' } },
      { selector: '.my-profile-calendar', ko: { title: '학습 · 출석 달력', body: '문제 풀이 수와 출석 기록을 한 달력에서 함께 확인해요. 오늘 미출석이면 어느 페이지에서든 출석 팝업이 한 번 표시됩니다.', action: '다음' }, en: { title: 'Learning & attendance calendar', body: 'See solves and attendance in one calendar. If you have not checked in today, a single check-in prompt appears wherever you are.', action: 'Next' } },
      { selector: '.profile-edit-line--name', ko: { title: '프로필 정보 수정', body: '닉네임과 상태 메시지 옆 연필 버튼을 누르면 바로 수정할 수 있어요. 저장하면 랭킹과 커뮤니티에도 반영됩니다.', action: '다음' }, en: { title: 'Edit your profile', body: 'Use the pencil beside your nickname or status message to edit it directly. Changes appear in rankings and community too.', action: 'Next' } },
      { path: '/friends', selector: '.friend-request', ko: { title: '친구 추가하기', body: '상대방의 계정 아이디를 입력해 친구 요청을 보낼 수 있어요.', action: '다음' }, en: { title: 'Add friends', body: 'Enter a learner’s account username to send a friend request.', action: 'Next' } },
      { selector: '.friend-list', ko: { title: '친구와 DM', body: '요청을 수락하면 이 목록에서 친구 프로필을 보고 개인 메시지를 보낼 수 있어요.', action: '마치기' }, en: { title: 'Friends & DMs', body: 'After a request is accepted, use this list to view profiles and send private messages.', action: 'Finish' } },
    ]
  }
  const detailSteps: Step[] = [
        {
          path: firstChallengeId ? `/challenges/${firstChallengeId}` : '/challenges',
          selector: '.problem-panel',
          ko: {
            title: '문제 지문(BRIEF)',
            body: '문제의 배경과 목표가 여기 적혀 있어요. 처음엔 읽기만 해도 충분해요.',
            action: '다음',
          },
          en: {
            title: 'The brief',
            body: 'The background and goal of the challenge live here. Just read it slowly for now.',
            action: 'Next',
          },
        },
        {
          selector: '.guide-toggle',
          ko: {
            title: '📚 학습 가이드가 곁에 있어요',
            body: '막히면 이 버튼! 콘셉트 → 준비물 → 풀이 순서를 초보자 눈높이로 알려줍니다.',
            action: '다음',
          },
          en: {
            title: '📚 Study guide to the rescue',
            body: 'Stuck? Tap this! It walks you through concept, tools and step-by-step approach.',
            action: 'Next',
          },
        },
        {
          selector: '.hint-panel',
          ko: {
            title: '무료 힌트',
            body: '막히면 비용이나 횟수 제한 없이 힌트를 확인할 수 있어요.',
            action: '다음',
          },
          en: {
            title: 'Free hints',
            body: 'Reveal a hint whenever you need one, with no credits or usage limit.',
            action: 'Next',
          },
        },
        {
          selector: '.submit-panel',
          ko: {
            title: 'FLAG 제출!',
            body: '찾아낸 정답을 입력하고 제출하면 점수 획득 🎉 틀려도 겁낼 거 없어요 — 시도 기록은 배움입니다.',
            action: '다음',
          },
          en: {
            title: 'Submit the FLAG!',
            body: 'Type what you found and submit to earn points 🎉 Wrong guesses are part of learning.',
            action: 'Next',
          },
        },
      ]

  return [
    {
      path: '/',
      ko: {
        title: 'FlagBox의 보안 학습에 오신 걸 환영해요',
        body: '특별한 장비나 해킹 지식 없이도 시작할 수 있어요. 지금부터 화면을 따라 함께 둘러볼게요!',
        action: '시작하기',
      },
      en: {
        title: 'Welcome to security learning at FlagBox',
        body: 'No special gear or background needed. Let us walk you through everything on screen!',
        action: "Let's start",
      },
    },
    { selector: '.brand', ko: { title: '로고 = 언제든 집으로', body: '로고를 누르면 어떤 페이지에서든 홈으로 돌아옵니다. 길을 잃으면 여기로!', action: '다음' }, en: { title: 'Logo = home anytime', body: 'Tap the logo to return home from anywhere. Lost? Come back here.', action: 'Next' } },
    { selector: '.primary-nav', ko: { title: '모든 메뉴는 상단에', body: '워게임·랭킹·커뮤니티·학습·마이 페이지 — 학습 흐름의 전부예요.', action: '다음' }, en: { title: 'Everything lives up here', body: 'Wargames, rankings, community, learn, my page — your whole learning loop.', action: 'Next' } },
    { selector: '.header-actions', ko: { title: '테마 · 언어 · 로그인', body: '눈이 편한 테마를 고르고, 언어를 전환하고, 로그인 상태를 확인하세요.', action: '다음' }, en: { title: 'Theme · language · account', body: 'Pick a comfortable theme, switch language, and manage sign-in here.', action: 'Next' } },
    { path: '/challenges', selector: '.challenge-toolbar', ko: { title: '카테고리 필터', body: '웹 · 포렌식 · 리버싱 · 암호학 · 미스셀레니어스 중 관심 있는 분야만 골라 볼 수 있어요.', action: '다음' }, en: { title: 'Category filter', body: 'Choose from Web, Forensics, Reversing, Cryptography, and Miscellaneous to focus your practice.', action: 'Next' } },
    { selector: '.difficulty-tabs', ko: { title: '다섯 단계 난이도', body: '첫걸음(50점)부터 도전(1000점)까지. 색상 테두리가 각 난이도를 알려줘요!', action: '다음' }, en: { title: 'Five difficulty tiers', body: 'From Beginner(50) to Expert(1000). The border colors identify each tier!', action: 'Next' } },
    { selector: '.challenge-card', ko: { title: '문제 카드 읽는 법', body: '좌측 상단 배지 = 분류와 난이도. 점수를 확인하고 "문제 열기"로 들어가요.', action: '다음' }, en: { title: 'Reading a challenge card', body: 'Top-left badges = category & difficulty. Check points, then hit Open.', action: 'Next' } },
    ...detailSteps,
    { path: '/learn', selector: '.learn-filter-tabs', ko: { title: '학습 탭 — 개념부터', body: '관심 분야의 아티클을 읽고 개념을 잡은 뒤 문제로 넘어가면 훨씬 쉬워요.', action: '다음' }, en: { title: 'Learn tab — concepts first', body: 'Read a short article in your field, then jump into problems. Way easier!', action: 'Next' } },
    { selector: '.learn-list', ko: { title: '아티클 열어 보기', body: '관심 있는 아티클 카드를 누르면 바로 열 수 있어요.', action: '다음' }, en: { title: 'Open an article', body: 'Tap an article card to open it right away.', action: 'Next' } },
    { path: '/ranking', selector: '.ranking-tabs', ko: { title: '랭킹은 두 종류', body: '점수 랭킹과 출석 랭킹! 꾸준함도 기록되니 부담 없이 이어가요.', action: '다음' }, en: { title: 'Two kinds of ranking', body: 'Score ranking AND attendance ranking — consistency counts too.', action: 'Next' } },
    { selector: '.ranking-panel', ko: { title: '티어와 배지', body: '상위 러너들의 티어와 점수를 확인해 보세요. 내 문제 풀이 기록도 랭킹에 반영됩니다.', action: '다음' }, en: { title: 'Tiers & badges', body: 'See top learners’ tiers and scores. Your solve record appears here too.', action: 'Next' } },
    { path: '/community', selector: '.community-category-tabs', ko: { title: '커뮤니티에서 질문하기', body: '막혔다면 질문 탭에 남겨보세요. 함께 배우면 빨라집니다.', action: '다음' }, en: { title: 'Ask the community', body: 'Stuck? Post in the question tab. Learning together is faster.', action: 'Next' } },
    { selector: '.community-list', ko: { title: '글·반응·댓글', body: '다른 러너의 기록에 좋아요와 답글로 응원해요. 플래그 직접 공유는 금지!', action: '다음' }, en: { title: 'Posts · reactions · replies', body: 'Cheer others with likes and replies. Never post raw flags!', action: 'Next' } },
    { selector: '.floating-menu-trigger', quickMenu: 'trigger', ko: { title: '오브 퀵 메뉴', body: '오른쪽 아래 오브 버튼은 어느 페이지에서나 빠른 기능을 여는 버튼이에요.', action: '다음' }, en: { title: 'Orb quick menu', body: 'The orb button in the lower-right corner opens quick tools from every page.', action: 'Next' } },
    { selector: '.quick-menu.is-open', quickMenu: 'content', ko: { title: '빠른 기능 모음', body: '북마크, 인기 문제, AI 학습 도우미, 피드백을 여기서 빠르게 이용할 수 있어요.', action: '다음' }, en: { title: 'Quick tools', body: 'Quickly open bookmarks, popular challenges, the AI learning helper, or feedback here.', action: 'Next' } },
    authenticated
      ? { path: '/profile', selector: '.profile-stats', ko: { title: '마이페이지에서 내 기록 보기', body: '여기서 점수, 해결한 문제 수, 출석과 학습 기록을 확인하고 프로필도 수정할 수 있어요.', action: 'FlagBox 시작!' }, en: { title: 'Your learning space', body: 'View your score, solved challenges, attendance, and learning record here. You can edit your profile too.', action: "Let's go!" } }
      : { selector: '.header-login', ko: { title: '이제 로그인해 볼까요?', body: '로그인하면 전역 출석 체크, 학습 달력, 프로필 수정, 친구와 메시지 같은 개인 기능을 사용할 수 있어요.', action: 'FlagBox 시작!' }, en: { title: 'Ready for your account?', body: 'Sign in to unlock global check-ins, your learning calendar, profile editing, friends, and private messages.', action: "Let's go!" } },
  ]
}

export function GettingStartedTutorial({
  onClose,
  onSkip,
  onNavigate,
  firstChallengeId,
  lang,
  scope = 'public',
  authenticated = false,
  initialStep = 0,
  onStepChange,
  onComplete,
}: {
  onClose: () => void
  onSkip?: () => void
  onNavigate: (path: string) => void
  firstChallengeId?: number
  lang: Lang
  scope?: 'public' | 'member' | 'authenticated'
  authenticated?: boolean
  initialStep?: number
  onStepChange?: (step: Step, index: number) => void
  onComplete?: () => void
}) {
  const steps = useMemo(() => buildTutorialSteps(firstChallengeId, scope, authenticated), [firstChallengeId, scope, authenticated])
  const [step, setStep] = useState(() => Math.max(0, Math.min(initialStep, steps.length - 1)))
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number; bottom: number } | null>(null)
  const location = useLocation()

  useEffect(() => {
    const target = steps[step]?.path
    if (target && location.pathname !== target) onNavigate(target)
  }, [location.pathname, onNavigate, step, steps])

  useEffect(() => {
    let tries = 0
    let timer = 0
    let scrolledToTarget = false
    let observedElement: Element | null = null
    let resizeObserver: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null
    const setRectIfChanged = (next: { top: number; left: number; width: number; height: number; bottom: number }) => {
      setRect((prev) => (
        prev
        && prev.top === next.top
        && prev.left === next.left
        && prev.width === next.width
        && prev.height === next.height
        && prev.bottom === next.bottom
      ) ? prev : next)
    }
    const attempt = () => {
      const s = steps[step]
      const el = s?.selector ? document.querySelector(s.selector) : null
      if (el) {
        if (el !== observedElement) {
          resizeObserver?.disconnect()
          observedElement = el
          resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(attempt)
          })
          resizeObserver.observe(el)
        }
        const r = el.getBoundingClientRect()
        const isVisible = r.width > 8 && r.height > 8 && r.bottom > 40 && r.top < window.innerHeight - 40
        if (!isVisible && !scrolledToTarget) {
          scrolledToTarget = true
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
          timer = window.setTimeout(attempt, 380)
          return
        }
        if (isVisible) {
          setRectIfChanged({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom })
          return
        }
      }
      setRect(null)
      tries += 1
      if (tries < 15) timer = window.setTimeout(attempt, 110)
    }
    timer = window.setTimeout(attempt, 80)
    window.addEventListener('resize', attempt)
    window.addEventListener('scroll', attempt, true)
    // Late-arriving content (e.g. pinned admin notices) shifts targets without
    // resizing them, so re-measure whenever the page subtree changes.
    mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(attempt)
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.clearTimeout(timer)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener('resize', attempt)
      window.removeEventListener('scroll', attempt, true)
    }
  }, [location.pathname, step, steps])

  const current = steps[Math.min(step, steps.length - 1)]
  const text = current[lang]
  const last = step === steps.length - 1
  const labels =
    lang === 'ko'
      ? { skip: '건너뛰기', prev: '이전', next: '다음', finish: 'FlagBox 시작!' }
      : { skip: 'Skip', prev: 'Back', next: 'Next', finish: "Let's go!" }

  useEffect(() => {
    onStepChange?.(current, step)
  }, [current, onStepChange, step])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft' && step > 0) setStep((value) => value - 1)
      if (event.key === 'ArrowRight') {
        if (last) {
          if (onComplete) onComplete()
          else onClose()
        } else setStep((value) => value + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [last, onClose, onComplete, step])

  let cardStyle: React.CSSProperties | undefined
  if (rect) {
    const below = rect.bottom + 16
    const fitsBelow = below + 220 < window.innerHeight
    cardStyle = {
      position: 'fixed',
      top: fitsBelow ? below : undefined,
      bottom: fitsBelow ? undefined : Math.max(14, window.innerHeight - rect.top + 16),
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 506)),
    }
  }

  return (
    <div className={rect ? 'onboarding-layer has-target' : 'onboarding-layer'} data-no-specular role="dialog" aria-modal="true" aria-label="FlagBox tutorial">
      <div
        className={rect ? 'onboarding-spotlight' : 'onboarding-spotlight fullscreen'}
        style={rect ? { top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 } : undefined}
      />
      <section className={rect ? 'onboarding-card anchored' : 'onboarding-card'} style={rect ? cardStyle : undefined}>
        <span className="onboarding-count">
          {step + 1} / {steps.length}
        </span>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, index) => <i className={index <= step ? 'complete' : ''} key={index} />)}
        </div>
        <h2>{text.title}</h2>
        <p aria-live="polite">{text.body}</p>
        <div className="onboarding-actions">
          {step > 0 && (
            <button type="button" className="text-link" onClick={() => setStep((v) => v - 1)}>
              {labels.prev}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="text-link" onClick={onSkip ?? onClose}>
            {labels.skip}
          </button>
          <button type="button" className="button primary" onClick={() => (last ? (onComplete ? onComplete() : onClose()) : setStep((v) => v + 1))}>
            {last ? labels.finish : text.action || labels.next}
          </button>
        </div>
      </section>
    </div>
  )
}

export default GettingStartedTutorial
