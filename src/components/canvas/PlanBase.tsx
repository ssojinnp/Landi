// 업로드 도면이 없을 때 표시하는 기본 조감도 배경을 렌더링한다.
import { borderShrubs, defaultPalette, hedgePoints } from '../../data/plants'
import { PlantSymbol } from './PlantSymbol'

interface PlanBaseProps {
  fade?: number
}

export function PlanBase({ fade = 62 }: PlanBaseProps) {
  const baseOpacity = Math.max(0.18, Math.min(0.72, 1 - fade / 110))

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f7f7f2] grayscale-[78%] saturate-50" style={{ opacity: baseOpacity }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
        <path d="M118 70 L875 50 L918 585 L128 585 Z" fill="#d8e9c8" stroke="#aab9a1" strokeWidth="3" />
        <path d="M130 454 L312 454 Q332 435 351 445 L356 588 L84 588 L84 456 Z" fill="#e6e7e3" stroke="#c8cac3" strokeWidth="2" />
        <path d="M347 165 L483 166 L483 278 L559 278 L559 516 L313 516 L313 290 L347 290 Z" fill="#fbfbf8" stroke="#565656" strokeWidth="4" />
        <path d="M543 385 L694 385 L694 574 L596 574 L596 505 L543 505 Z" fill="#fbfbf8" stroke="#565656" strokeWidth="4" />
        <path d="M472 165 L571 165 L571 262 L472 262 Z" fill="#b69259" opacity="0.58" stroke="#866f45" strokeWidth="2" />
        <path d="M483 278 Q528 310 514 374 Q492 437 552 455" fill="none" stroke="#f6f7f1" strokeWidth="42" strokeLinecap="round" />
        <path d="M483 278 Q528 310 514 374 Q492 437 552 455" fill="none" stroke="#bcc5b7" strokeWidth="3" strokeLinecap="round" />
        <circle cx="812" cy="155" r="44" fill="#f8f4ee" stroke="#bdb7aa" strokeWidth="3" />
        <circle cx="712" cy="178" r="46" fill="#7eaa4c" opacity="0.38" stroke="#264321" strokeWidth="2" />
        <circle cx="826" cy="292" r="48" fill="#83ad4e" opacity="0.34" stroke="#264321" strokeWidth="2" />
      </svg>
      {hedgePoints.map(([x, y, size], index) => <div key={`hedge-${index}`} className="absolute opacity-25 saturate-50" style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}><PlantSymbol plant={{ ...defaultPalette[index % 3], size }} /></div>)}
      {borderShrubs.map(([x, y], index) => <div key={`shrub-${index}`} className="absolute opacity-25 saturate-50" style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}><PlantSymbol plant={{ ...defaultPalette[2], size: 34 }} /></div>)}
    </div>
  )
}
