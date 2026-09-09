import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExpoBooths, getExpoList } from '../api/expo';
import HallMap, { HallPlaza } from '../components/HallMap';
import { getBoothHall } from '../utils/boothType';
import './ExpoDetail.css';

const TABS = ['개요', '부스 배치도'];

// ISO(2026-05-12T10:00:00) → 2026.05.12
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');

function ExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null); // getExpoBooths 응답 (title, 집계, booths)
  const [summary, setSummary] = useState(null); // 목록 응답에서 찾은 날짜·장소
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('부스 배치도');
  const [selectedBoothId, setSelectedBoothId] = useState(null);
  const [hallFilter, setHallFilter] = useState('전체');

  useEffect(() => {
    Promise.all([getExpoBooths(expoId), getExpoList({ page: 0, size: 50 })])
      .then(([boothsRes, listRes]) => {
        setDetail(boothsRes);
        setSummary(listRes.content.find((e) => String(e.expoId) === expoId) ?? null);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId]);

  const booths = detail?.booths ?? [];
  const halls = useMemo(
    () => [...new Set(booths.map((b) => getBoothHall(b.boothNo)))].sort(),
    [booths],
  );
  const visibleHalls = hallFilter === '전체' ? halls : halls.filter((h) => h === hallFilter);
  const selectedBooth = booths.find((b) => (b.boothId ?? b.id) === selectedBoothId) ?? null;

  if (loadError) {
    return <p className="expo-detail__status">{loadError}</p>;
  }
  if (!detail) {
    return <p className="expo-detail__status">불러오는 중...</p>;
  }

  const goApply = () =>
    navigate(`/expos/${expoId}/apply?boothId=${selectedBoothId ?? ''}`);

  return (
    <div className="expo-detail">
      <section className="expo-detail__hero">
        <div className="expo-detail__hero-main">
          <div className="expo-detail__hero-badges">
            <span className="expo-detail__badge">모집중</span>
            <span className="expo-detail__badge expo-detail__badge--soft">
              신청 가능 부스 {detail.availableCount}개
            </span>
          </div>
          <h1>{detail.title}</h1>
          <div className="expo-detail__hero-meta">
            <span>
              <i className="expo-detail__hero-icon expo-detail__hero-icon--calendar" aria-hidden="true" />
              {fmtDate(summary?.startsAt)} ~ {fmtDate(summary?.endsAt)}
            </span>
            <span>
              <i className="expo-detail__hero-icon expo-detail__hero-icon--pin" aria-hidden="true" />
              {summary?.venue ?? '-'}
            </span>
          </div>
        </div>
      </section>

      <div className="expo-detail__body">
        <div className="expo-detail__main">
          <nav className="expo-detail__tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          {tab === '부스 배치도' && (
            <section className="expo-detail__booths expo-detail__boothmap-card">
              <div className="expo-detail__boothmap-layout">
                <div className="expo-detail__boothmap-side">
                  <div className="expo-detail__hall-filters">
                    <button
                      type="button"
                      className={hallFilter === '전체' ? 'is-active' : ''}
                      onClick={() => setHallFilter('전체')}
                    >
                      전체
                    </button>
                    {halls.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={hallFilter === h ? 'is-active' : ''}
                        onClick={() => setHallFilter(h)}
                      >
                        {h}홀
                      </button>
                    ))}
                  </div>

                  <div className="expo-detail__legend expo-detail__legend--vertical">
                    <span><i className="dot dot--booth" /> 참가 부스</span>
                    <span><i className="dot dot--food" /> 먹거리 부스</span>
                    <span><i className="dot dot--rest" /> 휴게 공간</span>
                  </div>
                </div>

                <div className="expo-detail__hallmap-scroll">
                  {visibleHalls.map((h, i) => (
                    <Fragment key={h}>
                      {i > 0 && <HallPlaza />}
                      <HallMap
                        hallName={h}
                        booths={booths.filter((b) => getBoothHall(b.boothNo) === h)}
                        selectedBoothId={selectedBoothId}
                        onSelect={(id) => setSelectedBoothId(id === selectedBoothId ? null : id)}
                        reverseFood={i % 2 === 1}
                      />
                    </Fragment>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === '개요' && (
            <section className="expo-detail__booths">
              <h2>행사 기본 정보</h2>
              <dl className="expo-detail__info-list">
                <dt>행사명</dt>
                <dd>{detail.title}</dd>
                <dt>기간</dt>
                <dd>
                  {fmtDate(summary?.startsAt)} - {fmtDate(summary?.endsAt)}
                </dd>
                <dt>장소</dt>
                <dd>{summary?.venue ?? '-'}</dd>
                <dt>모집 기간</dt>
                <dd>
                  {fmtDate(summary?.applyStartsAt)} - {fmtDate(summary?.applyEndsAt)}
                </dd>
                <dt>부스 현황</dt>
                <dd>
                  총 {detail.totalCount}개 중 {detail.availableCount}개 신청 가능
                </dd>
              </dl>
            </section>
          )}
        </div>

        <aside className="expo-detail__side">
          {tab === '부스 배치도' ? (
            selectedBooth ? (
              <>
                <span className="expo-detail__side-badge">{getBoothHall(selectedBooth.boothNo)}홀</span>
                <h3>{selectedBooth.boothNo}</h3>
                <div className="expo-detail__perk">
                  <p className="expo-detail__perk-label">유형</p>
                  <p className="expo-detail__perk-value">{selectedBooth.type}</p>
                </div>
                <div className="expo-detail__perk">
                  <p className="expo-detail__perk-label">임차료</p>
                  <p className="expo-detail__perk-value">{selectedBooth.fee.toLocaleString()} 원</p>
                </div>
                <button type="button" className="expo-detail__cta" onClick={goApply}>
                  부스 선택 및 신청하기
                </button>
              </>
            ) : (
              <p className="expo-detail__side-hint">부스를 선택하면 상세 정보가 표시됩니다.</p>
            )
          ) : (
            <>
              <h3>부스 참가 안내</h3>
              <div className="expo-detail__perk">
                <p className="expo-detail__perk-label">신청 기간</p>
                <p className="expo-detail__perk-value">
                  {fmtDate(summary?.applyStartsAt)} ~ {fmtDate(summary?.applyEndsAt)}
                </p>
              </div>
              <div className="expo-detail__perk">
                <p className="expo-detail__perk-label">제공 혜택</p>
                <p className="expo-detail__perk-value">무료 무선인터넷, 기본 전력 1kW 제공</p>
              </div>
              <button type="button" className="expo-detail__cta" onClick={goApply}>
                부스 선택 및 신청하기
              </button>
            </>
          )}
        </aside>
      </div>

      <footer className="expo-detail__footer">
        <div>
          <strong>{detail.title}</strong>
          {detail.booths[0] && (
            <span className="expo-detail__footer-fee">
              예상 참가비 {detail.booths[0].fee.toLocaleString()} 원 ~
            </span>
          )}
        </div>
        <button type="button" onClick={goApply}>
          참가 신청하기
        </button>
      </footer>
    </div>
  );
}

export default ExpoDetail;
