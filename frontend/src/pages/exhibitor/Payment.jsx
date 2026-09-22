import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as PortOne from "@portone/browser-sdk/v2";
import { payGroup } from "../../api/payment";
import { PageContainer, PageHero } from "@/components/layout/Page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      setError("결제 금액을 확인할 수 없습니다. 마이페이지에서 다시 시도해주세요.");
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
      setError(err.response?.data?.error?.message ?? "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITOR MANAGEMENT PORTAL"
        title="참가비 결제"
        description="참가 신청 승인이 완료된 박람회의 부스 임차 및 참가 비용을 안전하게 결제합니다."
      />

      <PageContainer size="md">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">결제 수단 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={method} onValueChange={setMethod}>
                  <TabsList className="grid w-full grid-cols-3">
                    {METHODS.map((m) => (
                      <TabsTrigger key={m} value={m}>
                        {m}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">결제 진행 안내</CardTitle>
                <Badge variant="secondary">테스트 채널</Badge>
              </CardHeader>
              <CardContent>
                <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                  &apos;결제하기&apos; 클릭 시 실제 PortOne 결제창이 새로 열립니다. 결제 수단 정보(카드번호 등)는 그
                  결제창에서 직접 입력합니다. 테스트 채널로 연결되어 있어 실제 대금은 빠져나가지 않습니다.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">청구 내역 요약</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="m-0 text-xs text-muted-foreground">신청 박람회</p>
                <p className="m-0 mt-0.5 text-sm font-semibold">{expoTitle || "-"}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">신청 그룹</span>
                <strong>{groupId}</strong>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">최종 청구 금액</span>
                <strong className="text-2xl font-extrabold">₩{amount.toLocaleString()}</strong>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="button" size="lg" className="h-11" onClick={handlePay} disabled={paying}>
                {paying ? "결제 처리 중..." : `₩${amount.toLocaleString()} 안전 결제하기`}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/mypage")}>
                결제 취소
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}

export default Payment;
