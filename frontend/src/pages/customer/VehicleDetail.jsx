import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BulkConsultPromo from '../../components/customer/BulkConsultPromo';
import { getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './VehicleDetail.css';
import '../customer/ExhibitorList.css';

const TABS = ['차량 소개', '주요 특징', '컬러'];

// 주요 제원 그리드에 뿌릴 항목 - 값이 없는 항목(선택 입력이라 비어있을 수 있음)은 자동으로 건너뛴다.
const SPEC_FIELDS = [
  { key: 'range', icon: '🛣️', label: '1회 충전 주행거리' },
  { key: 'battery', icon: '🔋', label: '배터리 용량' },
  { key: 'power', icon: '⚡', label: '최대 출력' },
  { key: 'drivetrain', icon: '⚙️', label: '구동 방식' },
  { key: 'chargingType', icon: '🔌', label: '충전 방식' },
  { key: 'chargingTime', icon: '⏱️', label: '충전 시간' },
  { key: 'dimensions', icon: '📐', label: '크기 (전장x전폭x전고)' },
  { key: 'weight', icon: '⚖️', label: '무게' },
  { key: 'seatingCapacity', icon: '👥', label: '승차 인원', suffix: '명' },
];

// 컬러 이름에 자주 쓰이는 한글 표현을 대략적인 색상으로 매핑 - 못 찾으면 중립 회색 스와치로 표시.
const COLOR_HEX_MAP = [
  [/화이트|백색|펄/i, '#f8fafc'],
  [/블랙|흑색/i, '#0f172a'],
  [/그레이|실버|그래파이트/i, '#94a3b8'],
  [/레드|적색/i, '#ef4444'],
  [/블루|청색/i, '#2563eb'],
  [/그린|녹색/i, '#10b981'],
  [/옐로우|노랑/i, '#f59e0b'],
  [/베이지|아이보리|화이트/i, '#e7dfce'],
  [/카키/i, '#6b7a4a'],
  [/브라운|갈색/i, '#78350f'],
  [/골드|금색/i, '#caa456'],
];

const colorToHex = (name) => COLOR_HEX_MAP.find(([re]) => re.test(name))?.[1] ?? '#cbd5e1';

const splitLines = (text) =>
  (text ?? '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

function VehicleDetail() {
  const { expoId, vehicleId } = useParams();
  const [groups, setGroups] = useState([]);
  const [found, setFound] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [tab, setTab] = useState('차량 소개');

  useEffect(() => {
    getCustomerExpoVehicles(expoId)
      .then((groupsRes) => {
        setGroups(groupsRes);
        for (const group of groupsRes) {
          const vehicle = group.vehicles.find((v) => String(v.vehicleId) === vehicleId);
          if (vehicle) {
            setFound({ vehicle, group });
            return;
          }
        }
        setLoadError('차량 정보를 찾을 수 없습니다.');
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '차량 정보를 불러오지 못했습니다.')
      );
  }, [expoId, vehicleId]);

  if (loadError) {
    return <p className="c-vehicle-detail__status">{loadError}</p>;
  }
  if (!found) {
    return <p className="c-vehicle-detail__status">불러오는 중...</p>;
  }

  const { vehicle, group } = found;
  const images = vehicle.images;
  const imageCount = images.length;
   const mainImageUrl = images[activeImageIdx] ? toAssetUrl(images[activeImageIdx].imageUrl) : null;
  const brandName = vehicle.brand || group.title;
  const brandLogoUrl = group.bannerImageUrl ? toAssetUrl(group.bannerImageUrl) : null;

  const goPrevImage = () => setActiveImageIdx((i) => (i - 1 + imageCount) % imageCount);
  const goNextImage = () => setActiveImageIdx((i) => (i + 1) % imageCount);

  const specs = SPEC_FIELDS.filter((f) => vehicle[f.key] !== null && vehicle[f.key] !== undefined && vehicle[f.key] !== '');
  const featureLines = splitLines(vehicle.features);
  const colorLines = splitLines(vehicle.colors);

  return (
    <div className="c-vehicle-detail">
      <div className="c-vehicle-detail__crumb">
        <Link to="/customer">홈</Link> &gt; <Link to={`/customer/expos/${expoId}`}>전시 차량</Link> &gt;{' '}
        <Link to={`/customer/expos/${expoId}/booths/${group.boothId}`}>{group.title}</Link> &gt; <span>{vehicle.name}</span>
      </div>

      <div className="c-vehicle-detail__layout">
        <div className="c-vehicle-detail__main">
          <div className="c-vehicle-detail__gallery">
            <div className="c-vehicle-detail__gallery-main">
              {mainImageUrl && <img src={mainImageUrl} alt={vehicle.name} />}
              {imageCount > 1 && (
                <>
                  <button type="button" className="c-vehicle-detail__gallery-arrow c-vehicle-detail__gallery-arrow--prev" onClick={goPrevImage} aria-label="이전 사진">
                    ‹
                  </button>
                  <button type="button" className="c-vehicle-detail__gallery-arrow c-vehicle-detail__gallery-arrow--next" onClick={goNextImage} aria-label="다음 사진">
                    ›
                  </button>
                  <span className="c-vehicle-detail__gallery-counter">
                    {activeImageIdx + 1} / {imageCount}
                  </span>
                </>
              )}
            </div>
            {imageCount > 0 && (
              <div className="c-vehicle-detail__gallery-thumbs">
                {images.map((img, i) => (
                  <button
                    key={img.imageId}
                    type="button"
                    className={`c-vehicle-detail__gallery-thumb${i === activeImageIdx ? ' is-active' : ''}`}
                    onClick={() => setActiveImageIdx(i)}
                  >
                    <img src={toAssetUrl(img.imageUrl)} alt={`${vehicle.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

           <div className="c-vehicle-detail__brand">
            {brandLogoUrl ? (
              <img className="c-vehicle-detail__brand-logo" src={brandLogoUrl} alt={brandName} />
            ) : (
              <span className="c-vehicle-detail__brand-badge">{brandName.slice(0, 1)}</span>
            )}
          </div>

          <h1>{vehicle.name}</h1>
          <p className="c-vehicle-detail__summary">{vehicle.summary}</p>
          <div className="c-vehicle-detail__tags">
            {vehicle.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>

          <p className="c-vehicle-detail__price">
            시작 가격 <strong>{vehicle.startPrice.toLocaleString()}원</strong>
          </p>

          {specs.length > 0 && (
            <section className="c-vehicle-detail__card">
              <h2 className="c-vehicle-detail__card-title">
                <span className="c-vehicle-detail__card-icon">📋</span> 주요 제원
              </h2>
              <div className="c-vehicle-detail__specs">
                {specs.map((f) => (
                  <div key={f.key} className="c-vehicle-detail__spec">
                    <span className="c-vehicle-detail__spec-icon">{f.icon}</span>
                    <div>
                      <span className="c-vehicle-detail__spec-label">{f.label}</span>
                      <span className="c-vehicle-detail__spec-value">
                        {vehicle[f.key]}
                        {f.suffix ?? ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="c-vehicle-detail__card">
            <nav className="c-vehicle-detail__tabs">
              {TABS.map((t) => (
                <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </nav>

            <div className="c-vehicle-detail__tabcontent">
              {tab === '차량 소개' && (
                <div className="c-vehicle-detail__intro">
                  <div className="c-vehicle-detail__intro-text">
                    {vehicle.description
                      ? vehicle.description.split('\n').map((line, i) => <p key={i}>{line}</p>)
                      : <p>등록된 차량 소개가 없습니다.</p>}
                  </div>
                  {images[1] && (
                    <div className="c-vehicle-detail__intro-image">
                      <img src={toAssetUrl(images[1].imageUrl)} alt={vehicle.name} />
                    </div>
                  )}
                </div>
              )}
              {tab === '주요 특징' &&
                (featureLines.length > 0
                  ? (
                    <ul className="c-vehicle-detail__feature-list">
                      {featureLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )
                  : <p>등록된 주요 특징 정보가 없습니다.</p>)}
              {tab === '컬러' &&
                (colorLines.length > 0
                  ? (
                    <div className="c-vehicle-detail__color-grid">
                      {colorLines.map((name) => (
                        <div key={name} className="c-vehicle-detail__color-item">
                          <span className="c-vehicle-detail__color-dot" style={{ background: colorToHex(name) }} />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  )
                  : <p>등록된 컬러 정보가 없습니다.</p>)}
            </div>
          </section>

          {(featureLines.length > 0 || colorLines.length > 0) && (
            <div className="c-vehicle-detail__preview-row">
              {featureLines.length > 0 && (
                <section className="c-vehicle-detail__card">
                  <h2 className="c-vehicle-detail__card-title">
                    <span className="c-vehicle-detail__card-icon">🔵</span> 주요 특징
                  </h2>
                  <ul className="c-vehicle-detail__feature-list">
                    {featureLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}
              {colorLines.length > 0 && (
                <section className="c-vehicle-detail__card">
                  <div className="c-vehicle-detail__card-header">
                    <h2 className="c-vehicle-detail__card-title">
                      <span className="c-vehicle-detail__card-icon c-vehicle-detail__color-wheel-icon" /> 컬러
                    </h2>
                    <button type="button" className="c-vehicle-detail__color-link" onClick={() => setTab('컬러')}>
                      전체 컬러 보기 &gt;
                    </button>
                  </div>
                  <div className="c-vehicle-detail__color-grid">
                    {colorLines.map((name) => (
                      <div key={name} className="c-vehicle-detail__color-item">
                        <span className="c-vehicle-detail__color-dot" style={{ background: colorToHex(name) }} />
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <BulkConsultPromo expoId={expoId} groups={groups} lockedBoothId={group.boothId} defaultVehicle={vehicle.name} />
      </div>
    </div>
  );
}

export default VehicleDetail;