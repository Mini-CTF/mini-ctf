import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

type Lang = 'ko' | 'en'
type LocalizedText = { title: string; body: string; action: string }
type Step = { path?: string; selector?: string; ko: LocalizedText; en: LocalizedText }

function buildTutorialSteps(firstChallengeId?: number, scope: 'public' | 'member' = 'public'): Step[] {
  if (scope === 'member') {
    return [
      { path: '/profile', selector: '.profile-stats', ko: { title: '내 학습 기록', body: '점수, 해결한 문제 수, 현재 순위를 여기서 바로 확인해요.', action: '다음' }, en: { title: 'Your learning record', body: 'See your score, solved challenges, and current rank at a glance.', action: 'Next' } },
      { selector: '.attendance-panel', ko: { title: '매일 출석하기', body: '하루 한 번 출석하면 연속 기록과 보상을 쌓을 수 있어요. 부담 없이 꾸준히 이어가 보세요.', action: '다음' }, en: { title: 'Daily check-in', body: 'Check in once a day to build a streak and earn rewards.', action: 'Next' } },
      { selector: '.profile-editor', ko: { title: '프로필 꾸미기', body: '표시 이름과 상태 메시지를 바꿀 수 있어요. 저장하면 랭킹과 커뮤니티에도 바로 반영됩니다.', action: '다음' }, en: { title: 'Customize your profile', body: 'Change your display name and status. Your updates appear in rankings and community too.', action: 'Next' } },
      { selector: '.profile-vault-button', ko: { title: 'Cipher Vault', body: '출석과 미션으로 얻은 루비로 프로필 테두리, 칭호, 힌트 크레딧을 관리해요.', action: '다음' }, en: { title: 'Cipher Vault', body: 'Use rubies earned from check-ins and missions for frames, titles, and hint credits.', action: 'Next' } },
      { path: '/friends', selector: '.friend-request', ko: { title: '친구 추가하기', body: '상대방의 계정 아이디를 입력해 친구 요청을 보낼 수 있어요.', action: '다음' }, en: { title: 'Add friends', body: 'Enter a learner’s account username to send a friend request.', action: 'Next' } },
      { selector: '.friend-list', ko: { title: '친구와 DM', body: '요청을 수락하면 이 목록에서 친구 프로필을 보고 개인 메시지를 보낼 수 있어요.', action: '마치기' }, en: { title: 'Friends & DMs', body: 'After a request is accepted, use this list to view profiles and send private messages.', action: 'Finish' } },
    ]
  }
  const detailSteps: Step[] = firstChallengeId
    ? [
        {
          path: `/challenges/${firstChallengeId}`,
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
            title: '힌트와 크레딧',
            body: '크레딧으로 힌트를 열 수 있어요. 잔액과 충전은 상점(Cipher Vault)에서!',
            action: '다음',
          },
          en: {
            title: 'Hints & credits',
            body: 'Spend credits to reveal hints. Balance and top-up live in the Cipher Vault shop.',
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
    : []

  return [
    {
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
    { path: '/challenges', selector: '.challenge-toolbar', ko: { title: '카테고리 필터', body: '웹 / 포렌식 / 리버싱 — 관심 있는 분야만 골라 볼 수 있어요.', action: '다음' }, en: { title: 'Category filter', body: 'Web / Forensic / Reversing — focus on the field you like.', action: 'Next' } },
    { selector: '.difficulty-tabs', ko: { title: '다섯 단계 난이도', body: '첫걸음(50점)부터 도전(1000점)까지. 색상 테두리가 각 난이도를 알려줘요!', action: '다음' }, en: { title: 'Five difficulty tiers', body: 'From Beginner(50) to Expert(1000). The border colors identify each tier!', action: 'Next' } },
    { selector: '.challenge-card', ko: { title: '문제 카드 읽는 법', body: '좌측 상단 배지 = 분류와 난이도. 점수를 확인하고 "문제 열기"로 들어가요.', action: '다음' }, en: { title: 'Reading a challenge card', body: 'Top-left badges = category & difficulty. Check points, then hit Open.', action: 'Next' } },
    ...detailSteps,
    { path: '/learn', selector: '.filter-tabs', ko: { title: '학습 탭 — 개념부터', body: '관심 분야의 아티클을 읽고 개념을 잡은 뒤 문제로 넘어가면 훨씬 쉬워요.', action: '다음' }, en: { title: 'Learn tab — concepts first', body: 'Read a short article in your field, then jump into problems. Way easier!', action: 'Next' } },
    { selector: '.learn-list', ko: { title: '아티클 열어 보기', body: '각 글은 5~9분짜리 짧은 읽기거리예요. 카드를 누르면 바로 열립니다.', action: '다음' }, en: { title: 'Open an article', body: 'Each one is a 5–9 minute read. Tap any card to open it instantly.', action: 'Next' } },
    { path: '/ranking', selector: '.ranking-tabs', ko: { title: '랭킹은 두 종류', body: '점수 랭킹과 출석 랭킹! 꾸준함도 기록되니 부담 없이 이어가요.', action: '다음' }, en: { title: 'Two kinds of ranking', body: 'Score ranking AND attendance ranking — consistency counts too.', action: 'Next' } },
    { selector: '.ranking-panel', ko: { title: '티어와 배지', body: '상위 러너들의 프로필 테두리·칭호가 보이죠? 나중에 내 것도 만들 수 있어요.', action: '다음' }, en: { title: 'Tiers & badges', body: 'See those profile frames and titles? Yours will show up here too.', action: 'Next' } },
    { path: '/community', selector: '.community-toolbar', ko: { title: '커뮤니티에서 질문하기', body: '막혔다면 질문 탭에 남겨보세요. 함께 배우면 빨라집니다.', action: '다음' }, en: { title: 'Ask the community', body: 'Stuck? Post in the question tab. Learning together is faster.', action: 'Next' } },
    { selector: '.community-list', ko: { title: '글·반응·댓글', body: '다른 러너의 기록에 좋아요와 답글로 응원해요. 플래그 직접 공유는 금지!', action: '다음' }, en: { title: 'Posts · reactions · replies', body: 'Cheer others with likes and replies. Never post raw flags!', action: 'Next' } },
    { selector: '.header-login', ko: { title: '이제 로그인해 볼까요?', body: '로그인하면 출석, 프로필 꾸미기, 친구와 메시지 같은 개인 기능도 사용할 수 있어요.', action: 'FlagBox 시작!' }, en: { title: 'Ready for your account?', body: 'Sign in to unlock check-ins, profile customization, friends, and private messages.', action: "Let's go!" } },
  ]
}

export function GettingStartedTutorial({
  onClose,
  onNavigate,
  firstChallengeId,
  lang,
  scope = 'public',
}: {
  onClose: () => void
  onNavigate: (path: string) => void
  firstChallengeId?: number
  lang: Lang
  scope?: 'public' | 'member'
}) {
  const steps = useMemo(() => buildTutorialSteps(firstChallengeId, scope), [firstChallengeId, scope])
  const [step, setStep] = useState(0)
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
    const attempt = () => {
      const s = steps[step]
      const el = s?.selector ? document.querySelector(s.selector) : null
      if (el) {
        const r = el.getBoundingClientRect()
        const isVisible = r.width > 8 && r.height > 8 && r.bottom > 40 && r.top < window.innerHeight - 40
        if (!isVisible && !scrolledToTarget) {
          scrolledToTarget = true
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
          timer = window.setTimeout(attempt, 380)
          return
        }
        if (isVisible) {
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom })
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
    return () => {
      window.clearTimeout(timer)
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
    <div className={rect ? 'onboarding-layer has-target' : 'onboarding-layer'} role="dialog" aria-modal="true" aria-label="FlagBox tutorial">
      <div
        className={rect ? 'onboarding-spotlight' : 'onboarding-spotlight fullscreen'}
        style={rect ? { top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 } : undefined}
      />
      <section className={rect ? 'onboarding-card anchored' : 'onboarding-card'} style={rect ? cardStyle : undefined}>
        <span className="onboarding-count">
          {step + 1} / {steps.length}
        </span>
        <h2>{text.title}</h2>
        <p aria-live="polite">{text.body}</p>
        <div className="onboarding-actions">
          {step > 0 && (
            <button type="button" className="text-link" onClick={() => setStep((v) => v - 1)}>
              {labels.prev}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="text-link" onClick={onClose}>
            {labels.skip}
          </button>
          <button type="button" className="button primary" onClick={() => (last ? onClose() : setStep((v) => v + 1))}>
            {last ? labels.finish : text.action || labels.next}
          </button>
        </div>
      </section>
    </div>
  )
}

export default GettingStartedTutorial
