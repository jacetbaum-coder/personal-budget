import { ReactNode } from 'react'

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-200/60">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
