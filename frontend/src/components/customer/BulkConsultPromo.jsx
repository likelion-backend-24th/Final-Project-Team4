import { Check, MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BulkConsultationModal from './modals/BulkConsultationModal';
import LoginPromptModal from './modals/LoginPromptModal';
import { isLoggedIn } from '@/api/auth.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CHECKLIST = ['여러 업체에 한 번에 신청', '간편한 정보 입력', '빠른 답변을 받아보세요'];

// 참가업체 목록 / 차량 상세 페이지에서 공통으로 쓰는 "여러 업체 한 번에 상담 신청" 사이드 프로모 박스.
// 넓은 화면(lg 이상)에서는 사이드바에 붙어 있고, 좁은 화면에서는 우측 하단 플로팅 버튼으로 접힌다.
// 상담 신청은 로그인한 회원만 가능 - 비로그인 상태면 로그인 유도 모달을 먼저 띄운다.
function BulkConsultPromo({ expoId, groups, lockedBoothId, defaultVehicle }) {
  const navigate = useNavigate();
  const [showBulkConsult, setShowBulkConsult] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 아직 참가 확정된 업체가 하나도 없으면(groups 비어있음) 상담 신청 폼을 열어봐야 고를 업체가
  // 없어 신청이 안 됨 - 버튼 자체를 막고 이유를 알려준다.
  const noExhibitors = groups.length === 0;

  const openBulkConsult = () => {
    if (noExhibitors) return;
    if (isLoggedIn()) {
      setShowBulkConsult(true);
    } else {
      setShowLoginPrompt(true);
    }
  };

  return (
    <>
      <aside className="hidden lg:block">
        <Card className="sticky top-24 bg-slate-900 text-white ring-0">
          <CardContent className="flex flex-col gap-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-sky-300">
              <MessageSquareText className="size-6" />
            </span>
            <h2 className="m-0 text-xl leading-snug font-bold">
              관심 있는 <span className="text-sky-300">모든 업체에</span>
              <br />
              <span className="text-sky-300">한 번에 상담 신청</span>
            </h2>
            <Button type="button" size="lg" className="h-auto whitespace-normal py-2.5" onClick={openBulkConsult} disabled={noExhibitors}>
              {noExhibitors ? '참가 업체가 생겨야 상담 신청이 가능해요' : '원클릭 상담 신청 →'}
            </Button>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-slate-300">
              {CHECKLIST.map((text) => (
                <li key={text} className="flex items-center gap-2">
                  <Check className="size-4 text-sky-300" />
                  {text}
                </li>
              ))}
            </ul>
            <p className="m-0 text-[10px] font-semibold tracking-[0.2em] text-slate-500">
              CONNECT FOR A BETTER MOBILITY
            </p>
          </CardContent>
        </Card>
      </aside>

      {/* 좁은 화면에서만 보이는 우측 하단 고정 플로팅 버튼 */}
      <Button
        type="button"
        size="lg"
        className="fixed right-4 bottom-4 z-30 rounded-full shadow-lg lg:hidden"
        onClick={openBulkConsult}
        disabled={noExhibitors}
      >
        <MessageSquareText />
        상담 신청
      </Button>

      {showBulkConsult && (
        <BulkConsultationModal
          expoId={expoId}
          groups={groups}
          lockedBoothId={lockedBoothId}
          defaultVehicle={defaultVehicle}
          onClose={() => setShowBulkConsult(false)}
        />
      )}

      {showLoginPrompt && (
        <LoginPromptModal
          desc="상담 신청은 로그인한 회원만 이용할 수 있습니다."
          onLogin={() => navigate('/login')}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </>
  );
}

export default BulkConsultPromo;
