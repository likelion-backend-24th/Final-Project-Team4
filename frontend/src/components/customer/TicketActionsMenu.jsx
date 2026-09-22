import { EllipsisVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 티켓 카드 우측의 "⋮" 메뉴 — 결제 내역 보기 / 환불 신청.
// shadcn DropdownMenu는 포탈로 렌더링되어 카드의 overflow에 잘리지 않는다.
function TicketActionsMenu({ onViewPayment, onRequestRefund, refundable }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="입장권 메뉴 열기">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem onSelect={onViewPayment}>결제 내역 보기</DropdownMenuItem>
        {refundable && (
          <DropdownMenuItem variant="destructive" onSelect={onRequestRefund}>
            환불 신청
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TicketActionsMenu;
