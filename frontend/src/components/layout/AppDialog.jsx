import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

// 기존 모달들이 "필요할 때만 마운트되는" 방식이라 open은 항상 true로 두고, 닫힘 요청은 onClose로 넘긴다.
// dismissible=false면 바깥 클릭/ESC/닫기 버튼으로 닫히지 않는다(진행 중 화면, 강제 확인 화면용).
// icon: 제목 위에 얹는 원형 아이콘 요소, footer: 하단 버튼 영역
export function AppDialog({
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'sm',
  dismissible = true,
  centered = false,
  className,
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && dismissible && onClose?.()}>
      <DialogContent
        showCloseButton={dismissible}
        className={cn('max-h-[90vh] gap-4 overflow-y-auto', SIZES[size], className)}
        onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
        onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
      >
        <DialogHeader className={cn(centered && 'items-center text-center')}>
          {icon && (
            <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:size-6">
              {icon}
            </div>
          )}
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="leading-relaxed">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

// 라벨/값 한 줄씩 나열 (상담 신청 완료 요약 등)
export function InfoList({ items }) {
  return (
    <dl className="m-0 divide-y rounded-lg border bg-muted/30 text-sm">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="m-0 text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
