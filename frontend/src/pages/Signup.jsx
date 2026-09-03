import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/login');
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
        <h1>참가업체 파트너 회원가입</h1>
        <p className="signup__subtitle">박람회 참가 신청을 위해 담당자 정보 및 업체 정보를 등록해주세요.</p>

        <form onSubmit={handleSubmit}>
          <section className="signup__section">
            <h2>1. 회원 정보 (담당자)</h2>
            <div className="signup__grid">
              <label>
                <span className="signup__label-row">이름 <span>*</span></span>
                <input placeholder="홍길동" required />
              </label>
              <label>
                <span className="signup__label-row">이메일 주소 <span>*</span></span>
                <input type="email" placeholder="name@company.com" required />
              </label>
              <label>
                <span className="signup__label-row">비밀번호 <span>*</span></span>
                <div className="signup__input-with-icon">
                  <input
                    type={showPw ? 'text' : 'password'}
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
                <input placeholder="예: 010-1234-5678" required />
              </label>
            </div>
          </section>

          <section className="signup__section">
            <h2>2. 업체 정보</h2>
            <div className="signup__grid">
              <label>
                <span className="signup__label-row">업체명 <span>*</span></span>
                <input placeholder="주식회사 모빌리티테크" required />
              </label>
              <label>
                <span className="signup__label-row">사업자등록번호 <span>*</span></span>
                <input placeholder="123-45-67890" required />
              </label>
              <label>
                <span className="signup__label-row">대표자명 <span>*</span></span>
                <input placeholder="이대표" required />
              </label>
              <label>
                <span className="signup__label-row">업종 <span>*</span></span>
                <input placeholder="전기차 부품 제조 / S/W 솔루션" required />
              </label>
              <label className="signup__full">
                <span className="signup__label-row">업체 주소 <span>*</span></span>
                <input placeholder="서울특별시 강남구 테헤란로 123, 4층" required />
              </label>
              <label className="signup__full">
                <span className="signup__label-row">업체 대표 연락처 <span>*</span></span>
                <input placeholder="예: 02-1234-5678" required />
              </label>
            </div>
          </section>

          <section className="signup__terms">
            <label className="signup__terms-all">
              <input type="checkbox" defaultChecked />
              이용약관 및 개인정보 수집·이용 동의 (전체 동의)
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
            <button type="submit" className="signup__submit">
              회원가입 완료
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default Signup;
