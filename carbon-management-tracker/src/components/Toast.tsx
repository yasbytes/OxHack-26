import { useToast } from '../toast.ts'

function Toast() {
  const message = useToast()

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        // Keyed so the pop-in animation replays for each new message
        <div key={message.id} className="toast">
          <span className="toast__tick" aria-hidden="true">✓</span>
          {message.text}
        </div>
      )}
    </div>
  )
}

export default Toast
