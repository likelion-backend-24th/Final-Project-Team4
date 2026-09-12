import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './ExhibitorVehicleList.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 참가업체 1곳의 전시 차량 목록 - ExhibitorList.jsx에서 업체 카드를 클릭하면 들어온다.
function ExhibitorVehicleList() {
  const { expoId, boothId } = useParams();
  const [expo, setExpo] = useState(null);
  const [group, setGroup] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        const found = groupsRes.find((g) => String(g.boothId) === boothId);
        if (!found) {
          setLoadError('참가업체 정보를 찾을 수 없습니다.');
          return;
        }
        setGroup(found);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId, boothId]);

  const filteredVehicles = useMemo(
    () => group?.vehicles.filter((v) => v.name.toLowerCase().includes(keyword.toLowerCase())) ?? [],
    [group, keyword]
  );

  if (loadError) {
    return <p className="c-vehicle-list__status">{loadError}</p>;
  }
  if (!expo || !group) {
    return <p className="c-vehicle-list__status">불러오는 중...</p>;
  }

  return (
    <div className="c-vehicle-list">
      <section className="c-vehicle-list__hero">
        <p className="c-vehicle-list__eyebrow">EXHIBITION MANAGEMENT PORTAL</p>
        <h1>{expo.title}</h1>
        <p>
          {fmtDate(expo.startsAt)} ~ {fmtDate(expo.endsAt)} | {expo.venue}
        </p>
      </section>

      <div className="c-vehicle-list__toolbar">
        <Link to={`/customer/expos/${expoId}`} className="c-vehicle-group__link">
          &lt; 참가업체 목록으로
        </Link>
        <div className="c-vehicle-list__search-wrap">
          <span className="c-vehicle-list__search-icon" />
          <input
            className="c-vehicle-list__search"
            placeholder="차량명을 검색하세요."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="c-vehicle-list__body">
        <section className="c-vehicle-group">
          <div className="c-vehicle-group__header">
            <span className="c-vehicle-group__logo">{group.title.slice(0, 1)}</span>
            <h2>{group.title}</h2>
            <span className="c-vehicle-group__booth">부스 {group.boothNo}</span>
          </div>

          {filteredVehicles.length === 0 && (
            <p className="c-vehicle-list__status">조건에 맞는 차량이 없습니다.</p>
          )}

          <div className="c-vehicle-group__grid">
            {filteredVehicles.map((v) => (
              <Link
                key={v.vehicleId}
                to={`/customer/expos/${expoId}/vehicles/${v.vehicleId}`}
                className="c-vehicle-card"
              >
                <div className="c-vehicle-card__thumb">
                  {v.images[0] && <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} />}
                </div>
                <div className="c-vehicle-card__body">
                  <h3>{v.name}</h3>
                  <div className="c-vehicle-card__tags">
                    {v.tags.map((t) => (
                      <span key={t} className="c-vehicle-card__tag">
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="c-vehicle-card__link">
                    상세보기 <span className="c-vehicle-card__arrow" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExhibitorVehicleList;
