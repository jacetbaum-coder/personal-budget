interface InfoRowProps {
  label: string
  value: string
  note?: string
}

export default function InfoRow({ label, value, note }: InfoRowProps) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 shadow-sm shadow-slate-200/40">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {note ? <p className="mt-1 text-sm text-slate-500">{note}</p> : null}
    </div>
  )
}
