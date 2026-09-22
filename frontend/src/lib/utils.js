import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn/ui 공용 클래스 병합 헬퍼: 조건부 클래스(clsx) + Tailwind 충돌 클래스 정리(twMerge)
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
