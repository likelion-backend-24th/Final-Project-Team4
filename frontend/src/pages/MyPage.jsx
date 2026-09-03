import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockMyProfile, mockPastExhibits, mockPayments } from "../mock/data";
import { getMyBoothApplications } from "../api/expo";
import "./MyPage.css";

const STATUS_BADGE = {
  심사중: "badge--pending",
  "신청 승인": "badge--approved",
  반려: "badge--rejected",
  임시저장: "badge--pending",
  취소됨: "badge--rejected",
  미결제: "badge--unpaid",
  결제완료: "badge--paid",
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

function MyPage() {
  const navigate = useNavigate();
  const [myApplications, setMyApplications] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [openId, setOpenId] = useState(null);

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
      })
      .catch((err) =>
        setLoadError(
          err.response?.data?.error?.message ??
            "신청 내역을 불러오지 못했습니다.",
        ),
      );
  }, []);

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
            <button type="button" className="mypage__edit-btn">
              정보 수정
            </button>
          </div>
          <div className="mypage__divider" />
          <div className="mypage__profile-grid">
            <div className="mypage__profile-col">
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">업체명</span>
                <span className="mypage__profile-value">
                  {mockMyProfile.companyName}
                </span>
              </div>
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">사업자등록번호</span>
                <span className="mypage__profile-value mypage__profile-value--regular">
                  {mockMyProfile.businessNumber}
                </span>
              </div>
            </div>
            <div className="mypage__profile-col">
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">담당자명 / 직급</span>
                <span className="mypage__profile-value mypage__profile-value--regular">
                  {mockMyProfile.managerName}
                </span>
              </div>
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">이메일 주소</span>
                <span className="mypage__profile-value mypage__profile-value--regular">
                  {mockMyProfile.email}
                </span>
              </div>
            </div>
            <div className="mypage__profile-col">
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">휴대폰 번호</span>
                <span className="mypage__profile-value mypage__profile-value--regular">
                  {mockMyProfile.mobile}
                </span>
              </div>
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">대표 전화번호</span>
                <span className="mypage__profile-value mypage__profile-value--regular">
                  {mockMyProfile.companyPhone}
                </span>
              </div>
            </div>
          </div>
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
                {mockPayments.map((p) => (
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
          <h2>과거 참가 및 전시 이력</h2>
          <div className="mypage__table-scroll">
            <table className="mypage__table">
              <thead>
                <tr>
                  <th className="mypage__col-flex">박람회명</th>
                  <th className="mypage__col-150">전시 장소</th>
                  <th className="mypage__col-140">개최 기간</th>
                  <th className="mypage__col-120">상태</th>
                  <th className="mypage__col-120 mypage__col-right">피드백</th>
                </tr>
              </thead>
              <tbody>
                {mockPastExhibits.map((h) => (
                  <tr key={h.id}>
                    <td className="mypage__cell-strong">{h.expoTitle}</td>
                    <td>{h.venue}</td>
                    <td>{h.period}</td>
                    <td>
                      <span
                        className={`mypage__badge ${STATUS_BADGE[h.status] ?? ""}`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="mypage__col-right mypage__cell-muted">
                      {h.feedback}
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
    </div>
  );
}

export default MyPage;
