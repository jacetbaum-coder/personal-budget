interface InfoRowProps {
  label: string
  value: string
  note?: string
}

export default function InfoRow({ label, value, note }: InfoRowProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 shadow-sm shadow-slate-200/30">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  )
}
