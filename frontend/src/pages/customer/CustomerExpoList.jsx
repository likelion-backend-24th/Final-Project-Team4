import { useMemo, useState } from 'react';
import EntryFlowModal from '../../components/customer/EntryFlowModal';
import { CUSTOMER_EXPO_GRADIENTS, mockCustomerExpos } from '../../mock/customerData';
import './CustomerExpoList.css';

const FILTERS = ['전체', '진행중', '모집중', '모집예정', '종료'];

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function CustomerExpoList() {
  const [filter, setFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [checkinExpo, setCheckinExpo] = useState(null);

  const filtered = useMemo(
    () =>
      mockCustomerExpos.filter((e) => {
        const matchesFilter = filter === '전체' || e.phase === filter;
        const matchesKeyword = e.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      }),
    [filter, keyword]
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
                  <span>참여부스 {e.boothCount}개</span>
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
