import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ReviewWriteModal from '../../components/customer/ReviewWriteModal';
import ReviewDetailModal from '../../components/customer/ReviewDetailModal';
import { getBoothReviews, getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import './ExhibitorVehicleList.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 참가업체 1곳의 전시 차량 목록 - ExhibitorList.jsx에서 업체 카드를 클릭하면 들어온다.
function ExhibitorVehicleList() {
  const { expoId, boothId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expo, setExpo] = useState(null);
  const [group, setGroup] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [reviews, setReviews] = useState(null);
  const [reviewTab, setReviewTab] = useState('CONSULT');
  const [selectedReview, setSelectedReview] = useState(null);
  const writeReviewType = searchParams.get('writeReview'); // 마이페이지(예약한 상담)에서 넘어오면 바로 작성 모달을 연다
  const closeWriteReview = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('writeReview');
    next.delete('vehicleName');
    setSearchParams(next, { replace: true });
  };

  const loadReviews = () =>
    getBoothReviews(boothId)
      .then(setReviews)
      .catch(() => setReviews({ totalCount: 0, consultReviews: [], boothReviews: [] }));

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

  useEffect(() => {
    loadReviews();
  }, [boothId]);

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

        <section className="c-review-section">
          <div className="c-review-header">
            <div className="c-review-title-wrap">
              <div className="c-review-title">후기 내역</div>
              <div className="c-review-description">해당 차량 및 부스와 관련된 방문 후기를 확인할 수 있습니다.</div>
            </div>
            {reviews && <div className="c-review-count">전체 <strong>{reviews.totalCount}</strong>건</div>}
          </div>

          <div className="c-review-tabs">
            <button
              type="button"
              className={`c-review-tab${reviewTab === 'CONSULT' ? ' is-active' : ''}`}
              onClick={() => setReviewTab('CONSULT')}
            >
              상담후기
            </button>
            <button
              type="button"
              className={`c-review-tab${reviewTab === 'BOOTH' ? ' is-active' : ''}`}
              onClick={() => setReviewTab('BOOTH')}
            >
              부스후기
            </button>
          </div>

          <div className="c-review-list">
            {(() => {
              const list = reviewTab === 'CONSULT' ? reviews?.consultReviews : reviews?.boothReviews;
              if (!list) {
                return <p className="c-review-empty">불러오는 중...</p>;
              }
              if (list.length === 0) {
                return <p className="c-review-empty">아직 등록된 후기가 없습니다.</p>;
              }
              return list.map((r) => (
                <button
                  type="button"
                  key={r.reviewId}
                  className="c-review-item"
                  onClick={() => setSelectedReview(r)}
                >
                  <div className="c-review-user">
                    <div className="c-review-user-name">{r.customerName}</div>
                    <div className="c-review-date">{fmtDate(r.createdAt)}</div>
                  </div>
                  {r.images?.[0] && (
                    <div className="c-review-thumb">
                      <img src={toAssetUrl(r.images[0].imageUrl)} alt="" />
                    </div>
                  )}
                  <div className="c-review-main">
                    <div className="c-review-tag">{r.vehicleName || `부스 ${r.boothNo}`}</div>
                    <div className="c-review-text">{r.content}</div>
                  </div>
                  <div className="c-review-arrow">›</div>
                </button>
              ));
            })()}
          </div>
        </section>
      </div>

      {writeReviewType && (
        <ReviewWriteModal
          boothId={boothId}
          consultationId={searchParams.get('consultationId')}
          defaultType={writeReviewType}
          defaultVehicleName={searchParams.get('vehicleName') ?? ''}
          lockType
          onClose={closeWriteReview}
          onCreated={() => {
            closeWriteReview();
            loadReviews();
          }}
        />
      )}

      {selectedReview && <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} />}
    </div>
  );
}

export default ExhibitorVehicleList;
