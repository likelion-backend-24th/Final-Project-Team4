import { Check } from 'lucide-react';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Button } from '@/components/ui/button';

// 상담 신청 완료 팝업 (VehicleDetail 페이지의 상담 신청 폼 제출 후 표시)
function ConsultationCompleteModal({ summary, onClose }) {
  return (
    <AppDialog
      onClose={onClose}
      icon={<Check />}
      title="상담 신청이 완료되었습니다!"
      description="선택하신 일정에 맞춰 담당자가 개별적으로 연락드릴 예정입니다."
      centered
      footer={<Button onClick={onClose}>확인</Button>}
    >
      <InfoList
        items={[
          { label: '신청 업체', value: summary.exhibitorNames },
          { label: '상담 일시', value: summary.schedule },
          { label: '연락처', value: summary.phone },
          { label: '이메일', value: summary.email },
        ]}
      />
    </AppDialog>
  );
}

export default ConsultationCompleteModal;
