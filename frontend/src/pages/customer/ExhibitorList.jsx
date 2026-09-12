import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BulkConsultationModal from '../../components/customer/BulkConsultationModal';
import { getCustomerExpo, getCustomerExpoVehicles } from '../../api/expo';
import './ExhibitorVehicleList.css';
import './ExhibitorList.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 박람회 둘러보기 첫 화면 - 참가업체 목록. 카드를 누르면 그 업체의 전시 차량 목록으로 이동하고,
// "한 번에 상담 신청"으로 여러 업체를 골라 상담 신청 정보를 한 번만 입력해 동시에 신청할 수 있다.
function ExhibitorList() {
  const { expoId } = useParams();
  const [expo, setExpo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [showBulkConsult, setShowBulkConsult] = useState(false);

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        setGroups(groupsRes);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId]);

  const filteredGroups = useMemo(
    () => groups.filter((g) => g.title.toLowerCase().includes(keyword.toLowerCase())),
    [groups, keyword]
  );

  if (loadError) {
    return <p className="c-vehicle-list__status">{loadError}</p>;
  }
  if (!expo) {
    return <p className="c-vehicle-list__status">불러오는 중...</p>;
  }

  return (
    <div className="c-vehicle-list">
      <section className="c-vehicle-list__hero">
        <p className="c-vehicle-list__eyebrow">EXHIBITION MANAGEMENT PORTAL</p>
        <h1>{expo.title}</h1>
        <p>
          {fmtDate(expo.startsAt)} ~ {fmtDate(expo.endsAt)} | {expo.venue}
        </p>
      </section>

      <div className="c-vehicle-list__toolbar">
        <div className="c-vehicle-list__search-wrap">
          <span className="c-vehicle-list__search-icon" />
          <input
            className="c-vehicle-list__search"
            placeholder="참가업체명을 검색하세요."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="c-vehicle-list__body c-exhibitor-list__layout">
        <div>
          {filteredGroups.length === 0 && (
            <p className="c-vehicle-list__status">조건에 맞는 참가업체가 없습니다.</p>
          )}

          <div className="c-exhibitor-list__grid">
            {filteredGroups.map((g) => {
              const tags = [...new Set(g.vehicles.flatMap((v) => v.tags ?? []))];
              return (
                <Link key={g.boothId} to={`/customer/expos/${expoId}/booths/${g.boothId}`} className="c-exhibitor-card">
                  <div className="c-exhibitor-card__logo-slot">
                    <span>{g.title.slice(0, 1)}</span>
                  </div>
                  <h3>{g.title}</h3>
                  <span className="c-exhibitor-card__booth">부스 {g.boothNo}</span>
                  {tags.length > 0 && (
                    <div className="c-exhibitor-card__tags">
                      {tags.map((t) => (
                        <span key={t} className="c-exhibitor-card__tag">{t}</span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="c-bulk-promo">
          <span className="c-bulk-promo__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16v11H8l-4 4V4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2>
            관심 있는 <span className="c-bulk-promo__accent">모든 업체에</span>
            <br />
            <span className="c-bulk-promo__accent">한 번에 상담 신청</span>
          </h2>
          <button type="button" className="c-bulk-promo__cta" onClick={() => setShowBulkConsult(true)}>
            원클릭 상담 신청
          </button>
          <ul className="c-bulk-promo__checklist">
            <li>여러 업체에 한 번에 신청</li>
            <li>간편한 정보 입력</li>
            <li>빠른 답변을 받아보세요</li>
          </ul>
          <p className="c-bulk-promo__tagline">CONNECT FOR A BETTER MOBILITY</p>
        </aside>
      </div>

      {showBulkConsult && (
        <BulkConsultationModal expoId={expoId} groups={groups} onClose={() => setShowBulkConsult(false)} />
      )}
    </div>
  );
}

export default ExhibitorList;
