import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExpoBooths, getExpoList } from '../api/expo';
import BoothGrid from '../components/BoothGrid';
import './ExpoDetail.css';

const TABS = ['행사 소개', '부스 배치도', '참가 안내'];

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
        <div className="expo-detail__hero-badges">
          <span className="expo-detail__badge">모집중</span>
          <span className="expo-detail__badge expo-detail__badge--soft">
            신청 가능 부스 {detail.availableCount}개
          </span>
        </div>
        <h1>{detail.title}</h1>
      </section>

      <div className="expo-detail__body">
        <div className="expo-detail__main">
          <section className="expo-detail__info">
            <h2>행사 기본 정보</h2>
            <dl>
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

          <nav className="expo-detail__tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          {tab === '부스 배치도' && (
            <section className="expo-detail__booths">
              <div className="expo-detail__booths-header">
                <h2>실시간 부스 배치 현황</h2>
                <div className="expo-detail__legend">
                  <span><i className="dot dot--available" /> 선택가능</span>
                  <span><i className="dot dot--assigned" /> 예약됨</span>
                  <span><i className="dot dot--selected" /> 선택됨</span>
                </div>
              </div>
              <p className="expo-detail__entrance">MAIN ENTRANCE - 전시장 주출입구</p>
              <div className="expo-detail__booths-scroll">
                <BoothGrid
                  booths={detail.booths}
                  selectedBoothIds={selectedBoothId ? [selectedBoothId] : []}
                  onToggle={(id) => setSelectedBoothId(id === selectedBoothId ? null : id)}
                />
              </div>
            </section>
          )}

          {tab === '행사 소개' && (
            <section className="expo-detail__booths">
              <h2>행사 소개</h2>
              <p>{detail.title} 상세 소개 콘텐츠 영역입니다.</p>
            </section>
          )}

          {tab === '참가 안내' && (
            <section className="expo-detail__booths">
              <h2>참가 안내</h2>
              <p>부스 참가 절차 및 유의사항 안내 영역입니다.</p>
            </section>
          )}
        </div>

        <aside className="expo-detail__side">
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
