import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockExpos } from '../mock/data';
import './ExpoList.css';

const FILTERS = ['전체', '모집중', '모집마감', '진행중', '종료'];
const THEME_GRADIENT = {
  blue: 'linear-gradient(135deg, #1e293b, #0f172a)',
  red: 'linear-gradient(135deg, #7f1d1d, #1f2937)',
  cyan: 'linear-gradient(135deg, #0e7490, #0f172a)',
  green: 'linear-gradient(135deg, #14532d, #0f172a)',
};

function ExpoList() {
  const [filter, setFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(
    () =>
      mockExpos.filter((expo) => {
        const matchesFilter = filter === '전체' || expo.status === filter;
        const matchesKeyword = expo.title.toLowerCase().includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      }),
    [filter, keyword],
  );

  return (
    <div className="expo-list">
      <section className="expo-list__hero">
        <p className="expo-list__eyebrow">ONLINE REGISTRATION PORTAL</p>
        <h1>박람회 참가 신청</h1>
        <p>현재 모집 중이거나 진행 예정인 모빌리티 분야 전문 박람회의 부스 참가 신청을 접수하고 있습니다.</p>
      </section>

      <div className="expo-list__toolbar">
        <div className="expo-list__filters">
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
        <div className="expo-list__search-wrap">
          <span className="expo-list__search-icon" />
          <input
            className="expo-list__search"
            placeholder="박람회 명칭 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="expo-list__grid-wrap">
        <div className="expo-list__grid">
          {filtered.map((expo) => (
            <Link key={expo.id} to={`/expos/${expo.id}`} className="expo-card">
              <div className="expo-card__thumb" style={{ background: THEME_GRADIENT[expo.theme] }} />
              <div className="expo-card__body">
                <div className="expo-card__meta">
                  <span
                    className={`expo-card__badge expo-card__badge--${expo.status === '모집마감' ? 'closed' : 'open'}`}
                  >
                    {expo.status}
                  </span>
                  <span>
                    잔여부스{' '}
                    <strong className={expo.availableBoothCount === 0 ? 'is-zero' : ''}>
                      {expo.availableBoothCount}개
                    </strong>
                  </span>
                </div>
                <h3>{expo.shortTitle}</h3>
                <div className="expo-card__meta-list">
                  <p>
                    <span className="expo-card__icon expo-card__icon--calendar" />
                    {expo.startsAt} - {expo.endsAt}
                  </p>
                  <p>
                    <span className="expo-card__icon expo-card__icon--pin" />
                    {expo.venue}
                  </p>
                </div>
                <div className="expo-card__divider" />
                <div className="expo-card__footer">
                  <span className="expo-card__link">상세 보기 및 부스 신청</span>
                  <span className="expo-card__arrow" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="expo-list__pagination">
          <button type="button" className="expo-list__page-nav">‹</button>
          <button type="button" className="is-active">1</button>
          <button type="button">2</button>
          <button type="button">3</button>
          <button type="button" className="expo-list__page-nav">›</button>
        </div>
      </div>
    </div>
  );
}

export default ExpoList;
