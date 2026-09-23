import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoIcon from '@/assets/M-Logo.png';
import apiClient from '@/api/client';
import { setAuth } from '@/api/auth';
import TermsAgreement from '@/components/TermsAgreement';
import { Button } from '@/components/ui/button';

// 소셜 로그인으로 처음 온 회원은 백엔드가 가입을 보류하고 이 화면으로 보냄
// 필수 약관에 동의해야 가입이 확정되고 로그인
function OAuth2Consent() {
  const navigate = useNavigate();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const allAgreed = agreeTerms && agreePrivacy;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 가입 보류 만료(401)를 토큰 재발급으로 재시도하지 않음
      const { data } = await apiClient.post('/api/auth/oauth/signup', null, { skipAuthRefresh: true });
      setAuth(data.data.accessToken, data.data.role);
      navigate('/customer', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '가입에 실패했습니다. 소셜 로그인을 다시 시도해주세요.');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="flex items-center border-b border-border bg-background px-4 py-3 md:px-8">
        <Link to="/login" className="flex items-center gap-2.5 text-foreground no-underline">
          <img src={logoIcon} alt="" className="size-10 rounded-md object-cover" />
          <span className="font-heading text-sm font-bold tracking-wide">MOBILITY EXPO</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="m-0 text-3xl font-bold tracking-tight">서비스 이용 동의</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          처음 이용하시는 계정입니다. 소셜 로그인으로 가입하려면 아래 약관에 동의해주세요.
        </p>

        <TermsAgreement
          agreeTerms={agreeTerms}
          agreePrivacy={agreePrivacy}
          onChangeTerms={setAgreeTerms}
          onChangePrivacy={setAgreePrivacy}
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/login')}>
            취소
          </Button>
          <Button type="button" size="lg" disabled={submitting || !allAgreed} onClick={handleSubmit}>
            {submitting ? '처리 중...' : '동의하고 가입하기'}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default OAuth2Consent;
