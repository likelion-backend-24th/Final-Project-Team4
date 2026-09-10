import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/identity";
import "./PasswordReset.css";

// 비밀번호 찾기 - 이메일 입력 후 재설정 링크 발송 요청.
function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      // 이메일 형식 오류(400) 실패.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pwreset">
      <div className="pwreset__card">
        <h1 className="pwreset__title">비밀번호 찾기</h1>
        {sent ? (
          <>
            <p className="pwreset__desc">
              입력하신 이메일로 재설정 링크를 보냈습니다. 메일함을 확인해주세요.
              링크는 30분간 유효합니다.
            </p>
            <Link to="/login" className="pwreset__link">
              로그인으로 돌아가기
            </Link>
          </>
        ) : (
          <>
            <p className="pwreset__desc">
              가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <form className="pwreset__form" onSubmit={handleSubmit}>
              <label className="pwreset__label">
                이메일
                <input
                  className="pwreset__input"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  required
                />
              </label>
              <button
                className="pwreset__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "전송 중..." : "재설정 링크 받기"}
              </button>
            </form>
            <Link to="/login" className="pwreset__link">
              로그인으로 돌아가기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
