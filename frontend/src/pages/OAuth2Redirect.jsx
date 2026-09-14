import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuth } from "../api/auth";

// 소셜 로그인 성공/실패 후 백엔드가 accessToken 또는 error를 쿼리로 실어 리다이렉트하는 도착 화면
function OAuth2Redirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken = searchParams.get("accessToken");
    const error = searchParams.get("error");

    if (error) {
      alert(
        error === "DUPLICATE"
          ? "이미 참가업체로 가입된 이메일입니다."
          : "소셜 로그인에 실패했습니다.",
      );
      navigate("/login", { replace: true });
      return;
    }

    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    setAuth(accessToken, searchParams.get("role"));
    navigate("/customer", { replace: true });
  }, [searchParams, navigate]);

  return null;
}

export default OAuth2Redirect;
