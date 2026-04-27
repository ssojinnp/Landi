import type { ReactNode } from 'react'
import { ArrowLeft, Trees } from 'lucide-react'

export function GuidePage({ authControls, onBack }: { authControls: ReactNode; onBack: () => void }) {
  const steps = [
    { title: '조감도 만들기', description: '목록에서 새 조감도를 만든 뒤 편집보드로 들어갑니다.' },
    { title: '도면 올리기', description: '상단 업로드 버튼으로 배경 도면을 먼저 올립니다.' },
    { title: '식재 채우기', description: '좌측 팔레트에서 나무, 풀, 꽃 식재를 등록합니다.' },
    { title: '도면에 배치', description: '등록한 식재를 클릭하거나 드래그해 도면 위에 놓습니다.' },
    { title: '보드 설정 다듬기', description: '선택한 식재의 크기를 조정하고 우측 보드 설정에서 라벨과 표시 유형을 정리합니다.' },
    { title: '수량집계 후 저장', description: '우측 수량집계에서 배치 결과를 확인하고 이미지로 내보냅니다.' },
  ]
  const panels = [
    { title: '좌측 식재 팔레트', description: '식재를 등록하고 도면에 올릴 준비를 하는 영역입니다.' },
    { title: '중앙 편집보드', description: '도면 위에서 식재 위치와 크기를 조정하는 작업 공간입니다.' },
    { title: '우측 도구 패널', description: '공유, 보드 설정, 수량집계를 확인하는 보조 영역입니다.' },
  ]
  const tips = [
    '식재 이름 라벨은 같은 식재가 여러 개 있어도 대표 1개만 표시합니다.',
    '보이는 식재 유형은 기본적으로 모두 켜져 있고, 새 식재를 추가하면 해당 유형이 자동으로 다시 표시됩니다.',
    '읽기전용 멤버는 조감도를 확인할 수 있지만 편집과 업로드는 할 수 없습니다.',
  ]

  return (
    <main data-theme="light" className="landi-app min-h-screen bg-[var(--landi-bg)] px-5 py-6 text-slate-900 md:px-8">
      <header className="mx-auto mb-10 flex max-w-6xl flex-wrap items-start justify-between gap-4 md:mb-12">
        <div className="grid min-w-0 gap-2">
          <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="돌아가기" title="돌아가기"><ArrowLeft size={17} /></button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--landi-primary)] text-white shadow-sm"><Trees size={24} /></div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal">Landi 시작 가이드</h1>
              <p className="text-sm text-slate-500">처음 쓰는 흐름을 빠르게 익히는 안내입니다.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {authControls}
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick Start</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">도면을 올리고 식재를 배치한 뒤 이미지로 저장합니다.</h2>
            </div>
            <span className="rounded-md bg-[var(--landi-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--landi-primary)]">6단계</span>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-slate-200 bg-[var(--landi-panel)] p-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--landi-primary)] text-xs font-semibold text-white">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <aside className="grid gap-5">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">화면 구성</h2>
            <div className="mt-4 grid gap-2">
              {panels.map((panel) => (
                <div key={panel.title} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-800">{panel.title}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">{panel.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-[var(--landi-accent-copper-border)] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Checklist</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">작업 전에 알아두면 좋은 점</h2>
            <div className="mt-4 grid gap-2">
              {tips.map((tip) => (
                <p key={tip} className="rounded-md bg-[var(--landi-accent-copper-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--landi-accent-copper-dark)]">{tip}</p>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}
