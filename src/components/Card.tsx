import { ReactNode } from 'react'

interface CardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm shadow-slate-200/60 backdrop-blur ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  )
}
