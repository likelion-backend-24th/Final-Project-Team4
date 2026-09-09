import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExpoBooths, getExpoList } from '../api/expo';
import HallMap, { HallPlaza } from '../components/HallMap';
import { getBoothHall } from '../utils/boothType';
import './ExpoDetail.css';

const TABS = ['개요', '부스 배치도'];

// ISO(2026-05-12T10:00:00) → 2026.05.12
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '-');

// 부스 배치도에서 선택한 부스의 신청 가능 여부를 사이드 패널에 표시할 때 씀 (HallMap.jsx의 라벨과 동일하게 유지)
const STATUS_LABEL = {
  AVAILABLE: '신청 가능',
  RESERVED: '결제 대기중',
  ASSIGNED: '배정 완료',
};

// 실제 이미지 에셋이 없어 아이콘은 인라인 SVG로 직접 그림 (외부 아이콘 라이브러리 의존 없음)
const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
const IconPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
const IconPeople = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3" />
    <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
    <path d="M16 4.3a3 3 0 0 1 0 5.8M20 20c0-2.6-1.8-4.8-4.3-5.6" strokeLinecap="round" />
  </svg>
);
const IconGlobe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z" />
  </svg>
);
const IconDoc = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M9 12h6M9 16h6" strokeLinecap="round" />
  </svg>
);
const IconDocCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M9 14.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 14.5h4" strokeLinecap="round" />
  </svg>
);
const IconCheckCircle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconHeadset = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
    <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
    <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
    <path d="M20 19v.5A2.5 2.5 0 0 1 17.5 22H14" strokeLinecap="round" />
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null); // getExpoBooths 응답 (title, 집계, booths)
  const [summary, setSummary] = useState(null); // 목록 응답에서 찾은 날짜·장소
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('개요');
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
                    <p className="expo-detail__legend-title">부스 유형</p>
                    <span><i className="dot dot--booth" /> 참가 부스</span>
                    <span><i className="dot dot--food" /> 먹거리 부스</span>
                    <span><i className="dot dot--rest" /> 휴게 공간</span>
                  </div>

                  <div className="expo-detail__legend expo-detail__legend--vertical">
                    <p className="expo-detail__legend-title">부스 상태</p>
                    <span><i className="dot dot--available" /> 신청 가능</span>
                    <span><i className="dot dot--assigned" /> 마감 (배정·결제대기)</span>
                    <span><i className="dot dot--selected" /> 선택한 부스</span>
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
            <>
            <section className="expo-detail__booths">
              <h2>행사 소개</h2>
              <div className="expo-detail__intro-layout">
                <p className="expo-detail__intro-text">
                  {detail.title}은(는) 다양한 브랜드와 참가업체가 한자리에 모이는 박람회입니다.
                  풍성한 부스와 프로그램을 통해 새로운 비즈니스 기회를 만들어보세요.
                </p>
              </div>
            </section>

            <section className="expo-detail__booths">
              <h2>행사 정보</h2>
              <div className="expo-detail__info-grid">
                <div className="expo-detail__info-card">
                  <IconCalendar />
                  <div>
                    <p className="expo-detail__info-card-label">행사 기간</p>
                    <p className="expo-detail__info-card-value">
                      {fmtDate(summary?.startsAt)} ~ {fmtDate(summary?.endsAt)}
                    </p>
                  </div>
                </div>
                <div className="expo-detail__info-card">
                  <IconPin />
                  <div>
                    <p className="expo-detail__info-card-label">행사 장소</p>
                    <p className="expo-detail__info-card-value">{summary?.venue ?? '-'}</p>
                  </div>
                </div>
                <div className="expo-detail__info-card">
                  <IconPeople />
                  <div>
                    <p className="expo-detail__info-card-label">주최 / 주관</p>
                    <p className="expo-detail__info-card-value">㈜팀포 박람회 사무국</p>
                  </div>
                </div>
                <div className="expo-detail__info-card">
                  <IconGlobe />
                  <div>
                    <p className="expo-detail__info-card-label">홈페이지</p>
                    <p className="expo-detail__info-card-value">추후 공개 예정</p>
                  </div>
                </div>
              </div>
            </section>
            </>
          )}
        </div>

        <aside className="expo-detail__side">
          {tab === '부스 배치도' ? (
            selectedBooth ? (
              <>
                <span className="expo-detail__side-badge">{getBoothHall(selectedBooth.boothNo)}홀</span>
                <span
                  className={`expo-detail__side-status ${
                    selectedBooth.status === 'AVAILABLE'
                      ? 'expo-detail__side-status--open'
                      : 'expo-detail__side-status--closed'
                  }`}
                >
                  {STATUS_LABEL[selectedBooth.status] ?? selectedBooth.status}
                </span>
                <h3>{selectedBooth.boothNo}</h3>
                {selectedBooth.bannerImageUrl ? (
                  <img
                    src={selectedBooth.bannerImageUrl}
                    alt={selectedBooth.companyName ?? selectedBooth.boothNo}
                    className="expo-detail__side-photo"
                  />
                ) : (
                  <div className="expo-detail__side-photo expo-detail__side-photo--empty">
                    {selectedBooth.status === 'ASSIGNED' ? '이미지 준비중' : '배정 전'}
                  </div>
                )}
                {selectedBooth.companyName && (
                  <p className="expo-detail__side-company">{selectedBooth.companyName}</p>
                )}
                <div className="expo-detail__perk">
                  <p className="expo-detail__perk-label">유형</p>
                  <p className="expo-detail__perk-value">{selectedBooth.type}</p>
                </div>
                <div className="expo-detail__perk">
                  <p className="expo-detail__perk-label">임차료</p>
                  <p className="expo-detail__perk-value">{selectedBooth.fee.toLocaleString()} 원</p>
                </div>
                {selectedBooth.industry && (
                  <div className="expo-detail__perk">
                    <p className="expo-detail__perk-label">업종</p>
                    <p className="expo-detail__perk-value">{selectedBooth.industry}</p>
                  </div>
                )}
                <button
                  type="button"
                  className="expo-detail__cta"
                  onClick={goApply}
                  disabled={selectedBooth.status !== 'AVAILABLE'}
                >
                  {selectedBooth.status === 'AVAILABLE' ? '부스 선택 및 신청하기' : '신청 마감된 부스입니다'}
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
              <div className="expo-detail__contact">
                <h4><IconHeadset /> 문의 안내</h4>
                <p>운영 사무국</p>
                <p>02-6000-0000</p>
                <p>expo-help@example.com</p>
              </div>
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