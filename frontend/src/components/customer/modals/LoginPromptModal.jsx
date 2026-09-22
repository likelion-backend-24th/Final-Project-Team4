import { LogIn } from 'lucide-react';
import { AppDialog } from '@/components/layout/AppDialog';
import { Button } from '@/components/ui/button';

// 비로그인 상태에서 로그인이 필요한 기능(상담 신청 등)을 시도했을 때 보여주는 안내 모달.
// EntryFlowModal의 LoginRequired 스텝과 같은 디자인을 로그인 화면 전체 강제 이동 없이 재사용한다.
function LoginPromptModal({ desc, onLogin, onClose }) {
  return (
    <AppDialog
      onClose={onClose}
      icon={<LogIn />}
      title="로그인이 필요합니다"
      description={desc}
      centered
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={onLogin}>로그인하러 가기</Button>
        </>
      }
    />
  );
}

export default LoginPromptModal;
