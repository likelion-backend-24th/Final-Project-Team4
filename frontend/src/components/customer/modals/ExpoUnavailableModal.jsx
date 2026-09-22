import { CircleAlert } from 'lucide-react';
import { AppDialog } from '@/components/layout/AppDialog';
import { Button } from '@/components/ui/button';

// 박람회 상세를 보는 중에 관리자가 비공개로 전환했거나 삭제해서 더 이상 조회할 수 없게 됐을 때 보여주는 안내 모달.
// 뒤에 보여줄 데이터가 없으므로 닫기 없이 목록으로 돌아가는 버튼만 둔다.
function ExpoUnavailableModal({ onConfirm }) {
  return (
    <AppDialog
      dismissible={false}
      icon={<CircleAlert className="text-destructive" />}
      title="이용할 수 없는 박람회입니다"
      description="삭제되었거나 비공개로 전환된 박람회예요."
      centered
      footer={<Button onClick={onConfirm}>목록으로 돌아가기</Button>}
    />
  );
}

export default ExpoUnavailableModal;
