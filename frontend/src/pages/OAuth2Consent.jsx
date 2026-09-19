import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { setAuth } from '../api/auth';
import TermsAgreement from '../components/TermsAgreement';
import './Signup.css';

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
    <div className="signup">
      <header className="signup__header">
        <Link to="/login" className="signup__brand">
          <img src={logoIcon} alt="" className="signup__logo" />
          <span>MOBILITY EXPO</span>
        </Link>
      </header>

      <main className="signup__main">
        <h1>서비스 이용 동의</h1>
        <p className="signup__subtitle">
          처음 이용하시는 계정입니다. 소셜 로그인으로 가입하려면 아래 약관에 동의해주세요.
        </p>

        <TermsAgreement
          agreeTerms={agreeTerms}
          agreePrivacy={agreePrivacy}
          onChangeTerms={setAgreeTerms}
          onChangePrivacy={setAgreePrivacy}
        />

        <div className="signup__actions">
          <button type="button" className="signup__back" onClick={() => navigate('/login')}>
            취소
          </button>
          <button
            type="button"
            className="signup__submit"
            disabled={submitting || !allAgreed}
            onClick={handleSubmit}
          >
            {submitting ? '처리 중...' : '동의하고 가입하기'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default OAuth2Consent;
