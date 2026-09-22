import { MessageSquareText } from 'lucide-react';
import loadingCarImage from '@/assets/car-image.png';
import { AppDialog } from '@/components/layout/AppDialog';

// 상담 신청/수정 저장 중(AI 요약 생성 포함) 대기 화면. 실제 진행률과 무관하게 차가 계속 앞으로만 달린다.
function ConsultationLoadingOverlay() {
  return (
    <AppDialog
      dismissible={false}
      icon={<MessageSquareText />}
      title="상담 신청중입니다"
      description="잠시만 기다려주세요. 원활한 상담을 위해 최선을 다하고 있습니다."
      centered
    >
      <div className="relative h-14 overflow-hidden rounded-lg bg-muted">
        <img
          src={loadingCarImage}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 h-10 -translate-y-1/2 animate-[drive_2.4s_linear_infinite]"
        />
      </div>
    </AppDialog>
  );
}

export default ConsultationLoadingOverlay;
