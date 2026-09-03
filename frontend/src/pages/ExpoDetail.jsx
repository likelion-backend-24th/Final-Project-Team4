import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockExpos } from '../mock/data';
import BoothGrid from '../components/BoothGrid';
import './ExpoDetail.css';

const TABS = ['행사 소개', '부스 배치도', '참가 안내'];

function ExpoDetail() {
  const { expoId } = useParams();
  const navigate = useNavigate();
  const expo = mockExpos.find((e) => String(e.id) === expoId);
  const [tab, setTab] = useState('부스 배치도');
  const [selectedBoothId, setSelectedBoothId] = useState(
    expo?.booths.find((b) => b.boothNo === expo.selectedBoothId)?.id ?? null,
  );

  if (!expo) {
    return <p className="expo-detail__status">박람회를 찾을 수 없습니다.</p>;
  }

  const selectedBooth = expo.booths.find((b) => b.id === selectedBoothId);

  return (
    <div className="expo-detail">
      <section className="expo-detail__hero">
        <div className="expo-detail__hero-badges">
          <span className="expo-detail__badge">{expo.status}</span>
          <span className="expo-detail__badge expo-detail__badge--soft">
            잔여 부스 {expo.availableBoothCount}개
          </span>
        </div>
        <h1>{expo.title}</h1>
      </section>

      <div className="expo-detail__body">
        <div className="expo-detail__main">
          <section className="expo-detail__info">
            <h2>행사 기본 정보</h2>
            <dl>
              <dt>행사명</dt>
              <dd>{expo.title}</dd>
              <dt>기간</dt>
              <dd>{expo.period}</dd>
              <dt>장소</dt>
              <dd>{expo.fullVenue}</dd>
              <dt>주최</dt>
              <dd>{expo.host}</dd>
              <dt>기본 참가비</dt>
              <dd>{expo.fee}</dd>
              <dt>모집 기간</dt>
              <dd>{expo.applyPeriod}</dd>
              <dt>잔여 부스 수</dt>
              <dd>
                {expo.availableBoothCount}개 부스 신청 가능 (총 {expo.totalBoothCount}개 부스 중{' '}
                {expo.submittedBoothCount}개 접수 완료)
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
                  booths={expo.booths}
                  selectedBoothIds={selectedBoothId ? [selectedBoothId] : []}
                  onToggle={(id) => setSelectedBoothId(id === selectedBoothId ? null : id)}
                />
              </div>
            </section>
          )}

          {tab === '행사 소개' && (
            <section className="expo-detail__booths">
              <h2>행사 소개</h2>
              <p>{expo.title}의 상세 소개 콘텐츠 영역입니다. (목업)</p>
            </section>
          )}

          {tab === '참가 안내' && (
            <section className="expo-detail__booths">
              <h2>참가 안내</h2>
              <p>부스 참가 절차 및 유의사항 안내 영역입니다. (목업)</p>
            </section>
          )}
        </div>

        <aside className="expo-detail__side">
          <h3>부스 참가 안내</h3>
          <div className="expo-detail__perk">
            <p className="expo-detail__perk-label">조기 신청 혜택</p>
            <p className="expo-detail__perk-value">부스당 10% 참가비 할인 (~2026.02.28)</p>
          </div>
          <div className="expo-detail__perk">
            <p className="expo-detail__perk-label">제공 혜택</p>
            <p className="expo-detail__perk-value">무료 무선인터넷, 기본 전력 1kW 제공</p>
          </div>
          <button
            type="button"
            className="expo-detail__cta"
            onClick={() => navigate(`/expos/${expo.id}/apply?boothId=${selectedBoothId ?? ''}`)}
          >
            부스 선택 및 신청하기
          </button>
        </aside>
      </div>

      <footer className="expo-detail__footer">
        <div>
          <strong>{expo.shortTitle}</strong>
          <span className="expo-detail__footer-fee">
            예상 참가비 {expo.booths[0]?.fee.toLocaleString()} 원 ~
          </span>
        </div>
        <button
          type="button"
          disabled={!selectedBooth}
          onClick={() => navigate(`/expos/${expo.id}/apply?boothId=${selectedBoothId}`)}
        >
          참가 신청하기
        </button>
      </footer>
    </div>
  );
}

export default ExpoDetail;
