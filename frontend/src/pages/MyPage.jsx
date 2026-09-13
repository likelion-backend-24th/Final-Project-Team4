import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBoothApplications } from "../api/expo";
import { getMyPayments } from "../api/payment";
import { getMyProfile, withdrawAccount, updateExhibitorProfile } from "../api/identity";
import { clearAuth, notifyProfileUpdated } from "../api/auth";
import "../components/customer/Modal.css";
import "../components/customer/EntryFlowModal.css";
import "./MyPage.css";

const STATUS_BADGE = {
  심사중: "badge--pending",
  "신청 승인": "badge--approved",
  반려: "badge--rejected",
  임시저장: "badge--pending",
  취소됨: "badge--rejected",
  미결제: "badge--unpaid",
  결제완료: "badge--paid",
  결제실패: "badge--rejected",
  결제중: "badge--pending",
  "참가 예정": "badge--pending",
  참가중: "badge--approved",
  "참가 완료": "badge--done",
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

  useEffect(() => {
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

  useEffect(() => {
    getMyPayments()
      .then(setPayments)
      .catch((err) =>
        setPaymentsError(
          err.response?.data?.error?.message ??
            "결제 내역을 불러오지 못했습니다.",
        ),
      );
  }, []);

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
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const openEditModal = () => {
    setEditForm({
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

  const handleEditField = (field) => (e) =>
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateExhibitorProfile(editForm);
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
    <div className="mypage">
      <div className="mypage__main">
        <section className="mypage__card">
          <div className="mypage__card-header">
            <h2>업체 및 담당자 정보</h2>
            <button type="button" className="mypage__edit-btn" onClick={openEditModal} disabled={!profile}>
              정보 수정
            </button>
          </div>
          <div className="mypage__divider" />
          {profileError && <p className="mypage__cell-muted">{profileError}</p>}
          {!profile && !profileError && (
            <p className="mypage__cell-muted">불러오는 중...</p>
          )}
          {profile && (
            <>
              <h3 className="mypage__profile-subtitle">회원정보 (담당자)</h3>
              <div className="mypage__profile-grid">
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">담당자명</span>
                    <span className="mypage__profile-value">
                      {profile.managerName ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">이메일 주소</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.email ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">휴대폰 번호</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.contact ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mypage__divider" />

              <h3 className="mypage__profile-subtitle">업체정보</h3>
              <div className="mypage__profile-grid">
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">업체명</span>
                    <span className="mypage__profile-value">
                      {profile.companyName ?? "-"}
                    </span>
                  </div>
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">사업자등록번호</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.businessNo ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">대표자명</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.representativeName ?? "-"}
                    </span>
                  </div>
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">업종</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.industry ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="mypage__profile-col">
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">대표 전화번호</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.companyContact ?? "-"}
                    </span>
                  </div>
                  <div className="mypage__profile-row">
                    <span className="mypage__profile-label">업체주소</span>
                    <span className="mypage__profile-value mypage__profile-value--regular">
                      {profile.companyAddress ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          <button
            type="button"
            className="mypage__withdraw"
            onClick={() => {
              setWithdrawError(null);
              setShowWithdrawModal(true);
            }}
          >
            회원 탈퇴
          </button>
        </section>

        <section className="mypage__card">
          <h2>부스 참가 신청 현황</h2>
          {loadError && <p className="mypage__cell-muted">{loadError}</p>}
          <div className="mypage__table-scroll">
            <table className="mypage__table">
              <thead>
                <tr>
                  <th className="mypage__col-flex">박람회명</th>
                  <th className="mypage__col-120">부스번호</th>
                  <th className="mypage__col-140">신청일</th>
                  <th className="mypage__col-100">진행 상태</th>
                  <th className="mypage__col-120 mypage__col-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {myApplications.length === 0 && !loadError && (
                  <tr>
                    <td colSpan={5} className="mypage__cell-muted">
                      신청 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {myApplications.map((app) => {
                  const isOpen = openId === app.id;
                  return (
                    <Fragment key={app.id}>
                      <tr>
                        <td className="mypage__cell-strong">{app.expoTitle}</td>
                        <td>{app.boothNo}</td>
                        <td>{app.appliedAt}</td>
                        <td>
                          <span
                            className={`mypage__badge ${STATUS_BADGE[app.status] ?? ""}`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="mypage__col-right">
                          {app.status === "신청 승인" ? (
                            <button
                              className="mypage__link"
                              onClick={() =>
                                navigate(`/payment/${app.groupId}`, {
                                  state: {
                                    amount: app.payableTotal,
                                    expoTitle: app.expoTitle,
                                  },
                                })
                              }
                            >
                              결제하기
                            </button>
                          ) : app.status === "참가 확정" ? (
                            <button
                              className="mypage__link"
                              onClick={() => navigate(`/mypage/booths/${app.boothId}`)}
                            >
                              부스 관리
                            </button>
                          ) : (
                            <button
                              className="mypage__link"
                              onClick={() => setOpenId(isOpen ? null : app.id)}
                            >
                              {isOpen ? "접기" : "신청 상세"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5}>
                            <dl className="mypage__detail">
                              <dt>전시 품목</dt>
                              <dd>{app.exhibitionItem}</dd>
                              <dt>전시 컨셉 설명</dt>
                              <dd>{app.conceptDescription}</dd>
                              <dt>부대시설 요청</dt>
                              <dd>{facilityLabel(app)}</dd>
                              <dt>추가 요청 사항</dt>
                              <dd>{app.additionalRequest || "-"}</dd>
                              <dt>부스 임차료</dt>
                              <dd>
                                {app.fee
                                  ? `${app.fee.toLocaleString()} 원`
                                  : "-"}
                              </dd>
                              {app.rejectReason && (
                                <>
                                  <dt>반려 사유</dt>
                                  <dd>{app.rejectReason}</dd>
                                </>
                              )}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mypage__card">
          <h2>참가비 결제 내역</h2>
          {paymentsError && <p className="mypage__cell-muted">{paymentsError}</p>}
          <div className="mypage__table-scroll">
            <table className="mypage__table">
              <thead>
                <tr>
                  <th className="mypage__col-flex">박람회명</th>
                  <th className="mypage__col-150">청구 금액</th>
                  <th className="mypage__col-120">결제 상태</th>
                  <th className="mypage__col-140">결제 일시</th>
                  <th className="mypage__col-120 mypage__col-right">영수증</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length === 0 && !paymentsError && (
                  <tr>
                    <td colSpan={5} className="mypage__cell-muted">
                      결제 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {paymentHistory.map((p) => (
                  <tr key={p.id}>
                    <td className="mypage__cell-strong">{p.expoTitle}</td>
                    <td className="mypage__cell-strong">
                      ₩{p.amount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`mypage__badge ${STATUS_BADGE[p.status] ?? ""}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className={p.paidAt ? "" : "mypage__cell-muted"}>
                      {p.paidAt ?? "-"}
                    </td>
                    <td className="mypage__col-right">
                      {p.status === "결제완료" ? (
                        <button className="mypage__link">출력하기</button>
                      ) : (
                        <span className="mypage__cell-muted">발급 불가</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mypage__card">
          <h2>부스 참가 이력</h2>
          <div className="mypage__table-scroll">
            <table className="mypage__table">
              <thead>
                <tr>
                  <th className="mypage__col-flex">박람회명</th>
                  <th className="mypage__col-150">전시 장소</th>
                  <th className="mypage__col-140">개최 기간</th>
                  <th className="mypage__col-120 mypage__col-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {participationHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="mypage__cell-muted">
                      참가 이력이 없습니다.
                    </td>
                  </tr>
                )}
                {participationHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="mypage__cell-strong">{h.expoTitle}</td>
                    <td>{h.venue}</td>
                    <td>{h.period}</td>
                    <td className="mypage__col-right">
                      <span
                        className={`mypage__badge ${STATUS_BADGE[h.status] ?? ""}`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mypage__banner">
        <p className="mypage__banner-eyebrow">MOBILITY EXPO EXHIBITOR PORTAL</p>
        <h2 className="mypage__banner-title">
          다음 박람회 참가도 지금 준비해보세요.
        </h2>
        <p className="mypage__banner-desc">
          현재 모집 중인 박람회 목록에서 새로운 부스 참가 신청을 이어서 진행할
          수 있습니다.
        </p>
      </section>

      {showEditModal && (
        <div className="c-modal__backdrop" onClick={() => !saving && setShowEditModal(false)}>
          <div className="c-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="c-modal__close"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
              aria-label="닫기"
            >
              ✕
            </button>
            <h2>정보 수정</h2>
            <div className="ef-field-row">
              <label className="ef-field">
                <span>담당자명</span>
                <input value={editForm.managerName} onChange={handleEditField("managerName")} />
              </label>
              <label className="ef-field">
                <span>휴대폰 번호</span>
                <input value={editForm.contact} onChange={handleEditField("contact")} />
              </label>
            </div>
            <div className="ef-field-row">
              <label className="ef-field">
                <span>업체명</span>
                <input value={editForm.companyName} onChange={handleEditField("companyName")} />
              </label>
              <label className="ef-field">
                <span>대표자명</span>
                <input value={editForm.representativeName} onChange={handleEditField("representativeName")} />
              </label>
            </div>
            <div className="ef-field-row">
              <label className="ef-field">
                <span>업종</span>
                <input value={editForm.industry} onChange={handleEditField("industry")} />
              </label>
              <label className="ef-field">
                <span>대표 전화번호</span>
                <input value={editForm.companyContact} onChange={handleEditField("companyContact")} />
              </label>
            </div>
            <label className="ef-field">
              <span>업체주소</span>
              <input value={editForm.companyAddress} onChange={handleEditField("companyAddress")} />
            </label>
            {saveError && <p className="c-modal__error">{saveError}</p>}
            <button type="button" className="c-modal__primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              className="c-modal__secondary"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div
          className="c-modal__backdrop"
          onClick={() => !withdrawing && setShowWithdrawModal(false)}
        >
          <div className="c-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="c-modal__close"
              onClick={() => setShowWithdrawModal(false)}
              disabled={withdrawing}
              aria-label="닫기"
            >
              ✕
            </button>
            <h2>회원 탈퇴</h2>
            <p className="c-modal__desc">
              탈퇴 시 모든 서비스 이용이 제한되며,
              <br />
              가입하신 이메일로는 다시 가입할 수 없습니다. 
              <br />
              정말 탈퇴하시겠습니까?
            </p>
            {withdrawError && <p className="c-modal__error">{withdrawError}</p>}
            <button
              type="button"
              className="c-modal__primary c-modal__primary--danger"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? "처리 중..." : "탈퇴하기"}
            </button>
            <button
              type="button"
              className="c-modal__secondary"
              onClick={() => setShowWithdrawModal(false)}
              disabled={withdrawing}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPage;