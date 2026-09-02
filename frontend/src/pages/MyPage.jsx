import { useNavigate } from 'react-router-dom';
import { mockMyApplications, mockMyProfile, mockPastExhibits, mockPayments } from '../mock/data';
import './MyPage.css';

const STATUS_BADGE = {
  심사중: 'badge--pending',
  '신청 승인': 'badge--approved',
  미결제: 'badge--unpaid',
  결제완료: 'badge--paid',
  '참가 완료': 'badge--done',
};

function MyPage() {
  const navigate = useNavigate();

  return (
    <div className="mypage">
      <div className="mypage__main">
        <section className="mypage__card">
          <div className="mypage__card-header">
            <h2>업체 및 담당자 정보</h2>
            <button type="button" className="mypage__edit-btn">정보 수정</button>
          </div>
          <div className="mypage__divider" />
          <div className="mypage__profile-grid">
            <div className="mypage__profile-col">
              <div className="mypage__profile-row">
                <span className="mypage__profile-label">업체명</span>
                <span className="mypage__profile-value">{mockMyProfile.companyName}</span>
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
                {mockMyApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="mypage__cell-strong">{app.expoTitle}</td>
                    <td>{app.boothNo}</td>
                    <td>{app.appliedAt}</td>
                    <td>
                      <span className={`mypage__badge ${STATUS_BADGE[app.status] ?? ''}`}>{app.status}</span>
                    </td>
                    <td className="mypage__col-right">
                      {app.status === '신청 승인' ? (
                        <button className="mypage__link" onClick={() => navigate('/payment/1')}>
                          결제하기
                        </button>
                      ) : (
                        <button className="mypage__link">신청 상세</button>
                      )}
                    </td>
                  </tr>
                ))}
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
                    <td className="mypage__cell-strong">₩{p.amount.toLocaleString()}</td>
                    <td>
                      <span className={`mypage__badge ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span>
                    </td>
                    <td className={p.paidAt ? '' : 'mypage__cell-muted'}>{p.paidAt ?? '-'}</td>
                    <td className="mypage__col-right">
                      {p.status === '결제완료' ? (
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
                      <span className={`mypage__badge ${STATUS_BADGE[h.status] ?? ''}`}>{h.status}</span>
                    </td>
                    <td className="mypage__col-right mypage__cell-muted">{h.feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mypage__banner">
        <p className="mypage__banner-eyebrow">MOBILITY EXPO EXHIBITOR PORTAL</p>
        <h2 className="mypage__banner-title">다음 박람회 참가도 지금 준비해보세요.</h2>
        <p className="mypage__banner-desc">
          현재 모집 중인 박람회 목록에서 새로운 부스 참가 신청을 이어서 진행할 수 있습니다.
        </p>
      </section>
    </div>
  );
}

export default MyPage;
