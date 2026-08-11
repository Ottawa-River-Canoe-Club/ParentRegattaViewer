import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

/** A deliberately plain yes/no gate for anything hard or impossible to
 * undo — the confirm button is styled as a warning (rose) by default since
 * every caller so far is a destructive action; pass isDangerous={false} for
 * a merely-disruptive one that isn't. */
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', isDangerous = true, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="mb-4 flex items-start gap-2">
        {isDangerous && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 active:bg-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex h-11 flex-1 items-center justify-center rounded-full text-sm font-bold text-white ${
            isDangerous ? 'bg-rose-600 active:bg-rose-700' : 'bg-sky-700 active:bg-sky-800'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
