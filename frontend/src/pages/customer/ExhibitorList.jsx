import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BulkConsultPromo from '../../components/customer/BulkConsultPromo';
import ExpoUnavailableModal from '../../components/customer/ExpoUnavailableModal';
import { getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './ExhibitorVehicleList.css';
import './ExhibitorList.css';

const PAGE_SIZE = 8;

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

const boothNoValue = (boothNo) => parseInt(String(boothNo).replace(/\D/g, ''), 10) || 0;

// 박람회 둘러보기 첫 화면 - 참가업체 목록. 카드를 누르면 그 업체의 전시 차량 목록으로 이동하고,
// "한 번에 상담 신청"으로 여러 업체를 골라 상담 신청 정보를 한 번만 입력해 동시에 신청할 수 있다.
function ExhibitorList() {
  const { expoId } = useParams();
  const navigate = useNavigate();
  const [expo, setExpo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [expoGone, setExpoGone] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('boothNo');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        setGroups(groupsRes);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setExpoGone(true);
        } else {
          setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.');
        }
      });
  }, [expoId]);

  // 같은 업체(title)가 여러 부스를 신청한 경우 - "A-101 ~ A-102"처럼 한 카드로 묶어서 보여준다.
  const exhibitors = useMemo(() => {
    const byKey = new Map();
    groups.forEach((g) => {
      // 같은 신청(applicationGroupId)으로 함께 접수한 부스끼리만 한 카드로 묶는다.
      // applicationGroupId가 없으면(예외 케이스) 부스 하나짜리 카드로 독립 처리.
      const key = g.applicationGroupId ?? `booth-${g.boothId}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: g.companyName ?? g.title,
          boothId: g.boothId,
          bannerImageUrl: g.bannerImageUrl,
          boothNos: [],
        });
      }
      byKey.get(key).boothNos.push(g.boothNo);
    });
    return Array.from(byKey.values()).map((e) => ({
      ...e,
      boothNos: [...e.boothNos].sort((a, b) => boothNoValue(a) - boothNoValue(b)),
    }));
  }, [groups]);

  const filteredExhibitors = useMemo(
    () => exhibitors.filter((e) => e.title.toLowerCase().includes(keyword.toLowerCase())),
    [exhibitors, keyword]
  );

  const sortedExhibitors = useMemo(() => {
  const arr = [...filteredExhibitors];
  switch (sortBy) {
    case 'boothNoDesc':
      arr.sort((a, b) => boothNoValue(b.boothNos[0]) - boothNoValue(a.boothNos[0]));
      break;
    case 'name':
      arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
      break;
    case 'nameDesc':
      arr.sort((a, b) => b.title.localeCompare(a.title, 'ko'));
      break;
    case 'boothNo':
    default:
      arr.sort((a, b) => boothNoValue(a.boothNos[0]) - boothNoValue(b.boothNos[0]));
      break;
  }
  return arr;
}, [filteredExhibitors, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [keyword, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedExhibitors.length / PAGE_SIZE));
  const pagedExhibitors = sortedExhibitors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (expoGone) {
    return <ExpoUnavailableModal onConfirm={() => navigate('/customer')} />;
  }
  if (loadError) {
    return <p className="c-vehicle-list__status">{loadError}</p>;
  }
  if (!expo) {
    return <p className="c-vehicle-list__status">불러오는 중...</p>;
  }

  return (
    <div className="c-vehicle-list">
      <section className="c-vehicle-list__hero">
        <p className="c-vehicle-list__eyebrow">EXHIBITION</p>
        <h1>{expo.title}</h1>
        <p>
          {fmtDate(expo.startsAt)} ~ {fmtDate(expo.endsAt)}
        </p>
      </section>

      <div className="c-exhibitor-list__page-header">
        <div className="c-exhibitor-list__crumb">
          <Link to="/customer">홈</Link> &gt; <span>참가 업체</span>
        </div>
        <h2>참가 업체</h2>
      </div>

      <div className="c-vehicle-list__toolbar">
        <div className="c-vehicle-list__search-wrap">
          <span className="c-vehicle-list__search-icon" />
          <input
            className="c-vehicle-list__search"
            placeholder="업체명으로 검색하세요."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="c-exhibitor-list__sort-wrap">
          <span className="c-exhibitor-list__sort-label">정렬</span>
          <select
          className="c-exhibitor-list__sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          >
          <option value="boothNo">부스 번호 낮은순</option>
          <option value="boothNoDesc">부스 번호 높은순</option>
          <option value="name">업체명 가나다순</option>
          <option value="nameDesc">업체명 가나다 역순</option>
        </select>
        </div>
      </div>

      <div className="c-vehicle-list__body c-exhibitor-list__layout">
        <div>
          <p className="c-exhibitor-list__count">총 {sortedExhibitors.length}개 업체</p>

          {pagedExhibitors.length === 0 && (
            <p className="c-vehicle-list__status">조건에 맞는 참가업체가 없습니다.</p>
          )}

          <div className="c-exhibitor-list__grid">
            {pagedExhibitors.map((exhibitor) => {
              const boothLabel =
                exhibitor.boothNos.length > 1
                  ? `${exhibitor.boothNos[0]} ~ ${exhibitor.boothNos[exhibitor.boothNos.length - 1]}`
                  : exhibitor.boothNos[0];
              return (
                <Link
                  key={exhibitor.boothId}
                  to={`/customer/expos/${expoId}/booths/${exhibitor.boothId}`}
                  className="c-exhibitor-row"
                >
                  <div className="c-exhibitor-row__logo">
                    {exhibitor.bannerImageUrl ? (
                      <img src={toAssetUrl(exhibitor.bannerImageUrl)} alt={exhibitor.title} />
                    ) : (
                      <span>{exhibitor.title.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="c-exhibitor-row__info">
                    <h3>{exhibitor.title}</h3>
                    <span className="c-exhibitor-row__booth">{boothLabel}</span>
                  </div>
                  <span className="c-exhibitor-row__arrow" aria-hidden="true">›</span>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="c-exhibitor-list__pagination">
              <button
                type="button"
                className="c-exhibitor-list__page-nav"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`c-exhibitor-list__page-num${p === page ? ' is-active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="c-exhibitor-list__page-nav"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </div>

        <BulkConsultPromo expoId={expoId} groups={groups} />
      </div>
    </div>
  );
}

export default ExhibitorList;