import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { sendVerificationCode, confirmVerificationCode } from '../api/identity';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('user'); // 'user' | 'exhibitor'
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 이메일 인증 - 인증된 이메일과 현재 입력값이 같을 때만 '인증됨'으로 침(이메일을 바꾸면 다시 인증해야 함)
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const isEmailVerified = verifiedEmail !== null && verifiedEmail === email;

  const resetVerification = () => {
    setEmail('');
    setCodeSent(false);
    setCode('');
    setVerifiedEmail(null);
    setVerifyError('');
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    resetVerification();
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setVerifiedEmail(null); // 이메일을 바꾸면 이전 인증은 무효
    setCodeSent(false);
    setCode('');
    setVerifyError('');
  };

  const handleSendCode = async () => {
    if (!email) return;
    setSendingCode(true);
    setVerifyError('');
    try {
      await sendVerificationCode(email);
      setCodeSent(true);
    } catch (err) {
      setVerifyError(err.response?.data?.error?.message ?? '인증 코드 발송에 실패했습니다.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    setConfirmingCode(true);
    setVerifyError('');
    try {
      await confirmVerificationCode(email, code);
      setVerifiedEmail(email);
    } catch (err) {
      setVerifyError(err.response?.data?.error?.message ?? '인증 코드가 올바르지 않습니다.');
    } finally {
      setConfirmingCode(false);
    }
  };

  const emailField = (
    <>
      <input
        type="email"
        name="email"
        placeholder={tab === 'user' ? 'name@example.com' : 'name@company.com'}
        value={email}
        onChange={handleEmailChange}
        required
      />
      <div className="signup__verify">
        {isEmailVerified ? (
          <span className="signup__verify-done">인증 완료</span>
        ) : !codeSent ? (
          <button
            type="button"
            className="signup__verify-btn"
            onClick={handleSendCode}
            disabled={!email || sendingCode}
          >
            {sendingCode ? '발송 중...' : '인증하기'}
          </button>
        ) : (
          <div className="signup__verify-code-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="인증코드 6자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="signup__verify-code-input"
            />
            <button
              type="button"
              className="signup__verify-btn"
              onClick={handleConfirmCode}
              disabled={code.length !== 6 || confirmingCode}
            >
              {confirmingCode ? '확인 중...' : '확인'}
            </button>
            <button
              type="button"
              className="signup__verify-resend"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              재발송
            </button>
          </div>
        )}
      </div>
      {verifyError && <p className="signup__verify-error">{verifyError}</p>}
    </>
  );

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get('password') !== f.get('passwordConfirm')) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!isEmailVerified) {
      alert('이메일 인증을 먼저 완료해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/signup', {
        email: f.get('email'),
        password: f.get('password'),
        name: f.get('name'),
        phone: f.get('phone'),
      });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExhibitorSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get('password') !== f.get('passwordConfirm')) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!isEmailVerified) {
      alert('이메일 인증을 먼저 완료해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/exhibitors/signup', {
        businessNo: f.get('businessNo'),
        password: f.get('password'),
        email: f.get('email'),
        companyName: f.get('companyName'),
        managerName: f.get('managerName'),
        contact: f.get('contact'),
        companyAddress: f.get('companyAddress'),
        industry: f.get('industry'),
        representativeName: f.get('representativeName'),
        companyContact: f.get('companyContact'),
      });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup">
      <header className="signup__header">
        <Link to="/" className="signup__brand">
          <img src={logoIcon} alt="" className="signup__logo" />
          <span>MOBILITY EXPO</span>
        </Link>
        <p>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </header>

      <main className="signup__main">
        <h1>회원가입</h1>
        <p className="signup__subtitle">
          {tab === 'user'
            ? '이메일과 비밀번호로 가입하고 박람회 정보 조회와 상담 신청을 이용하세요.'
            : '박람회 참가 신청을 위해 담당자 정보 및 업체 정보를 등록해주세요.'}
        </p>

        <div className="signup__tabs">
          <button
            type="button"
            className={`signup__tab${tab === 'user' ? ' is-active' : ''}`}
            onClick={() => handleTabChange('user')}
          >
            일반 회원가입
          </button>
          <button
            type="button"
            className={`signup__tab${tab === 'exhibitor' ? ' is-active' : ''}`}
            onClick={() => handleTabChange('exhibitor')}
          >
            참가업체 회원가입
          </button>
        </div>

        {tab === 'user' ? (
          <form onSubmit={handleUserSubmit}>
            <section className="signup__section">
              <div className="signup__grid">
                <label>
                  <span className="signup__label-row">이름 <span>*</span></span>
                  <input name="name" placeholder="홍길동" required />
                </label>
                <label>
                  <span className="signup__label-row">전화번호 <span>*</span></span>
                  <input name="phone" placeholder="예: 010-1234-5678" required />
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">이메일 주소 <span>*</span></span>
                  {emailField}
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">비밀번호 <span>*</span></span>
                  <div className="signup__input-with-icon">
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      placeholder="8자 이상"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="signup__eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label="비밀번호 표시 전환"
                    />
                  </div>
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">비밀번호 확인 <span>*</span></span>
                  <div className="signup__input-with-icon">
                    <input
                      type={showPwConfirm ? 'text' : 'password'}
                      name="passwordConfirm"
                      placeholder="비밀번호를 한번 더 입력해주세요"
                      required
                    />
                    <button
                      type="button"
                      className="signup__eye"
                      onClick={() => setShowPwConfirm((v) => !v)}
                      aria-label="비밀번호 표시 전환"
                    />
                  </div>
                </label>
              </div>
            </section>

            <div className="signup__actions">
              <button type="button" className="signup__back" onClick={() => navigate(-1)}>
                이전으로
              </button>
              <button type="submit" className="signup__submit" disabled={submitting || !isEmailVerified}>
                {submitting ? '처리 중...' : '회원가입 완료'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleExhibitorSubmit}>
            <section className="signup__section">
              <h2>1. 회원 정보 (담당자)</h2>
              <div className="signup__grid">
                <label>
                  <span className="signup__label-row">이름 <span>*</span></span>
                  <input name="managerName" placeholder="홍길동" required />
                </label>
                <label>
                  <span className="signup__label-row">이메일 주소 <span>*</span></span>
                  {emailField}
                </label>
                <label>
                  <span className="signup__label-row">비밀번호 <span>*</span></span>
                  <div className="signup__input-with-icon">
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                      required
                    />
                    <button
                      type="button"
                      className="signup__eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label="비밀번호 표시 전환"
                    />
                  </div>
                </label>
                <label>
                  <span className="signup__label-row">비밀번호 확인 <span>*</span></span>
                  <div className="signup__input-with-icon">
                    <input
                      type={showPwConfirm ? 'text' : 'password'}
                      name="passwordConfirm"
                      placeholder="비밀번호를 한번 더 입력해주세요"
                      required
                    />
                    <button
                      type="button"
                      className="signup__eye"
                      onClick={() => setShowPwConfirm((v) => !v)}
                      aria-label="비밀번호 표시 전환"
                    />
                  </div>
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">연락처 <span>*</span></span>
                  <input name="contact" placeholder="예: 010-1234-5678" required />
                </label>
              </div>
            </section>

            <section className="signup__section">
              <h2>2. 업체 정보</h2>
              <div className="signup__grid">
                <label>
                  <span className="signup__label-row">업체명 <span>*</span></span>
                  <input name="companyName" placeholder="주식회사 모빌리티테크" required />
                </label>
                <label>
                  <span className="signup__label-row">사업자등록번호 <span>*</span></span>
                  <input name="businessNo" placeholder="1234567890" required />
                </label>
                <label>
                  <span className="signup__label-row">대표자명 <span>*</span></span>
                  <input name="representativeName" placeholder="이대표" required />
                </label>
                <label>
                  <span className="signup__label-row">업종 <span>*</span></span>
                  <input name="industry" placeholder="전기차 부품 제조 / S/W 솔루션" required />
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">업체 주소 <span>*</span></span>
                  <input name="companyAddress" placeholder="서울특별시 강남구 테헤란로 123, 4층" required />
                </label>
                <label className="signup__full">
                  <span className="signup__label-row">업체 대표 연락처 <span>*</span></span>
                  <input name="companyContact" placeholder="예: 02-1234-5678" required />
                </label>
              </div>
            </section>

            <section className="signup__terms">
              <label className="signup__terms-all">
                <input type="checkbox" defaultChecked />
                이용약관 및 개인정보 수집, 이용 동의 (전체 동의)
              </label>
              <div className="signup__terms-divider" />
              <ul>
                <li>
                  <span className="signup__term-check" />
                  [필수] 서비스 이용약관 동의
                </li>
                <li>
                  <span className="signup__term-check" />
                  [필수] 개인정보 수집 및 이용 동의
                </li>
                <li>
                  <span className="signup__term-check" />
                  [선택] 마케팅 정보 수신 및 이메일 수신 동의
                </li>
              </ul>
            </section>

            <div className="signup__actions">
              <button type="button" className="signup__back" onClick={() => navigate(-1)}>
                이전으로
              </button>
              <button type="submit" className="signup__submit" disabled={submitting || !isEmailVerified}>
                {submitting ? '처리 중...' : '회원가입 완료'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default Signup;
