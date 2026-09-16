import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBoothManageDetail, getBoothStats, getExhibitorBoothReviews, toAssetUrl } from '../api/expo';
import './BoothInsights.css';

// 참가업체가 본인 부스의 상담/방문 통계와 실명 후기를 확인하는 화면 - 마이페이지 "부스 참가 신청 현황"의
// 작은 📊 버튼으로 진입한다(부스 관리 화면과 분리, 2026-09-16 확정).
function BoothInsights() {
  const { boothId } = useParams();

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);

  useEffect(() => {
    getBoothManageDetail(boothId)
      .then(setDetail)
      .catch((err) => setDetailError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.'));
    getBoothStats(boothId)
      .then(setStats)
      .catch((err) => setStatsError(err.response?.data?.error?.message ?? '통계를 불러오지 못했습니다.'));
    getExhibitorBoothReviews(boothId)
      .then(setReviews)
      .catch((err) => setReviewsError(err.response?.data?.error?.message ?? '후기를 불러오지 못했습니다.'));
  }, [boothId]);

  return (
    <div className="booth-insights">
      <div className="booth-insights__main">
        <div className="booth-insights__crumb">
          <Link to="/mypage">마이페이지</Link> &gt;{' '}
          <span>{detail ? `${detail.boothNo} 부스` : '부스'} 통계·후기</span>
        </div>

        <h1 className="booth-insights__title">방문 통계 &amp; 후기</h1>
        {detailError && <p className="booth-insights__error">{detailError}</p>}

        <section className="booth-insights__card">
          <h2>방문 통계</h2>
          <p className="booth-insights__desc">상담 신청 현황과 방문자 수를 확인할 수 있습니다.</p>

          {statsError ? (
            <p className="booth-insights__error">{statsError}</p>
          ) : !stats ? (
            <p className="booth-insights__status">불러오는 중...</p>
          ) : (
            <div className="booth-insights__stats-grid">
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.visitCount}</span>
                <span className="booth-insights__stat-label">방문자</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.requestedCount}</span>
                <span className="booth-insights__stat-label">대기</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.approvedCount}</span>
                <span className="booth-insights__stat-label">승인</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.completedCount}</span>
                <span className="booth-insights__stat-label">완료</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.rejectedCount}</span>
                <span className="booth-insights__stat-label">반려</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.noShowCount}</span>
                <span className="booth-insights__stat-label">미방문</span>
              </div>
              <div className="booth-insights__stat-tile">
                <span className="booth-insights__stat-value">{stats.canceledCount}</span>
                <span className="booth-insights__stat-label">취소</span>
              </div>
            </div>
          )}
        </section>

        <section className="booth-insights__card">
          <h2>후기</h2>
          <p className="booth-insights__desc">고객이 남긴 상담후기/부스후기입니다.</p>

          {reviewsError ? (
            <p className="booth-insights__error">{reviewsError}</p>
          ) : !reviews ? (
            <p className="booth-insights__status">불러오는 중...</p>
          ) : reviews.length === 0 ? (
            <p className="booth-insights__status">아직 등록된 후기가 없습니다.</p>
          ) : (
            <div className="booth-insights__review-list">
              {reviews.map((r) => (
                <div key={r.reviewId} className="booth-insights__review-row">
                  <div className="booth-insights__review-head">
                    <span className="booth-insights__review-type">
                      {r.reviewType === 'CONSULT' ? '상담후기' : '부스후기'}
                    </span>
                    <span className="booth-insights__review-author">{r.customerName}</span>
                    {r.vehicleName && <span className="booth-insights__review-vehicle">{r.vehicleName}</span>}
                    <span className="booth-insights__review-date">
                      {r.createdAt ? r.createdAt.slice(0, 10).replace(/-/g, '.') : ''}
                    </span>
                  </div>
                  <p className="booth-insights__review-content">{r.content}</p>
                  {r.images?.length > 0 && (
                    <div className="booth-insights__review-images">
                      {r.images.map((img) => (
                        <img key={img.imageId} src={toAssetUrl(img.imageUrl)} alt="후기 사진" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default BoothInsights;
