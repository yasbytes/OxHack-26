import { useEffect, useRef } from 'react'

type Props = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Rendered only while open; the native <dialog> handles focus and Escape
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      {/* The dialog itself has no padding, so only true backdrop clicks hit it */}
      <div className="dialog__body">
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        <p className="dialog__message">{message}</p>
        <div className="dialog__actions">
          <button type="button" className="dialog__cancel" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button type="button" className="dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
