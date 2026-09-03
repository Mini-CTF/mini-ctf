import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useMemo } from 'react'

export type StreakPeriod = {
  periodStart: string
  periodEnd: string
  usedFreeze?: boolean
}

type SolveActivity = { date: string; count: number }

export type StreakCalendarProps = {
  streak: StreakPeriod[]
  solveActivity: SolveActivity[]
  month: Date
  onMonthChange: (month: Date) => void
  onDayClick?: (date: Date, solvedCount: number, checkedIn: boolean) => void
  className?: string
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isInStreak(date: Date, periods: StreakPeriod[]) {
  const key = dateKey(date)
  return periods.some((period) => key >= period.periodStart && key <= period.periodEnd)
}

export default function StreakCalendar({
  streak,
  solveActivity,
  month,
  onMonthChange,
  onDayClick,
  className = '',
}: StreakCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const solvedByDate = useMemo(() => new Map(solveActivity.map((item) => [item.date, item.count])), [solveActivity])
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null
    const date = new Date(year, monthIndex, index - firstWeekday + 1)
    date.setHours(0, 0, 0, 0)
    const key = dateKey(date)
    return {
      date,
      key,
      solved: solvedByDate.get(key) ?? 0,
      checkedIn: isInStreak(date, streak),
      future: date > today,
      isToday: date.getTime() === today.getTime(),
    }
  })
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const changeMonth = (offset: number) => onMonthChange(new Date(year, monthIndex + offset, 1))

  return (
    <section className={`streak-calendar ${className}`.trim()} aria-label="학습 및 출석 달력">
      <header className="streak-calendar__header">
        <div>
          <span className="vault-kicker">LEARNING CALENDAR</span>
          <h2>학습 · 출석 기록</h2>
          <p>날짜마다 문제 풀이 수와 출석 여부를 함께 확인하세요.</p>
        </div>
        <div className="streak-calendar__navigation">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달"><ChevronLeft size={18} /></button>
          <strong>{monthLabel}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달"><ChevronRight size={18} /></button>
        </div>
      </header>
      <div className="streak-calendar__weekdays" aria-hidden="true">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="streak-calendar__grid" key={`${year}-${monthIndex}`} role="grid" aria-label={`${monthLabel} 학습 기록`}>
        {cells.map((cell, index) => {
          if (!cell) return <span className="streak-calendar__empty" key={`empty-${index}`} />
          const label = `${cell.date.toLocaleDateString('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' })}: ${cell.checkedIn ? '출석 완료' : '미출석'}${cell.solved ? `, ${cell.solved}문제 해결` : ''}`
          return (
            <button
              type="button"
              key={cell.key}
              role="gridcell"
              disabled={cell.future}
              aria-current={cell.isToday ? 'date' : undefined}
              aria-label={label}
              title={label}
              onClick={() => onDayClick?.(cell.date, cell.solved, cell.checkedIn)}
              className={`streak-calendar__day${cell.checkedIn ? ' is-checked-in' : ''}${cell.solved ? ' has-solves' : ''}${cell.isToday ? ' is-today' : ''}${cell.future ? ' is-future' : ''}`}
            >
              <span className="streak-calendar__date">{cell.date.getDate()}</span>
              <span className="streak-calendar__details">
                {cell.checkedIn && <span className="streak-calendar__check"><Check size={16} /> 출석</span>}
                {cell.solved > 0 && <span className="streak-calendar__solves">{cell.solved} 해결</span>}
              </span>
            </button>
          )
        })}
      </div>
      <footer className="streak-calendar__legend">
        <span><i className="check" /> 출석</span>
        <span><i className="solve" /> 문제 해결 수</span>
        <span><i className="both" /> 둘 다 완료</span>
      </footer>
    </section>
  )
}

export { StreakCalendar }
