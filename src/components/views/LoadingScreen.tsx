import { Trees } from 'lucide-react'

export function LoadingScreen({ message }: { message: string }) {
  return (
    <main data-theme="light" className="landi-app flex min-h-screen items-center justify-center bg-[var(--landi-bg)] px-5 text-slate-900">
      <div className="grid justify-items-center gap-3 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm">
          <Trees size={24} />
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)] [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--landi-primary)] [animation-delay:240ms]" />
        </div>
        <p className="text-[13px] font-semibold text-slate-500">{message}</p>
      </div>
    </main>
  )
}
