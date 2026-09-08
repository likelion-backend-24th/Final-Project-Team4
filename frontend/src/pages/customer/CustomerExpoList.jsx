import { useEffect, useMemo, useState } from 'react';
import EntryFlowModal from '../../components/customer/EntryFlowModal';
import { getCustomerExpoList } from '../../api/expo';
import { CUSTOMER_EXPO_GRADIENTS } from '../../mock/customerData';
import './CustomerExpoList.css';

const FILTERS = ['전체', '진행중', '모집중', '모집예정', '종료'];

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 신청/개최 기간과 현재 시각을 비교해서 진행 단계를 계산 (ExpoList.jsx와 동일한 규칙)
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
  applyEndsAt: e.applyEndsAt,
  admissionFee: e.admissionFee,
  phase: phaseOf(e),
});

function CustomerExpoList() {
  // 실제 박람회 목록 (더미 데이터는 사용하지 않음)
  const [expos, setExpos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [checkinExpo, setCheckinExpo] = useState(null);

  useEffect(() => {
    getCustomerExpoList({ page: 0, size: 50 })
      .then((res) => setExpos(res.content.map(toCard)))
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 목록을 불러오지 못했습니다.'),
      );
  }, []);

  const filtered = useMemo(
    () =>
      expos.filter((e) => {
        const matchesFilter = filter === '전체' || e.phase === filter;
        const matchesKeyword = e.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      }),
    [expos, filter, keyword]
  );

  return (
    <div className="c-expo-list">
      <section className="c-expo-list__hero">
        <p className="c-expo-list__eyebrow">EXHIBITION MANAGEMENT PORTAL</p>
        <h1>박람회 목록</h1>
        <p>다양한 모빌리티 박람회를 확인하고, 관심 있는 박람회를 선택해 보세요.</p>
      </section>

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

      <div className="c-expo-list__grid-wrap">
        {loadError && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{loadError}</p>}
        {!loadError && filtered.length === 0 && (
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>표시할 박람회가 없습니다.</p>
        )}
        <div className="c-expo-list__grid">
          {filtered.map((e, i) => (
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
                  <span>
                    신청 마감 <strong>{fmtDate(e.applyEndsAt)}</strong>
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
                <button type="button" className="c-expo-card__cta" onClick={() => setCheckinExpo(e)}>
                  선택하기
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="c-expo-list__pagination">
          {[1, 2, 3].map((p) => (
            <button key={p} type="button" className={p === page ? 'is-active' : ''} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(3, p + 1))} aria-label="다음">
            &gt;
          </button>
        </div>
      </div>

      {checkinExpo && (
        <EntryFlowModal expo={checkinExpo} onClose={() => setCheckinExpo(null)} />
      )}
    </div>
  );
}

export default CustomerExpoList;
