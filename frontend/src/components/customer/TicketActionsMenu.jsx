import { useEffect, useRef, useState } from 'react';
import './TicketActionsMenu.css';

// 티켓 카드 우측의 "⋮" 메뉴 — 결제 내역 보기 / 환불 신청.
// 무료 방문예약(isPaid=false)에는 애초에 결제 내역이 없으므로 메뉴 자체를 렌더링하지 않는다(호출부에서 분기).
function TicketActionsMenu({ onViewPayment, onRequestRefund, refundable }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="tam-root" ref={rootRef}>
      <button
        type="button"
        className="tam-trigger"
        aria-label="입장권 메뉴 열기"
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open && (
        <div className="tam-menu">
          <button
            type="button"
            className="tam-menu__item"
            onClick={() => {
              setOpen(false);
              onViewPayment();
            }}
          >
            결제 내역 보기
          </button>
          {refundable && (
            <button
              type="button"
              className="tam-menu__item tam-menu__item--danger"
              onClick={() => {
                setOpen(false);
                onRequestRefund();
              }}
            >
              환불 신청
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketActionsMenu;