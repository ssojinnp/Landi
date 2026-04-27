import { LogIn, LogOut, UserRound } from 'lucide-react'
import type { LandiUser } from '../../lib/supabase'

type AuthControlsProps = {
  authUser: LandiUser | null
  actionButtonClass: string
  onSignIn: () => void
  onSignOut: () => void
}

export function AuthControls({ authUser, actionButtonClass, onSignIn, onSignOut }: AuthControlsProps) {
  if (authUser) {
    return (
      <div className="flex h-10 items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="hidden min-w-0 max-w-[190px] items-center gap-2 px-3 text-sm font-semibold text-slate-700 md:flex" title={authUser.email}>
          <UserRound size={16} className="shrink-0 text-[var(--landi-primary)]" />
          <span className="truncate">{authUser.name}</span>
        </div>
        <button type="button" onClick={onSignOut} title="로그아웃" className="grid h-10 w-10 place-items-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="로그아웃">
          <LogOut size={17} />
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={onSignIn} className={`${actionButtonClass} border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50`}>
      <LogIn size={17} />
      Google 로그인
    </button>
  )
}
