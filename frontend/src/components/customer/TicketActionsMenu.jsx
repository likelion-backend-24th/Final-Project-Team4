import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
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
  const [open, setOpen] = useState(false); // 항목 선택 시 여는 모달(Dialog)과 Radix의 자동 닫힘 처리가 겹쳐 발생하는 레이스 방지를 위해
                                                            // open을 직접 제어해 우리가 명시적으로 드롭다운을 먼저 닫은 뒤 모달 오픈

  const handleSelect = (fn) => (e) => {
    e.preventDefault();
    setOpen(false);
    fn();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="입장권 메뉴 열기">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-36"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem onSelect={handleSelect(onViewPayment)}>결제 내역 보기</DropdownMenuItem>
        {refundable && (
          <DropdownMenuItem variant="destructive" onSelect={handleSelect(onRequestRefund)}>
            환불 신청
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TicketActionsMenu;
