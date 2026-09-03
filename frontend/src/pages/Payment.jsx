import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { payGroup } from "../api/payment";
import "./Payment.css";

const METHODS = ["신용카드", "실시간 계좌이체", "가상계좌 발급"];
const METHOD_CODE = {
  신용카드: "CARD",
  "실시간 계좌이체": "TRANSFER",
  "가상계좌 발급": "VBANK",
};

function Payment() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { state } = useLocation();
  // 마이페이지 결제하기 버튼에서 넘겨준 결제 대상 합계, 박람회명
  const amount = state?.amount ?? 0;
  const expoTitle = state?.expoTitle ?? "";
  const [method, setMethod] = useState("신용카드");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    if (!amount) {
      setError(
        "결제 금액을 확인할 수 없습니다. 마이페이지에서 다시 시도해주세요.",
      );
      return;
    }
    setPaying(true);
    setError(null);
    try {
      await payGroup({ groupId, amount, payMethod: METHOD_CODE[method] });
      alert("테스트 결제가 완료되었습니다. (Mock)");
      navigate("/mypage");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ??
          "결제 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="payment">
      <section className="payment__hero">
        <p className="payment__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>참가비 결제</h1>
        <p>
          참가 신청 승인이 완료된 박람회의 부스 임차 및 참가 비용을 안전하게
          결제합니다.
        </p>
      </section>

      <div className="payment__body">
        <div className="payment__main">
          <section className="payment__panel">
            <h2>결제 수단 선택</h2>
            <div className="payment__methods">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={m === method ? "is-active" : ""}
                  onClick={() => setMethod(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          {method === "신용카드" && (
            <section className="payment__panel">
              <div className="payment__panel-header">
                <h2>카드 정보 입력 (Mock 테스트용)</h2>
                <span className="payment__test-tag">테스트 환경</span>
              </div>
              <label>카드 번호</label>
              <div className="payment__card-number">
                <input placeholder="••••" maxLength={4} />
                <input placeholder="••••" maxLength={4} />
                <input placeholder="••••" maxLength={4} />
                <input placeholder="1234" maxLength={4} />
              </div>
              <div className="payment__grid">
                <label>
                  유효기간 (MM/YY)
                  <input placeholder="MM / YY" />
                </label>
                <label>
                  CVC 번호
                  <input placeholder="카드 뒷면 3자리 숫자" />
                </label>
              </div>
              <p className="payment__notice">
                안내: 해당 결제 단계는 테스트 시뮬레이션 환경으로 실 결제는
                발생하지 않으며, '결제하기' 클릭 시 결제 성공으로 자동
                처리됩니다.
              </p>
            </section>
          )}
        </div>

        <aside className="payment__side">
          <h3>청구 내역 요약</h3>
          <p className="payment__label">신청 박람회</p>
          <p className="payment__value">{expoTitle || "-"}</p>

          <div className="payment__row">
            <span>신청 그룹</span>
            <strong>{groupId}</strong>
          </div>

          <div className="payment__total">
            <span>최종 청구 금액</span>
            <strong>₩{amount.toLocaleString()}</strong>
          </div>

          {error && (
            <p className="payment__notice" style={{ color: "#d33" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="payment__cta"
            onClick={handlePay}
            disabled={paying}
          >
            {paying
              ? "결제 처리 중..."
              : `₩${amount.toLocaleString()} 안전 결제하기`}
          </button>
          <button
            type="button"
            className="payment__cancel"
            onClick={() => navigate("/mypage")}
          >
            결제 취소
          </button>
        </aside>
      </div>
    </div>
  );
}

export default Payment;
