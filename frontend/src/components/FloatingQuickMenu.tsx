import { useState, type ReactNode } from 'react'
import { Bookmark, Heart, Menu, MessageSquarePlus, Sparkles, X } from 'lucide-react'
import './FloatingQuickMenu.css'

type Language = 'ko' | 'en'

type FloatingQuickMenuProps = {
  language: Language
  assistantOpen: boolean
  onAssistantToggle: () => void
  onPopular: () => void
  onAiMode: () => void
  onFeedback: () => void
  onBookmarks: () => void
  tutorialMenuOpen?: boolean
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
    popular: '인기 문제',
    bookmarks: '북마크',
    aiMode: 'AI Mode',
    feedback: '피드백',
    aiLabel: 'AI 학습 도우미 열기',
    aiCloseLabel: 'AI 학습 도우미 닫기',
  },
  en: {
    menu: 'Quick menu',
    closeMenu: 'Close quick menu',
    openMenu: 'Open quick menu',
    home: 'Home',
    notice: 'Notices',
    question: 'Q&A',
    challenges: 'Challenges',
    popular: 'Popular',
    aiMode: 'AI Mode',
    feedback: 'Feedback',
    bookmarks: 'Bookmarks',
    aiLabel: 'Open AI learning helper',
    aiCloseLabel: 'Close AI learning helper',
  },
} as const

export default function FloatingQuickMenu({ language, assistantOpen, onAssistantToggle, onPopular, onAiMode, onFeedback, onBookmarks, tutorialMenuOpen = false }: FloatingQuickMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const labels = copy[language]
  const isOpen = tutorialMenuOpen || menuOpen

  const closeMenu = () => setMenuOpen(false)
  const openAiMode = () => {
    closeMenu()
    onAiMode()
  }

  return (
    <div className="floating-tools">
      <div id="quick-menu" className={`quick-menu ${isOpen ? 'is-open' : ''}`} aria-label={labels.menu}>
        <QuickMenuButton label={labels.bookmarks} icon={<Bookmark />} onClick={() => { closeMenu(); onBookmarks() }} />
        <QuickMenuButton label={labels.popular} icon={<Heart />} accent onClick={() => { closeMenu(); onPopular() }} />
        <QuickMenuButton label={labels.aiMode} icon={<Sparkles />} accent onClick={openAiMode} />
        <QuickMenuButton label={labels.feedback} icon={<MessageSquarePlus />} onClick={() => { closeMenu(); onFeedback() }} />
      </div>
      <button
        className={`floating-menu-trigger ${isOpen ? 'is-open' : ''}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls="quick-menu"
        aria-label={assistantOpen ? labels.aiCloseLabel : isOpen ? labels.closeMenu : labels.openMenu}
        onClick={() => assistantOpen ? (closeMenu(), onAssistantToggle()) : setMenuOpen((open) => !open)}
      >
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </div>
  )
}

function QuickMenuButton({ label, icon, accent = false, onClick }: { label: string; icon: ReactNode; accent?: boolean; onClick: () => void }) {
  return <button className={`quick-menu-item ${accent ? 'accent' : ''}`} type="button" onClick={onClick}><span className="quick-menu-icon" aria-hidden="true">{icon}</span><span>{label}</span></button>
}
