import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './VehicleDetail.css';

const TABS = ['차량 소개', '주요 특징', '컬러'];

function VehicleDetail() {
  const { expoId, vehicleId } = useParams();
  const [found, setFound] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [tab, setTab] = useState('차량 소개');

  useEffect(() => {
    getCustomerExpoVehicles(expoId)
      .then((groups) => {
        for (const group of groups) {
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
  const mainImageUrl = images[activeImageIdx] ? toAssetUrl(images[activeImageIdx].imageUrl) : null;

  return (
    <div className="c-vehicle-detail">
      <div className="c-vehicle-detail__crumb">
        <Link to="/customer">홈</Link> &gt; <span>{group.title}</span> &gt; <span>{vehicle.name}</span>
      </div>

      <div className="c-vehicle-detail__body">
        <div className="c-vehicle-detail__main">
          <div className="c-vehicle-detail__gallery">
            <div className="c-vehicle-detail__gallery-main">
              {mainImageUrl && <img src={mainImageUrl} alt={vehicle.name} />}
            </div>
            {images.length > 0 && (
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

          <div className="c-vehicle-detail__specs">
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">1회 충전 주행거리</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.range}</span>
            </div>
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">배터리 용량</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.battery}</span>
            </div>
            <div className="c-vehicle-detail__spec">
              <span className="c-vehicle-detail__spec-label">최대 출력</span>
              <span className="c-vehicle-detail__spec-value">{vehicle.power}</span>
            </div>
          </div>

          <nav className="c-vehicle-detail__tabs">
            {TABS.map((t) => (
              <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          <section className="c-vehicle-detail__tabcontent">
            {tab === '차량 소개' && vehicle.description.split('\n').map((line) => <p key={line}>{line}</p>)}
            {tab === '주요 특징' &&
              (vehicle.features
                ? vehicle.features.split('\n').map((line) => <p key={line}>{line}</p>)
                : <p>등록된 주요 특징 정보가 없습니다.</p>)}
            {tab === '컬러' &&
              (vehicle.colors
                ? vehicle.colors.split('\n').map((line) => <p key={line}>{line}</p>)
                : <p>등록된 컬러 정보가 없습니다.</p>)}
          </section>
        </div>
      </div>
    </div>
  );
}

export default VehicleDetail;
