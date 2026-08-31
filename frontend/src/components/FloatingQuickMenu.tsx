import { useState, type ReactNode } from 'react'
import { CircleHelp, Home, Megaphone, Menu, MessageSquarePlus, Sparkles, Swords, X } from 'lucide-react'
import './FloatingQuickMenu.css'

type CommunityCategory = 'NOTICE' | 'QUESTION'
type Language = 'ko' | 'en'

type FloatingQuickMenuProps = {
  language: Language
  onHome: () => void
  onCommunity: (category: CommunityCategory) => void
  onChallenges: () => void
  onAiMode: () => void
  onFeedback: () => void
}

const copy = {
  ko: {
    menu: '퀵 메뉴',
    closeMenu: '퀵 메뉴 닫기',
    openMenu: '퀵 메뉴 열기',
    home: '홈',
    notice: '공지사항',
    question: 'Q&A',
    challenges: 'Challenges',
    aiMode: 'AI Mode',
    feedback: '피드백',
    aiLabel: 'AI 학습 도우미 열기',
  },
  en: {
    menu: 'Quick menu',
    closeMenu: 'Close quick menu',
    openMenu: 'Open quick menu',
    home: 'Home',
    notice: 'Notices',
    question: 'Q&A',
    challenges: 'Challenges',
    aiMode: 'AI Mode',
    feedback: 'Feedback',
    aiLabel: 'Open AI learning helper',
  },
} as const

export default function FloatingQuickMenu({ language, onHome, onCommunity, onChallenges, onAiMode, onFeedback }: FloatingQuickMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const labels = copy[language]

  const closeMenu = () => setMenuOpen(false)
  const openAiMode = () => {
    closeMenu()
    onAiMode()
  }

  return (
    <div className="floating-tools">
      <div id="quick-menu" className={`quick-menu ${menuOpen ? 'is-open' : ''}`} aria-label={labels.menu}>
        <QuickMenuButton label={labels.home} icon={<Home />} onClick={() => { closeMenu(); onHome() }} />
        <QuickMenuButton label={labels.notice} icon={<Megaphone />} onClick={() => { closeMenu(); onCommunity('NOTICE') }} />
        <QuickMenuButton label={labels.question} icon={<CircleHelp />} onClick={() => { closeMenu(); onCommunity('QUESTION') }} />
        <QuickMenuButton label={labels.challenges} icon={<Swords />} onClick={() => { closeMenu(); onChallenges() }} />
        <QuickMenuButton label={labels.aiMode} icon={<Sparkles />} accent onClick={openAiMode} />
        <QuickMenuButton label={labels.feedback} icon={<MessageSquarePlus />} onClick={() => { closeMenu(); onFeedback() }} />
      </div>
      <button
        className={`floating-menu-trigger ${menuOpen ? 'is-open' : ''}`}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="quick-menu"
        aria-label={menuOpen ? labels.closeMenu : labels.openMenu}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </div>
  )
}

function QuickMenuButton({ label, icon, accent = false, onClick }: { label: string; icon: ReactNode; accent?: boolean; onClick: () => void }) {
  return <button className={`quick-menu-item ${accent ? 'accent' : ''}`} type="button" onClick={onClick}><span className="quick-menu-icon" aria-hidden="true">{icon}</span><span>{label}</span></button>
}
