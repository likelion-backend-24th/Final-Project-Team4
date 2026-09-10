import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "../api/identity";
import "./PasswordReset.css";

// 재설정 링크 진입 화면. ?token=... 을 받아 새 비밀번호를 설정하고 로그인으로 보냄
function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const password = form.get("password");
    const confirm = form.get("confirm");

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      alert("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ??
          "링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="pwreset">
        <div className="pwreset__card">
          <h1 className="pwreset__title">잘못된 링크</h1>
          <p className="pwreset__desc">재설정 토큰이 없습니다. 링크를 다시 확인해주세요.</p>
          <Link to="/forgot-password" className="pwreset__link">
            비밀번호 다시 찾기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pwreset">
      <div className="pwreset__card">
        <h1 className="pwreset__title">새 비밀번호 설정</h1>
        <p className="pwreset__desc">8자 이상으로 새 비밀번호를 입력해주세요.</p>
        <form className="pwreset__form" onSubmit={handleSubmit}>
          <label className="pwreset__label">
            새 비밀번호
            <input
              className="pwreset__input"
              type="password"
              name="password"
              minLength={8}
              required
            />
          </label>
          <label className="pwreset__label">
            새 비밀번호 확인
            <input
              className="pwreset__input"
              type="password"
              name="confirm"
              minLength={8}
              required
            />
          </label>
          {error && <p className="pwreset__error">{error}</p>}
          <button className="pwreset__submit" type="submit" disabled={submitting}>
            {submitting ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
