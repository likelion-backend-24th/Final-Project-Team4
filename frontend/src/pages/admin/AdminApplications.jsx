import { useState } from 'react';
import { mockAdminApplications, mockAdminStats } from '../../mock/data';
import './AdminApplications.css';

const STATUS_CLASS = {
  심사중: 'admin-badge--pending',
  승인: 'admin-badge--approved',
  반려: 'admin-badge--rejected',
};

function AdminApplications() {
  const [openNo, setOpenNo] = useState(128);
  const [memo, setMemo] = useState('');

  return (
    <div className="admin-applications">
      <section className="admin-applications__hero">
        <p className="admin-applications__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>참가 신청 심사 관리 (관리자)</h1>
        <p>박람회 참가를 신청한 파트너사 정보와 부스 배치 요청 현황을 실시간으로 모니터링하고 심사합니다.</p>
      </section>

      <section className="admin-applications__stats">
        <div className="admin-stat-card">
          <p>전체 신청 건수</p>
          <strong>{mockAdminStats.total}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>심사 대기 건수</p>
          <strong className="is-pending">{mockAdminStats.pending}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>최종 승인 완료</p>
          <strong className="is-approved">{mockAdminStats.approved}건</strong>
        </div>
        <div className="admin-stat-card">
          <p>신청 반려 내역</p>
          <strong className="is-rejected">{mockAdminStats.rejected}건</strong>
        </div>
      </section>

      <section className="admin-applications__table-card">
        <div className="admin-applications__table-scroll">
        <table className="admin-applications__table">
          <thead>
            <tr>
              <th>No</th>
              <th>신청 업체명</th>
              <th>신청 박람회명</th>
              <th>부스번호</th>
              <th>신청일</th>
              <th>상태</th>
              <th>동작</th>
            </tr>
          </thead>
          <tbody>
            {mockAdminApplications.map((app) => {
              const isOpen = openNo === app.no;
              return (
                <>
                  <tr key={app.no} className={isOpen ? 'is-open' : ''}>
                    <td>{app.no}</td>
                    <td className="is-strong">{app.companyName}</td>
                    <td>{app.expoTitle}</td>
                    <td>{app.boothNo}</td>
                    <td>{app.appliedAt}</td>
                    <td>
                      <span className={`admin-badge ${STATUS_CLASS[app.status] ?? ''}`}>{app.status}</span>
                    </td>
                    <td>
                      <button
                        className="admin-applications__toggle"
                        onClick={() => setOpenNo(isOpen ? null : app.no)}
                      >
                        {isOpen ? '접기 ▲' : '펼치기 ▼'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && app.exhibitionItem && (
                    <tr className="admin-applications__detail-row">
                      <td colSpan={7}>
                        <div className="admin-applications__detail">
                          <div className="admin-applications__detail-col">
                            <h3>신청 업체 대표 정보</h3>
                            <dl>
                              <dt>업체명</dt>
                              <dd>{app.companyName}</dd>
                              <dt>사업자등록번호</dt>
                              <dd>{app.businessNumber}</dd>
                              <dt>대표자명</dt>
                              <dd>{app.ceoName}</dd>
                              <dt>담당자 이메일</dt>
                              <dd>{app.managerEmail}</dd>
                            </dl>

                            <h3>부스 참가 상세 신청 정보</h3>
                            <dl>
                              <dt>희망 부스 번호</dt>
                              <dd>{app.boothLocation}</dd>
                              <dt>부스 유형 및 규격</dt>
                              <dd>{app.boothSpec}</dd>
                              <dt>주요 전시 품목</dt>
                              <dd>{app.exhibitionItem}</dd>
                              <dt>전시 컨셉 설명</dt>
                              <dd>{app.conceptDescription}</dd>
                              <dt>추가 요청 사항</dt>
                              <dd>{app.additionalRequest}</dd>
                            </dl>
                          </div>

                          <div className="admin-applications__detail-col">
                            <h3>참가 신청 심사</h3>
                            <div className="admin-applications__review-meta">
                              <div>
                                <span>신청 접수 상태</span>
                                <span className="admin-badge admin-badge--pending">심사중 (대기)</span>
                              </div>
                              <div>
                                <span>최초 신청 일시</span>
                                <strong>{app.appliedAt} 10:14</strong>
                              </div>
                              <div>
                                <span>심사 처리 일시</span>
                                <strong>-</strong>
                              </div>
                            </div>
                            <label className="admin-applications__memo-label">관리자 심사 메모</label>
                            <textarea
                              value={memo}
                              onChange={(e) => setMemo(e.target.value)}
                              placeholder='예: "해당 부스 배정 승인 전, 전력 추가 용량(3kW) 공급 가능 여부 전시 기술팀 협의 필요."'
                              rows={4}
                            />
                            <p className="admin-applications__memo-notice">
                              ★반려 시 파트너사 포털 및 이메일로 발송될 반려 사유 입력 항이 됨임으로 연동됩니다.
                            </p>
                            <div className="admin-applications__decision">
                              <button className="admin-applications__reject">신청 반려</button>
                              <button className="admin-applications__approve">신청 승인 완료</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="admin-applications__pagination">
          <button>‹</button>
          <button className="is-active">1</button>
          <button>2</button>
          <button>3</button>
          <button>›</button>
        </div>
      </section>
    </div>
  );
}

export default AdminApplications;
