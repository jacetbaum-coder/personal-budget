interface TimelineButtonProps {
  label: string
  active?: boolean
  onClick: () => void
}

export default function TimelineButton({ label, active, onClick }: TimelineButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-3 text-sm font-semibold transition focus:outline-none ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}
