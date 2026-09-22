import { ChartColumn, ChevronDown, ChevronRight, ChevronUp, CreditCard, FileText, Settings, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { getMyBoothApplications } from "../../api/expo";
import { getMyPayments, refundBoothPayment } from "../../api/payment";
import { getMyProfile, withdrawAccount, updateExhibitorProfile } from "../../api/identity";
import { clearAuth, notifyProfileUpdated } from "../../api/auth";
import { isFoodBooth } from "../../utils/boothType";
import { formatPhoneNumber } from "../../utils/phone";
import { REFUND_REASONS } from "../../utils/customerData";
import { SelectField, TextField } from "../../components/form/fields";
import { AppDialog, InfoList } from "@/components/layout/AppDialog";
import { EmptyState, PageContainer } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_TONE = {
  심사중: "bg-amber-100 text-amber-700",
  "신청 승인": "bg-blue-100 text-blue-700",
  반려: "bg-red-100 text-red-700",
  임시저장: "bg-amber-100 text-amber-700",
  취소됨: "bg-red-100 text-red-700",
  미결제: "bg-slate-100 text-slate-600",
  결제완료: "bg-emerald-100 text-emerald-700",
  결제실패: "bg-red-100 text-red-700",
  결제중: "bg-amber-100 text-amber-700",
  "참가 확정": "bg-emerald-100 text-emerald-700",
  "참가 예정": "bg-amber-100 text-amber-700",
  참가중: "bg-emerald-100 text-emerald-700",
  "참가 완료": "bg-slate-100 text-slate-600",
};

const STATUS_LABEL = {
  DRAFT: "임시저장",
  SUBMITTED: "심사중",
  PAYMENT_PENDING: "신청 승인",
  CONFIRMED: "참가 확정",
  REJECTED: "반려",
  REFUND_REQUIRED: "환불 대기",
  CANCELLED: "취소됨",
};

// 결제 엔티티의 상태(PaymentStatus enum) → 화면 표시용 한글 라벨
const PAYMENT_STATUS_LABEL = {
  PENDING: "결제중",
  PAID: "결제완료",
  FAILED: "결제실패",
  CANCELLED: "취소됨",
};

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12 10:00)
const fmtDateTime = (iso) =>
  iso ? iso.slice(0, 16).replace("T", " ").replace(/-/g, ".") : null;

// ISO(2026-05-12T10:00:00) → 화면 표시용(2026.05.12)
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : null);

function MyPage() {
  const navigate = useNavigate();
  const [myApplications, setMyApplications] = useState([]);
  const [applicationGroups, setApplicationGroups] = useState([]); // 원본 신청 그룹 (부스 참가 이력 산출용)
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);

  // 업체 및 담당자 정보: 로그인한 사용자 프로필 (없으면 null - 로딩 중이거나 조회 실패)
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // 참가비 결제 내역: 실제 결제된 건 목록 (없으면 빈 배열 - 아직 결제한 게 없다는 뜻)
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState(null);

  const loadApplications = () =>
    getMyBoothApplications()
      .then((res) => {
        const rows = res.content.flatMap((group) => {
          // 결제 대상(승인, 결제대기) 부스 참가비 합계 - payment-context 합계와 맞아야 결제 통과
          const payableTotal = group.applications
            .filter((a) => a.status === "PAYMENT_PENDING")
            .reduce((sum, a) => sum + a.fee, 0);
          return group.applications.map((app) => ({
            id: app.applicationId,
            groupId: group.groupId,
            boothId: app.boothId,
            payableTotal,
            expoTitle: group.expoTitle,
            boothNo: `${app.boothNo} (${app.boothType})`,
            fee: app.fee,
            appliedAt: app.submittedAt
              ? app.submittedAt.slice(0, 10)
              : group.createdAt.slice(0, 10),
            status: STATUS_LABEL[app.status] ?? app.status,
            rejectReason: app.rejectReason,
            exhibitionItem: group.exhibitionItem,
            conceptDescription: group.conceptDescription,
            powerRequested: group.powerRequested,
            waterSupplyRequested: group.waterSupplyRequested,
            internetRequested: group.internetRequested,
            additionalRequest: group.additionalRequest,
          }));
        });
        setMyApplications(rows);
        setApplicationGroups(res.content);
      })
      .catch((err) =>
        setLoadError(
          err.response?.data?.error?.message ??
            "신청 내역을 불러오지 못했습니다.",
        ),
      );

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) =>
        setProfileError(
          err.response?.data?.error?.message ??
            "업체 정보를 불러오지 못했습니다.",
        ),
      );
  }, []);

  const loadPayments = () =>
    getMyPayments()
      .then(setPayments)
      .catch((err) =>
        setPaymentsError(
          err.response?.data?.error?.message ??
            "결제 내역을 불러오지 못했습니다.",
        ),
      );

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 부스 참가 취소(전액 환불) 모달 - "참가 확정" 상태 그룹에서만 열림
  const [refundTarget, setRefundTarget] = useState(null); // { groupId, expoTitle, amount } | null
  const refundForm = useForm({ defaultValues: { reason: REFUND_REASONS[0].value, customReason: "" } });
  const refundReason = refundForm.watch("reason");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState(null);

  const openRefundModal = (group) => {
    const payment = payments.find((p) => p.bookingId === group.groupId);
    setRefundTarget({
      groupId: group.groupId,
      expoTitle: group.expoTitle,
      amount: payment?.amount ?? group.applications
        .filter((a) => a.status === "CONFIRMED")
        .reduce((sum, a) => sum + a.fee, 0),
    });
    refundForm.reset({ reason: REFUND_REASONS[0].value, customReason: "" });
    setRefundError(null);
  };

  const handleRefund = async (values) => {
    const isOther = values.reason === "기타";
    if (isOther && !values.customReason.trim()) {
      setRefundError("취소 사유를 입력해 주세요.");
      return;
    }
    setRefunding(true);
    setRefundError(null);
    try {
      const reason = isOther ? values.customReason.trim() : values.reason;
      await refundBoothPayment({ bookingId: refundTarget.groupId, reason });
      setRefundTarget(null);
      await Promise.all([loadApplications(), loadPayments()]);
      alert("부스 참가가 취소되고 환불 처리되었습니다.");
    } catch (err) {
      setRefundError(err.response?.data?.error?.message ?? "환불 처리 중 오류가 발생했습니다.");
    } finally {
      setRefunding(false);
    }
  };

  // "부스 참가 신청 현황"과 "참가비 결제 내역"을 신청 그룹(groupId = bookingId) 기준으로 합쳐서
  // 결제 내역 표에 보여줄 한 줄씩을 만듦.
  // - 승인(신청 승인) 이전 단계(심사중/반려/임시저장)인 신청은 아직 결제 대상이 아니므로 표에서 제외
  // - 실제 결제(Payment) 기록이 있으면 그 결과(결제완료/결제실패/취소됨)를 보여줌
  // - 결제 기록이 없으면 "미결제"로 표시하고, 청구 금액은 승인된 부스 참가비 합계를 보여줌
  const paymentHistory = useMemo(() => {
    const groups = new Map();
    myApplications.forEach((app) => {
      if (!groups.has(app.groupId)) {
        groups.set(app.groupId, {
          groupId: app.groupId,
          expoTitle: app.expoTitle,
          payableTotal: app.payableTotal,
          isBillable: false,
        });
      }
      if (app.status === "신청 승인" || app.status === "참가 확정") {
        groups.get(app.groupId).isBillable = true;
      }
    });

    return Array.from(groups.values())
      .filter((g) => g.isBillable)
      .map((g) => {
        const payment = payments.find((p) => p.bookingId === g.groupId);
        if (payment) {
          return {
            id: g.groupId,
            expoTitle: g.expoTitle,
            amount: payment.amount,
            status: PAYMENT_STATUS_LABEL[payment.status] ?? payment.status,
            paidAt: fmtDateTime(payment.approvedAt),
          };
        }
        return {
          id: g.groupId,
          expoTitle: g.expoTitle,
          amount: g.payableTotal,
          status: "미결제",
          paidAt: null,
        };
      });
  }, [myApplications, payments]);

  // 부스 참가 이력 - 확정된 부스가 하나라도 있는 신청 그룹.
  const participationHistory = useMemo(() => {
    const now = Date.now();
    const seen = new Set();
    return applicationGroups
      .filter((g) => g.applications.some((a) => a.status === "CONFIRMED"))
      .filter((g) => {
        if (seen.has(g.expoId)) return false;
        seen.add(g.expoId);
        return true;
      })
      .map((g) => {
        const start = g.expoStartsAt ? new Date(g.expoStartsAt).getTime() : null;
        const end = g.expoEndsAt ? new Date(g.expoEndsAt).getTime() : null;
        let status = "참가중";
        if (start && now < start) status = "참가 예정";
        else if (end && now > end) status = "참가 완료";
        return {
          id: g.expoId,
          expoTitle: g.expoTitle,
          venue: g.expoVenue ?? "-",
          period: `${fmtDate(g.expoStartsAt)} - ${fmtDate(g.expoEndsAt)}`,
          status,
          sortKey: start ?? 0,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [applicationGroups]);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const editForm = useForm({
    defaultValues: {
      managerName: "", contact: "", companyName: "", representativeName: "", industry: "", companyContact: "", companyAddress: "",
    },
  });

  const openEditModal = () => {
    editForm.reset({
      managerName: profile.managerName ?? "",
      contact: profile.contact ?? "",
      companyName: profile.companyName ?? "",
      representativeName: profile.representativeName ?? "",
      industry: profile.industry ?? "",
      companyContact: profile.companyContact ?? "",
      companyAddress: profile.companyAddress ?? "",
    });
    setSaveError(null);
    setShowEditModal(true);
  };

  const handleSaveProfile = async (values) => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateExhibitorProfile(values);
      setProfile(updated);
      notifyProfileUpdated();
      setShowEditModal(false);
    } catch (err) {
      setSaveError(err.response?.data?.error?.message ?? "정보 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await withdrawAccount();
    } catch (err) {
      setWithdrawError(err.response?.data?.error?.message ?? "탈퇴 처리 중 오류가 발생했습니다.");
      setWithdrawing(false);
      return;
    }
    clearAuth();
    navigate("/login");
  };

  const facilityLabel = (app) => {
    const facilities = [];
    if (app.powerRequested) facilities.push("전기");
    if (app.waterSupplyRequested) facilities.push("수도/배수");
    if (app.internetRequested) facilities.push("인터넷선");
    return facilities.length > 0 ? facilities.join(", ") : "요청 없음";
  };

  return (
    <PageContainer className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">업체 및 담당자 정보</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openEditModal} disabled={!profile}>
            정보 수정
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profileError && <EmptyState tone="error">{profileError}</EmptyState>}
          {!profile && !profileError && <EmptyState>불러오는 중...</EmptyState>}
          {profile && (
            <>
              <ProfileSection
                title="회원정보 (담당자)"
                rows={[
                  ['담당자명', profile.managerName ?? '-'],
                  ['이메일 주소', profile.email ?? '-'],
                  ['휴대폰 번호', profile.contact ? formatPhoneNumber(profile.contact) : '-'],
                ]}
              />
              <Separator />
              <ProfileSection
                title="업체정보"
                rows={[
                  ['업체명', profile.companyName ?? '-'],
                  ['사업자등록번호', profile.businessNo ?? '-'],
                  ['대표자명', profile.representativeName ?? '-'],
                  ['업종', profile.industry ?? '-'],
                  ['대표 전화번호', profile.companyContact ? formatPhoneNumber(profile.companyContact) : '-'],
                  ['업체주소', profile.companyAddress ?? '-'],
                ]}
              />
            </>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                setWithdrawError(null);
                setShowWithdrawModal(true);
              }}
            >
              회원 탈퇴
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">부스 참가 신청 현황</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {loadError && <EmptyState tone="error">{loadError}</EmptyState>}
          {applicationGroups.length === 0 && !loadError && <EmptyState>신청 내역이 없습니다.</EmptyState>}
          {applicationGroups.map((group) => {
            const isOpen = openId === group.groupId;
            const totalCount = group.applications.length;
            const pendingCount = group.applications.filter((a) => a.status === 'SUBMITTED').length;
            const reviewComplete = pendingCount === 0;
            const payableApps = group.applications.filter((a) => a.status === 'PAYMENT_PENDING');
            const payableTotal = payableApps.reduce((sum, a) => sum + a.fee, 0);
            const confirmedApps = group.applications.filter((a) => a.status === 'CONFIRMED');
            const rejectedApps = group.applications.filter((a) => a.status === 'REJECTED' && a.rejectReason);
            const assemblyApps = group.applications.filter((a) => !isFoodBooth(a.boothType));
            const foodApps = group.applications.filter((a) => isFoodBooth(a.boothType));
            // 부스 관리 화면은 차량 전시용이라 확정된 조립 부스가 있을 때만 바로가기를 보여줌 (먹거리 부스만 있으면 숨김)
            const manageApp = confirmedApps.find((a) => !isFoodBooth(a.boothType));

            const boothSection = (label, apps) =>
              apps.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" key={label}>
                  <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {apps.map((app) => (
                      <span key={app.applicationId} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                        {app.boothNo}
                        <StatusBadge status={STATUS_LABEL[app.status] ?? app.status} />
                      </span>
                    ))}
                  </div>
                </div>
              );

            return (
              <div className="rounded-xl border" key={group.groupId}>
                <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{group.expoTitle}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(group.createdAt)} 신청</span>
                      <Badge variant="secondary" className={reviewComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {reviewComplete ? '심사 완료' : `심사 중 (${totalCount - pendingCount}/${totalCount} 완료)`}
                      </Badge>
                      {confirmedApps.length > 0 && (
                        <button
                          type="button"
                          className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-primary"
                          title="방문 통계·후기 보기 (참가 확정된 부스 전체 합산)"
                          onClick={() => navigate(`/mypage/booths/${confirmedApps[0].boothId}/insights`)}
                        >
                          <ChartColumn className="size-3.5" /> 통계
                        </button>
                      )}
                    </div>
                    {boothSection('조립 부스', assemblyApps)}
                    {boothSection('먹거리 부스', foodApps)}
                  </div>

                  <div className="flex w-full flex-col gap-1.5 sm:w-64">
                    {payableApps.length > 0 && reviewComplete && (
                      <Button
                        type="button"
                        className="justify-between"
                        onClick={() =>
                          navigate(`/payment/${group.groupId}`, {
                            state: { amount: payableTotal, expoTitle: group.expoTitle },
                          })
                        }
                      >
                        <span className="flex items-center gap-2">
                          <CreditCard />
                          결제하기 ({payableApps.length}개 부스 · {payableTotal.toLocaleString()}원)
                        </span>
                        <ChevronRight />
                      </Button>
                    )}
                    {payableApps.length === 0 && manageApp && (
                      <Button type="button" className="justify-between" onClick={() => navigate(`/mypage/booths/${manageApp.boothId}`)}>
                        <span className="flex items-center gap-2">
                          <Settings />
                          부스 관리 바로가기
                        </span>
                        <ChevronRight />
                      </Button>
                    )}
                    {payableApps.length === 0 && confirmedApps.length > 0 && (
                      <Button type="button" variant="outline" className="justify-between" onClick={() => openRefundModal(group)}>
                        <span className="flex items-center gap-2">
                          <Undo2 />
                          부스 참가 취소(환불)
                        </span>
                        <ChevronRight />
                      </Button>
                    )}
                    {payableApps.length > 0 && !reviewComplete && (
                      <Button type="button" variant="outline" disabled className="justify-start">
                        <CreditCard />
                        결제 대기 중
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between"
                      onClick={() => setOpenId(isOpen ? null : group.groupId)}
                    >
                      <span className="flex items-center gap-2">
                        <FileText />
                        {isOpen ? '접기' : '신청 상세 보기'}
                      </span>
                      {isOpen ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 border-t bg-muted/30 p-4 text-sm">
                    <dt className="text-muted-foreground">전시 품목</dt>
                    <dd className="m-0">{group.exhibitionItem}</dd>
                    <dt className="text-muted-foreground">전시 컨셉 설명</dt>
                    <dd className="m-0">{group.conceptDescription}</dd>
                    <dt className="text-muted-foreground">부대시설 요청</dt>
                    <dd className="m-0">{facilityLabel(group)}</dd>
                    <dt className="text-muted-foreground">추가 요청 사항</dt>
                    <dd className="m-0">{group.additionalRequest || '-'}</dd>
                    {rejectedApps.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">반려된 부스</dt>
                        <dd className="m-0">{rejectedApps.map((app) => `${app.boothNo}: ${app.rejectReason}`).join(' / ')}</dd>
                      </>
                    )}
                  </dl>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">참가비 결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsError && <EmptyState tone="error">{paymentsError}</EmptyState>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>박람회명</TableHead>
                <TableHead>청구 금액</TableHead>
                <TableHead>결제 상태</TableHead>
                <TableHead>결제 일시</TableHead>
                <TableHead className="text-right">영수증</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.length === 0 && !paymentsError && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    결제 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {paymentHistory.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.expoTitle}</TableCell>
                  <TableCell className="font-medium">₩{p.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className={p.paidAt ? '' : 'text-muted-foreground'}>{p.paidAt ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {p.status === '결제완료' ? (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0">
                        출력하기
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">발급 불가</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">부스 참가 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>박람회명</TableHead>
                <TableHead>전시 장소</TableHead>
                <TableHead>개최 기간</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participationHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    참가 이력이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {participationHistory.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.expoTitle}</TableCell>
                  <TableCell>{h.venue}</TableCell>
                  <TableCell>{h.period}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={h.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="rounded-2xl bg-slate-900 px-6 py-8 text-white md:px-10">
        <p className="m-0 mb-2 text-xs font-semibold tracking-[0.2em] text-sky-400">MOBILITY EXPO EXHIBITOR PORTAL</p>
        <h2 className="m-0 text-2xl font-bold">다음 박람회 참가도 지금 준비해보세요.</h2>
        <p className="mt-2 mb-0 text-sm text-slate-300">
          현재 모집 중인 박람회 목록에서 새로운 부스 참가 신청을 이어서 진행할 수 있습니다.
        </p>
      </section>

      {showEditModal && (
        <AppDialog onClose={() => !saving && setShowEditModal(false)} dismissible={!saving} size="md" title="정보 수정">
          <Form {...editForm}>
            <form className="flex flex-col gap-4" onSubmit={editForm.handleSubmit(handleSaveProfile)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={editForm.control} name="managerName" label="담당자명" />
                <TextField control={editForm.control} name="contact" label="휴대폰 번호" transform={formatPhoneNumber} />
                <TextField control={editForm.control} name="companyName" label="업체명" />
                <TextField control={editForm.control} name="representativeName" label="대표자명" />
                <TextField control={editForm.control} name="industry" label="업종" />
                <TextField control={editForm.control} name="companyContact" label="대표 전화번호" transform={formatPhoneNumber} />
              </div>
              <TextField control={editForm.control} name="companyAddress" label="업체주소" />
              {saveError && <p className="m-0 text-sm text-destructive">{saveError}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>
                  취소
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </Form>
        </AppDialog>
      )}

      {refundTarget && (
        <AppDialog
          onClose={() => !refunding && setRefundTarget(null)}
          dismissible={!refunding}
          title="부스 참가 취소"
          description={`${refundTarget.expoTitle} — 참가비 전액이 환불되고 배정된 부스 자리가 반납됩니다.`}
        >
          <InfoList items={[{ label: '환불 금액', value: `${refundTarget.amount.toLocaleString()}원` }]} />
          <Form {...refundForm}>
            <form className="flex flex-col gap-4" onSubmit={refundForm.handleSubmit(handleRefund)} noValidate>
              <SelectField control={refundForm.control} name="reason" label="취소 사유" required options={REFUND_REASONS} />
              {refundReason === '기타' && (
                <TextField
                  control={refundForm.control}
                  name="customReason"
                  label="사유 입력"
                  required
                  placeholder="취소 사유를 입력해 주세요"
                  maxLength={200}
                />
              )}
              {refundError && <p className="m-0 text-sm text-destructive">{refundError}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setRefundTarget(null)} disabled={refunding}>
                  닫기
                </Button>
                <Button type="submit" variant="destructive" disabled={refunding}>
                  {refunding ? '처리 중...' : '취소 및 환불 신청'}
                </Button>
              </div>
            </form>
          </Form>
        </AppDialog>
      )}

      {showWithdrawModal && (
        <AppDialog
          onClose={() => !withdrawing && setShowWithdrawModal(false)}
          dismissible={!withdrawing}
          title="회원 탈퇴"
          description="탈퇴 시 모든 서비스 이용이 제한되며, 가입하신 이메일로는 다시 가입할 수 없습니다. 정말 탈퇴하시겠습니까?"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowWithdrawModal(false)} disabled={withdrawing}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? '처리 중...' : '탈퇴하기'}
              </Button>
            </>
          }
        >
          {withdrawError && <p className="m-0 text-sm text-destructive">{withdrawError}</p>}
        </AppDialog>
      )}
    </PageContainer>
  );
}

function ProfileSection({ title, rows }) {
  return (
    <div>
      <h3 className="m-0 mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
      <dl className="m-0 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="m-0 mt-0.5 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <Badge variant="secondary" className={STATUS_TONE[status]}>
      {status}
    </Badge>
  );
}

export default MyPage;
