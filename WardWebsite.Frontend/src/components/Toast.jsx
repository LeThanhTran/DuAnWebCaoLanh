export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null

  const styleMap = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }

  return (
    <div className={`fixed top-20 right-6 z-[60] text-white px-4 py-3 rounded-lg shadow-xl ${styleMap[type] || styleMap.info}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/90 hover:text-white">✕</button>
      </div>
    </div>
  )
}
