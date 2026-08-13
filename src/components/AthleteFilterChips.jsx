import { X } from 'lucide-react'

/** Row of dismissible chips for athletes added via the search dropdown.
 * Styled like the club chips (see ClubFilterChips) but always tappable to
 * remove rather than toggle — each one represents a specific resolved
 * identity (name + club), added deliberately, not a category to switch
 * on/off. */
export function AthleteFilterChips({ athletes, onRemove }) {
  if (!athletes || athletes.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Selected athletes">
      {athletes.map((athlete) => (
        <button
          key={athlete.id}
          type="button"
          onClick={() => onRemove(athlete.id)}
          aria-label={`Remove ${athlete.name}${athlete.club ? ` (${athlete.club})` : ''} filter`}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 border-sky-700 bg-sky-700 pl-4 pr-3 text-sm font-semibold text-white active:bg-sky-800"
        >
          <span>
            {athlete.name}
            {athlete.club ? ` (${athlete.club})` : ''}
          </span>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
