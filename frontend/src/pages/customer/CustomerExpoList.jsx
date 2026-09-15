import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EntryFlowModal from '../../components/customer/EntryFlowModal';
import { getCustomerExpoList, searchVehicles } from '../../api/expo';
import { CUSTOMER_EXPO_GRADIENTS } from '../../mock/customerData';
import './CustomerExpoList.css';

const FILTERS = ['전체', '진행중', '모집중', '모집예정', '종료'];

// 정렬 기준 - 상태 탭과 무관하게 동일한 3가지 옵션을 공용으로 씀
const SORTS = [
  { value: 'start', label: '시작일', key: 'startsAt' },
  { value: 'deadline', label: '신청 마감', key: 'applyEndsAt' },
  { value: 'end', label: '종료일', key: 'endsAt' },
];

// 한 페이지에서 보여줄 카드 개수 - 초과될 경우 하단에 페이지 넘버링
const PAGE_SIZE = 8;

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 신청/개최 기간과 현재 시각을 비교해서 진행 단계를 계산 (ExpoList.jsx와 동일한 규칙)
// 참고: 서버 응답에도 phase(ExpoPhase) 필드가 새로 생겼지만, 그 값이 이 필터 버튼들과
// 똑같은 한글 라벨로 내려오는지 확인되기 전까지는 안전하게 클라이언트 계산을 그대로 씀.
const phaseOf = (e) => {
  const now = Date.now();
  const at = (s) => new Date(s).getTime();
  if (now < at(e.applyStartsAt)) return '모집예정';
  if (now <= at(e.applyEndsAt)) return '모집중';
  if (now < at(e.startsAt)) return '모집마감';
  if (now <= at(e.endsAt)) return '진행중';
  return '종료';
};

// 서버에서 받은 실제 박람회 데이터를 카드에서 쓰기 편한 형태로 변환
const toCard = (e) => ({
  expoId: e.expoId,
  title: e.title,
  venue: e.venue,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  applyStartsAt: e.applyStartsAt,
  applyEndsAt: e.applyEndsAt,
  admissionFee: e.admissionFee,
  boothCount: e.boothCount,
  phase: phaseOf(e),
});

function CustomerExpoList() {
  // 실제 박람회 목록 (더미 데이터는 사용하지 않음)
  const [expos, setExpos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState(SORTS[0].value);
  const [sortDir, setSortDir] = useState('asc');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [checkinExpo, setCheckinExpo] = useState(null);

  // AI 자연어 차량 검색 - 위 keyword(박람회명 필터)와 별개. 현재 노출 중인 박람회 전체의 차량이 대상.
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiResult, setAiResult] = useState(null); // { results, interpretedSummary } | null(검색 전)

  const handleAiSearch = (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiSearching) return;
    setAiSearching(true);
    setAiError(null);
    searchVehicles(aiQuery.trim())
      .then((res) => setAiResult(res))
      .catch((err) =>
        setAiError(err.response?.data?.error?.message ?? '검색 중 오류가 발생했습니다.'),
      )
      .finally(() => setAiSearching(false));
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResult(null);
    setAiError(null);
  };

  useEffect(() => {
    getCustomerExpoList({ page: 0, size: 50 })
      .then((res) => setExpos(res.content.map(toCard)))
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'),
      );
  }, []);

  const filtered = useMemo(() => {
    const sortKey = SORTS.find((s) => s.value === sortBy).key;
    const dir = sortDir === 'asc' ? 1 : -1;
    return expos
      .filter((e) => {
        const matchesFilter = filter === '전체' || e.phase === filter;
        const matchesKeyword = e.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      })
      .sort((a, b) => dir * (new Date(a[sortKey]) - new Date(b[sortKey])));
  }, [expos, filter, keyword, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [filter, sortBy, sortDir, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="c-expo-list">
      <section className="c-expo-list__hero">
        <p className="c-expo-list__eyebrow">EXHIBITION MANAGEMENT PORTAL</p>
        <h1>박람회 목록</h1>
        <p>다양한 모빌리티 박람회를 확인하고, 관심 있는 박람회를 선택해 보세요.</p>

        <form className="c-ai-search" onSubmit={handleAiSearch}>
          <span className="c-ai-search__icon" aria-hidden="true" />
          <input
            className="c-ai-search__input"
            placeholder='어떤 차량을 찾으세요? 예: "3000만원대 가솔린 SUV", "가족끼리 타기 좋은 차"'
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          <button type="submit" className="c-ai-search__submit" disabled={aiSearching}>
            {aiSearching ? '검색 중...' : 'AI 검색'}
          </button>
          {aiResult && (
            <button type="button" className="c-ai-search__clear" onClick={clearAiSearch}>
              검색 지우기
            </button>
          )}
        </form>
      </section>

      {aiResult ? (
        <div className="c-expo-list__grid-wrap">
          {aiError && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{aiError}</p>}
          {aiResult.interpretedSummary && (
            <p className="c-ai-search__summary">👾 {aiResult.interpretedSummary}</p>
          )}
          {aiResult.results.length === 0 ? (
            <p style={{ color: '#64748b' }}>조건에 맞는 차량을 찾지 못했어요. 다른 표현으로 검색해보세요.</p>
          ) : (
            <div className="c-ai-search__grid">
              {aiResult.results.map(({ expoId, expoTitle, boothId, boothNo, companyName, vehicle }) => (
                <Link
                  key={vehicle.vehicleId}
                  to={`/customer/expos/${expoId}/vehicles/${vehicle.vehicleId}`}
                  className="c-ai-result-card"
                >
                  <h3>{vehicle.name}</h3>
                  <p className="c-ai-result-card__meta">
                    {expoTitle} · {companyName ?? `${boothNo} 부스`}
                  </p>
                  {vehicle.startPrice != null && (
                    <p className="c-ai-result-card__price">{vehicle.startPrice.toLocaleString()}원~</p>
                  )}
                  {vehicle.summary && <p className="c-ai-result-card__summary">{vehicle.summary}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="c-expo-list__toolbar">
            <div className="c-expo-list__filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={f === filter ? 'is-active' : ''}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="c-expo-list__toolbar-right">
              <select
                className="c-expo-list__sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="c-expo-list__sort-dir"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label={sortDir === 'asc' ? '오름차순' : '내림차순'}
              >
                {sortDir === 'asc' ? '▲' : '▼'}
              </button>
              <div className="c-expo-list__search-wrap">
                <span className="c-expo-list__search-icon" />
                <input
                  className="c-expo-list__search"
                  placeholder="박람회명 또는 지역을 검색하세요."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="c-expo-list__grid-wrap">
            {loadError && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{loadError}</p>}
            {!loadError && filtered.length === 0 && (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>표시할 박람회가 없습니다.</p>
            )}
            <div className="c-expo-list__grid">
              {paginated.map((e, i) => (
                <div key={e.expoId} className="c-expo-card">
                  <div
                    className="c-expo-card__thumb"
                    style={{ background: CUSTOMER_EXPO_GRADIENTS[i % CUSTOMER_EXPO_GRADIENTS.length] }}
                  />
                  <div className="c-expo-card__body">
                    <div className="c-expo-card__meta">
                      <span
                        className={`c-expo-card__badge ${
                          e.phase === '진행중' ? 'c-expo-card__badge--live' : ''
                        }`}
                      >
                        {e.phase}
                      </span>
                    </div>
                    <h3>{e.title}</h3>
                    <div className="c-expo-card__meta-list">
                      <p>
                        <span className="c-expo-card__icon c-expo-card__icon--calendar" />
                        {fmtDate(e.startsAt)} - {fmtDate(e.endsAt)}
                      </p>
                      <p>
                        <span className="c-expo-card__icon c-expo-card__icon--pin" />
                        {e.venue}
                      </p>
                    </div>
                     <button
                      type="button"
                      className="c-expo-card__cta"
                      disabled={e.phase === '종료'}
                      onClick={() => setCheckinExpo(e)}
                    >
                      {e.phase === '종료' ? '종료' : '선택하기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="c-expo-list__pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} type="button" className={p === page ? 'is-active' : ''} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="다음"
                  disabled={page === totalPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {checkinExpo && (
        <EntryFlowModal expo={checkinExpo} onClose={() => setCheckinExpo(null)} />
      )}
    </div>
  );
}

export default CustomerExpoList;