import { HelpCircle, LogIn, Trees } from 'lucide-react'

type LoginRequiredPageProps = {
  actionButtonClass: string
  authError: string
  onSignIn: () => void
  onOpenGuide: () => void
}

export function LoginRequiredPage({ actionButtonClass, authError, onSignIn, onOpenGuide }: LoginRequiredPageProps) {
  return (
    <main data-theme="light" className="landi-app flex min-h-screen items-center justify-center bg-[var(--landi-bg)] px-5 py-8 text-slate-900">
      <section className="w-full max-w-[420px] rounded-md border border-slate-200 bg-white/90 p-5 text-center shadow-[0_24px_70px_rgba(47,55,43,0.14)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm">
          <Trees size={26} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">Landi</h1>
        <p className="mt-2 text-[13px] leading-5 text-slate-500">내 조감도와 공유받은 조감도를 확인하려면 로그인이 필요합니다.</p>
        <button type="button" onClick={onSignIn} className={`${actionButtonClass} mt-5 w-full bg-[var(--landi-primary)] text-white hover:bg-[var(--landi-primary-dark)]`}>
          <LogIn size={17} />
          Google 로그인
        </button>
        <button type="button" onClick={onOpenGuide} className="landi-action-button mt-2 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <HelpCircle size={17} />
          시작 가이드
        </button>
        {authError && <div className="mt-3 rounded-md border border-[var(--landi-danger-border)] bg-[var(--landi-danger-soft)] px-3 py-2 text-left text-xs font-semibold text-[var(--landi-danger-dark)]" role="alert">{authError}</div>}
      </section>
    </main>
  )
}
