import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import apiClient from '../api/client';
import { setAuth } from '../api/auth';
import './Login.css';

function Login() {
  const [role, setRole] = useState('exhibitor');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const password = form.get('password');
    setSubmitting(true);
    try {
      const { data } =
        role === 'admin'
          ? await apiClient.post('/api/auth/signin', {
              email: form.get('email'),
              password,
            })
          : await apiClient.post('/api/auth/exhibitors/signin', {
              businessNo: form.get('businessNo'),
              password,
            });
      setAuth(data.data.accessToken, data.data.role);
      navigate(role === 'admin' ? '/admin' : '/');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login__form-pane">
        <div className="login__form-header">
          <h1 className="login__title">환영합니다</h1>
          <p className="login__subtitle">모빌리티 엑스포 통합 파트너 포털 로그인</p>
        </div>

        <div className="login__role-tabs">
          <button
            type="button"
            className={`login__tab ${role === 'exhibitor' ? 'is-active' : ''}`}
            onClick={() => setRole('exhibitor')}
          >
            참가업체
          </button>
          <button
            type="button"
            className={`login__tab ${role === 'admin' ? 'is-active' : ''}`}
            onClick={() => setRole('admin')}
          >
            관리자
          </button>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-fields">
            <div className="login__field">
              <div className="login__label-row">
                <span className="login__label">
                  {role === 'admin' ? '이메일 주소' : '사업자등록번호'}
                </span>
                <span className="login__required">*</span>
              </div>
              <div className="login__input-container">
                {role === 'admin' ? (
                  <input type="email" name="email" placeholder="name@company.com" required />
                ) : (
                  <input type="text" name="businessNo" placeholder="1234567890" required />
                )}
              </div>
            </div>

            <div className="login__field">
              <div className="login__label-row">
                <span className="login__label">비밀번호</span>
                <span className="login__required">*</span>
              </div>
              <div className="login__input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="비밀번호를 입력해주세요"
                  required
                />
                <button
                  type="button"
                  className="login__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="비밀번호 표시 전환"
                />
              </div>
            </div>
          </div>

          <div className="login__options">
            <label className="login__remember">
              <input type="checkbox" />
              로그인 상태 유지
            </label>
            <a href="#!" className="login__find-pw">
              비밀번호 찾기
            </a>
          </div>

          <div className="login__actions">
            <button type="submit" className="login__submit" disabled={submitting}>
              {submitting ? '로그인 중...' : '로그인'}
            </button>
            <p className="login__signup-guide">
              <span className="login__guide-text">아직 계정이 없으신가요?</span>
              <Link to="/signup" className="login__signup-link">
                회원가입
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="login__hero-pane">
        <div className="login__logo">
          <img src={logoIcon} alt="" className="login__logo-icon" />
          <span className="login__logo-text">MOBILITY EXPO</span>
        </div>

        <div className="login__hero-content">
          <p className="login__hero-eyebrow">MOBILITY EXPO EXHIBITOR PORTAL</p>
          <h2 className="login__hero-heading">
            미래 모빌리티의 주인공,
            <br />
            지금 부스 참가를 신청하세요.
          </h2>
          <p className="login__hero-desc">
            국내외 최정상 모빌리티 기업들이 참여하는 비즈니스 플랫폼. 단 몇 번의 클릭으로 박람회 참가
            신청부터 부스 위치 신청까지 실시간으로 관리해보세요.
          </p>
        </div>

        <div className="login__hero-footer">
          <p className="login__footer-info">© 2026 MOBILITY EXPO. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
