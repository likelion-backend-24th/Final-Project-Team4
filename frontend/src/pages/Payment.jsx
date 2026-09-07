import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as PortOne from "@portone/browser-sdk/v2";
import { payGroup } from "../api/payment";
import "./Payment.css";

// PortOne 결제 채널 식별용 공개 ID들 (비밀값 아님 - 프론트에 그대로 둬도 되는 값).
// 실제 카드 검증 비밀키(API Secret)는 절대 여기 두지 않고, 백엔드 환경변수(PORTONE_API_SECRET)로만 관리함.
const PORTONE_STORE_ID = "store-9663b602-88a9-4fcf-a8b7-adad963c46e3";
const PORTONE_CHANNEL_KEY = "channel-key-c5723eb4-9ee3-4df3-9c56-129d13d4e9d6";

const METHODS = ["신용카드", "실시간 계좌이체", "가상계좌 발급"];
// PortOne 결제창에 넘길 결제수단 코드. 그대로 우리 서버에도 저장함.
const PAY_METHOD_CODE = {
  신용카드: "CARD",
  "실시간 계좌이체": "TRANSFER",
  "가상계좌 발급": "VIRTUAL_ACCOUNT",
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

    // 결제 건마다 고유해야 하는 ID. PortOne 결제창과 우리 서버 양쪽에 동일한 값을 사용해서
    // 서버가 나중에 "이 ID로 결제된 게 진짜 맞는지" PortOne에 재확인할 수 있게 함.
    const paymentId = `pay-${crypto.randomUUID()}`;

    try {
      // 1. PortOne 결제창 호출 (실제 결제창이 뜸. 테스트 채널이라 실제 카드 대금은 빠져나가지 않음)
      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: expoTitle ? `${expoTitle} 부스 참가비` : "부스 참가비",
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: PAY_METHOD_CODE[method],
        redirectUrl: `${window.location.origin}/mypage`,
      });

      // 사용자가 결제창을 닫았거나 결제에 실패하면 response.code가 채워져서 옴
      if (response.code) {
        setError(response.message ?? "결제가 취소되었거나 실패했습니다.");
        setPaying(false);
        return;
      }

      // 2. 결제창에서 실제로 처리된 결제 건을 우리 서버가 PortOne에 재조회해서 검증하고 저장
      await payGroup({
        groupId,
        amount,
        payMethod: PAY_METHOD_CODE[method],
        paymentId,
      });
      alert("결제가 완료되었습니다.");
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

          <section className="payment__panel">
            <div className="payment__panel-header">
              <h2>결제 진행 안내</h2>
              <span className="payment__test-tag">테스트 채널</span>
            </div>
            <p className="payment__notice">
              '결제하기' 클릭 시 실제 PortOne 결제창이 새로 열립니다. 결제
              수단 정보(카드번호 등)는 그 결제창에서 직접 입력합니다. 테스트
              채널로 연결되어 있어 실제 대금은 빠져나가지 않습니다.
            </p>
          </section>
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