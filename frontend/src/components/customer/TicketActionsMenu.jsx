import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './TicketActionsMenu.css';

// 티켓 카드 우측의 "⋮" 메뉴 — 결제 내역 보기 / 환불 신청.
// 카드에 overflow: hidden이 걸려 있으면 드롭다운이 카드 밖으로 나갈 때 잘리는 문제가 있어서,
// 메뉴를 document.body에 포탈로 그리고 트리거 버튼 위치를 기준으로 좌표를 직접 계산해 배치한다.
function TicketActionsMenu({ onViewPayment, onRequestRefund, refundable }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const computeCoords = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 148;
    // 트리거 오른쪽 끝에 메뉴 오른쪽 끝을 맞추되, 화면 왼쪽으로 넘치지 않게 보정
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    setCoords({ top: rect.bottom + 6, left });
  };

  const toggleOpen = () => {
    if (!open) computeCoords();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    // 스크롤/리사이즈되면 좌표가 어긋나므로 그냥 닫는다 (재계산보다 단순하고 안전함)
    const handleScrollOrResize = () => setOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="tam-root">
      <button
        type="button"
        className="tam-trigger"
        ref={triggerRef}
        aria-label="입장권 메뉴 열기"
        onClick={toggleOpen}
      >
        ⋮
      </button>
      {open &&
        createPortal(
          <div
            className="tam-menu tam-menu--portal"
            ref={menuRef}
            style={{ top: coords.top, left: coords.left }}
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}

export default TicketActionsMenu;