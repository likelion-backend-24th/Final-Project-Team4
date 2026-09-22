import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 페이지 본문 폭/여백을 통일하는 컨테이너
export function PageContainer({ className, size = 'lg', ...props }) {
  const width = { sm: 'max-w-3xl', md: 'max-w-5xl', lg: 'max-w-6xl', xl: 'max-w-7xl' }[size];
  return <div className={cn('mx-auto w-full px-4 py-8 md:px-8', width, className)} {...props} />;
}

// 페이지 상단 소개 영역(어두운 배경). eyebrow: 작은 영문 라벨, children: 검색창 등 추가 요소
export function PageHero({ eyebrow, title, description, children }) {
  return (
    <section className="bg-slate-900 px-4 py-10 text-white md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        {eyebrow && <p className="m-0 mb-2 text-xs font-semibold tracking-[0.2em] text-sky-400">{eyebrow}</p>}
        <h1 className="m-0 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 mb-0 text-sm text-slate-300 md:text-base">{description}</p>}
        {children}
      </div>
    </section>
  );
}

// 일반 페이지 제목 줄 (제목 + 설명 + 우측 액션)
export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 mb-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// 목록이 비었거나 오류일 때 쓰는 안내 문구
export function EmptyState({ className, tone = 'muted', children }) {
  return (
    <p
      className={cn(
        'my-6 text-center text-sm',
        tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  );
}

// 1..N 페이지 번호 + 이전/다음. totalPages가 1 이하면 그리지 않는다.
export function Pagination({ page, totalPages, onChange, className }) {
  if (totalPages <= 1) return null;
  return (
    <div className={cn('mt-8 flex items-center justify-center gap-1', className)}>
      <Button variant="outline" size="icon-sm" aria-label="이전" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </Button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'outline'}
          size="icon-sm"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="다음"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
