import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Archive, ArchiveRestore, ExternalLink, AlertTriangle, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'
import { formatDateRange } from '../lib/time'
import { EditRegattaModal } from './EditRegattaModal'
import { ConfirmModal } from './ConfirmModal'

function RowMenu({ onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 active:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 active:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function RegattaRow({ regatta, onChanged }) {
  const { toggleRegattaStatus, deleteRegatta } = useAdminActions()
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const isActive = regatta.status === 'active'

  const handleToggle = async () => {
    setIsToggling(true)
    setError(null)
    const { error: toggleError } = await toggleRegattaStatus(regatta)
    setIsToggling(false)
    if (toggleError) {
      setError(toggleError)
      return
    }
    onChanged?.()
  }

  const handleDelete = async () => {
    setIsConfirmingDelete(false)
    // Optimistic: hide the row immediately rather than waiting on the round
    // trip — a delete is simple to roll back visually if it's rejected, and
    // the whole point of a "strict confirm, then act" flow is that the
    // decision was already made at the confirm step, not this one.
    setIsDeleted(true)
    setIsDeleting(true)
    setError(null)
    const { error: deleteError } = await deleteRegatta(regatta.id)
    setIsDeleting(false)
    if (deleteError) {
      setIsDeleted(false)
      setError(deleteError)
      return
    }
    onChanged?.()
  }

  if (isDeleted) return null

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{regatta.name}</p>
          <p className="text-sm font-medium text-slate-500">
            {formatDateRange(regatta.start_date ?? regatta.date, regatta.end_date ?? regatta.date)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isActive ? 'Active' : 'Archived'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/regatta/${regatta.id}`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-60"
        >
          {isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
          {isActive ? 'Archive' : 'Restore'}
        </button>
        <RowMenu onEdit={() => setIsEditing(true)} onDelete={() => setIsConfirmingDelete(true)} />
      </div>

      {isDeleting && <p className="text-xs font-medium text-slate-400">Deleting…</p>}

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {isEditing && (
        <EditRegattaModal
          regatta={regatta}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false)
            onChanged?.()
          }}
        />
      )}

      {isConfirmingDelete && (
        <ConfirmModal
          title="Delete regatta"
          message={`Are you sure you want to permanently delete "${regatta.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setIsConfirmingDelete(false)}
        />
      )}
    </li>
  )
}

export function AdminRegattaTable({ regattas, onChanged }) {
  if (regattas.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-400">No regattas yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {regattas.map((regatta) => (
        <RegattaRow key={regatta.id} regatta={regatta} onChanged={onChanged} />
      ))}
    </ul>
  )
}
