import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './ExhibitorVehicleList.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function ExhibitorVehicleList() {
  const { expoId } = useParams();
  const [expo, setExpo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        setGroups(groupsRes);
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.')
      );
  }, [expoId]);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          vehicles: g.vehicles.filter(
            (v) =>
              v.name.toLowerCase().includes(keyword.toLowerCase()) ||
              g.title.toLowerCase().includes(keyword.toLowerCase())
          ),
        }))
        .filter((g) => g.vehicles.length > 0),
    [groups, keyword]
  );

  if (loadError) {
    return <p className="c-vehicle-list__status">{loadError}</p>;
  }
  if (!expo) {
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
        <div className="c-vehicle-list__search-wrap">
          <span className="c-vehicle-list__search-icon" />
          <input
            className="c-vehicle-list__search"
            placeholder="차량명 또는 부스명을 검색하세요."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="c-vehicle-list__body">
        {filteredGroups.length === 0 && (
          <p className="c-vehicle-list__status">조건에 맞는 차량이 없습니다.</p>
        )}

        {filteredGroups.map((g) => (
          <section key={g.boothId} className="c-vehicle-group">
            <div className="c-vehicle-group__header">
              <span className="c-vehicle-group__logo">{g.title.slice(0, 1)}</span>
              <h2>{g.title}</h2>
              <span className="c-vehicle-group__booth">부스 {g.boothNo}</span>
            </div>

            <div className="c-vehicle-group__grid">
              {g.vehicles.map((v) => (
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
        ))}
      </div>
    </div>
  );
}

export default ExhibitorVehicleList;
