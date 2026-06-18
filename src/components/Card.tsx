import { ReactNode } from 'react'

interface CardProps {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export default function Card({ title, subtitle, children, action, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm shadow-slate-200/50 backdrop-blur ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  )
}
