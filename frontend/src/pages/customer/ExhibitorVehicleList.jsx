import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VEHICLE_BRANDS, mockCustomerExpos, mockExhibitorGroups } from '../../mock/customerData';
import './ExhibitorVehicleList.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function ExhibitorVehicleList() {
  const { expoId } = useParams();
  const [brand, setBrand] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const expo = mockCustomerExpos.find((e) => String(e.expoId) === expoId);
  const groups = mockExhibitorGroups[expoId] ?? [];

  const filteredGroups = useMemo(
    () =>
      groups
        .filter((g) => brand === 'ALL' || g.brand === brand)
        .map((g) => ({
          ...g,
          vehicles: g.vehicles.filter(
            (v) =>
              v.name.toLowerCase().includes(keyword.toLowerCase()) ||
              g.name.toLowerCase().includes(keyword.toLowerCase())
          ),
        }))
        .filter((g) => g.vehicles.length > 0),
    [groups, brand, keyword]
  );

  if (!expo) {
    return <p className="c-vehicle-list__status">박람회 정보를 찾을 수 없습니다.</p>;
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
        <div className="c-vehicle-list__filters">
          {VEHICLE_BRANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              className={b.key === brand ? 'is-active' : ''}
              onClick={() => setBrand(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="c-vehicle-list__search-wrap">
          <span className="c-vehicle-list__search-icon" />
          <input
            className="c-vehicle-list__search"
            placeholder="차량명 또는 업체명을 검색하세요."
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
          <section key={g.brand} className="c-vehicle-group">
            <div className="c-vehicle-group__header">
              <span className="c-vehicle-group__logo">{g.name.slice(0, 1)}</span>
              <h2>{g.name}</h2>
              <span className="c-vehicle-group__booth">부스 {g.boothNo}</span>
              <span className="c-vehicle-group__link">업체 정보 보기 &gt;</span>
            </div>

            <div className="c-vehicle-group__grid">
              {g.vehicles.map((v) => (
                <Link
                  key={v.id}
                  to={`/customer/expos/${expoId}/vehicles/${v.id}`}
                  className="c-vehicle-card"
                >
                  <div className="c-vehicle-card__thumb" />
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
