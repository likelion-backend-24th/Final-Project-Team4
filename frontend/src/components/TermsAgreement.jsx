import { Link } from 'react-router-dom';
import './TermsAgreement.css';

// 회원가입, 소셜 로그인 최초 가입 화면 공통 필수 약관 동의 영역
// 약관 원문은 새 탭으로 열어 입력 중인 내용이 유지되게 함
function TermsAgreement({ agreeTerms, agreePrivacy, onChangeTerms, onChangePrivacy }) {
  const allAgreed = agreeTerms && agreePrivacy;

  return (
    <section className="terms-agreement">
      <label className="terms-agreement__all">
        <input
          type="checkbox"
          checked={allAgreed}
          onChange={(e) => {
            onChangeTerms(e.target.checked);
            onChangePrivacy(e.target.checked);
          }}
        />
        이용약관 및 개인정보 수집, 이용 동의 (전체 동의)
      </label>
      <div className="terms-agreement__divider" />
      <ul>
        <li>
          <label className="terms-agreement__item">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => onChangeTerms(e.target.checked)}
            />
            [필수] 서비스 이용약관 동의
          </label>
          <Link to="/terms" target="_blank" className="terms-agreement__view">
            보기
          </Link>
        </li>
        <li>
          <label className="terms-agreement__item">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => onChangePrivacy(e.target.checked)}
            />
            [필수] 개인정보 수집 및 이용 동의
          </label>
          <Link to="/privacy" target="_blank" className="terms-agreement__view">
            보기
          </Link>
        </li>
      </ul>
    </section>
  );
}

export default TermsAgreement;
