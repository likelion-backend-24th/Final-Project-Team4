import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  deleteVehicle,
  getBoothManageDetail,
  getBoothVehicles,
  toAssetUrl,
  updateBoothContent,
  uploadBoothBannerImage,
} from '../api/expo';
import { getMyProfile } from '../api/identity';
import { isFoodBooth } from '../utils/boothType';
import './BoothManage.css';

const TITLE_MAX = 50;
const CONTENT_MAX = 1000;

function BoothManage() {
  const { boothId } = useParams();

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  // 업체/담당자 정보 - 마이페이지의 계정 정보를 그대로 불러와서 "보여주기"만 한다.
  // 여기서 수정해도 저장되지 않음 (계정 정보 수정은 마이페이지에서).
  const [profile, setProfile] = useState(null);

  const [contentForm, setContentForm] = useState({ title: '', content: '' });
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMessage, setContentMessage] = useState(null);
  const [contentError, setContentError] = useState(null);

  const bannerInputRef = useRef(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesError, setVehiclesError] = useState(null);

  const loadDetail = () => {
    getBoothManageDetail(boothId)
      .then((res) => {
        setDetail(res);
        if (res.content) {
          setContentForm({ title: res.content.title, content: res.content.content });
        }
      })
      .catch((err) =>
        setDetailError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.')
      );
  };

  const loadVehicles = () => {
    getBoothVehicles(boothId)
      .then(setVehicles)
      .catch((err) =>
        setVehiclesError(err.response?.data?.error?.message ?? '차량 목록을 불러오지 못했습니다.')
      );
  };

  useEffect(() => {
    loadDetail();
    loadVehicles();
    getMyProfile().then(setProfile).catch(() => setProfile(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boothId]);

  // 새로 고른(아직 저장 안 한) 배너 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  if (detailError) {
    return <p className="booth-manage__status">{detailError}</p>;
  }
  if (!detail) {
    return <p className="booth-manage__status">불러오는 중...</p>;
  }

  const savedBannerUrl = toAssetUrl(detail.bannerImageUrl);
  const bannerDisplayUrl = bannerPreview ?? savedBannerUrl;

  // "배너 이미지"와 "부스 소개"를 둘 다 완료해야만 아래 "전시 차량 관리"에서 새 차량을 등록할 수 있다.
  // (이미 등록된 차량의 수정/이미지 관리/삭제는 이 조건과 무관하게 항상 가능)
  const hasBanner = Boolean(detail.bannerImageUrl);
  const hasIntro = Boolean(
    detail.content && detail.content.title?.trim() && detail.content.content?.trim()
  );
  const canRegisterVehicle = hasBanner && hasIntro;

  // 먹거리(푸드) 부스는 전시할 차량이 없으므로 "전시 차량 관리" 섹션 자체를 보여주지 않는다.
  const showVehicleSection = !isFoodBooth(detail.boothType);

  const handleContentSave = () => {
    if (!contentForm.title.trim() || !contentForm.content.trim()) {
      setContentError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setContentSaving(true);
    setContentError(null);
    setContentMessage(null);
    updateBoothContent(boothId, contentForm)
      .then(() => {
        setContentMessage('저장되었습니다.');
        // 저장 직후 detail.content를 다시 불러와야 아래 "전시 차량 관리" 잠금 해제 여부가 바로 반영된다.
        loadDetail();
      })
      .catch((err) => setContentError(err.response?.data?.error?.message ?? '저장에 실패했습니다.'))
      .finally(() => setContentSaving(false));
  };

  const openBannerPicker = () => bannerInputRef.current?.click();

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setBannerError(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    if (!file) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const cancelBannerSelection = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleBannerUpload = () => {
    if (!bannerFile) return;
    setBannerUploading(true);
    setBannerError(null);
    uploadBoothBannerImage(boothId, bannerFile)
      .then(() => {
        if (bannerPreview) URL.revokeObjectURL(bannerPreview);
        setBannerFile(null);
        setBannerPreview(null);
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        loadDetail();
      })
      .catch((err) => setBannerError(err.response?.data?.error?.message ?? '업로드에 실패했습니다.'))
      .finally(() => setBannerUploading(false));
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (!confirm('이 차량을 삭제하시겠습니까?')) return;
    deleteVehicle(boothId, vehicleId)
      .then(() => loadVehicles())
      .catch((err) => alert(err.response?.data?.error?.message ?? '삭제에 실패했습니다.'));
  };

  return (
    <div className="booth-manage">
      <div className="booth-manage__main">
        <div className="booth-manage__crumb">
          <Link to="/mypage">마이페이지</Link> &gt; <span>{detail.boothNo} 부스 관리</span> &gt;{' '}
          <span>부스 정보 등록</span>
        </div>

        <div className="booth-manage__page-header">
          <div>
            <h1 className="booth-manage__page-title">부스 정보 등록</h1>
            <p className="booth-manage__page-subtitle">
              부스 소개와 배너 이미지를 등록하여 관람객에게 부스를 효과적으로 소개하세요.
            </p>
          </div>
          <span className="booth-manage__required-note">* 표시는 필수 입력 항목입니다.</span>
        </div>

        <section className="booth-manage__card">
          <div className="booth-manage__section-header">
            <span className="booth-manage__badge">1</span>
            <div>
              <h2>부스 기본 정보</h2>
              <p className="booth-manage__section-desc">박람회와 부스 정보를 입력해주세요.</p>
            </div>
          </div>

          <div className="booth-manage__basic-grid">
            <div className="booth-manage__basic-col">
              <label className="booth-manage__field">
                <span>박람회 <span className="booth-manage__req">*</span></span>
                <div className="booth-manage__readonly-box">
                  <span className="booth-manage__readonly-icon">📅</span>
                  {detail.expoTitle}
                </div>
              </label>
              <label className="booth-manage__field">
                <span>부스 유형 <span className="booth-manage__req">*</span></span>
                <div className="booth-manage__readonly-box">
                  <span className="booth-manage__readonly-icon">🏷️</span>
                  {detail.boothType}
                </div>
              </label>
              <label className="booth-manage__field">
                <span>부스 번호 <span className="booth-manage__req">*</span></span>
                <div className="booth-manage__readonly-box">
                  <span className="booth-manage__readonly-icon">📍</span>
                  {detail.boothNo}
                </div>
              </label>
            </div>

            <div className="booth-manage__basic-col">
              <label className="booth-manage__field">
                <span>업체명 <span className="booth-manage__req">*</span></span>
                <input value={profile?.companyName ?? ''} readOnly />
              </label>
              <label className="booth-manage__field">
                <span>담당자명 <span className="booth-manage__req">*</span></span>
                <input value={profile?.managerName ?? ''} readOnly />
              </label>
              <div className="booth-manage__half-row">
                <label className="booth-manage__field">
                  <span>연락처 <span className="booth-manage__req">*</span></span>
                  <input value={profile?.contact ?? ''} readOnly />
                </label>
                <label className="booth-manage__field">
                  <span>이메일 <span className="booth-manage__req">*</span></span>
                  <input value={profile?.email ?? ''} readOnly />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="booth-manage__card">
          <div className="booth-manage__section-header">
            <span className="booth-manage__badge">2</span>
            <div>
              <h2>배너 이미지</h2>
              <p className="booth-manage__section-desc">
                부스 배너 이미지를 업로드해주세요. (권장 사이즈 1200 x 400px)
              </p>
            </div>
          </div>

          <div className="booth-manage__banner-row">
            <div className="booth-manage__banner-dropzone" onClick={openBannerPicker}>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleBannerFileChange}
                hidden
              />
              {bannerDisplayUrl ? (
                <>
                  <img src={bannerDisplayUrl} alt="부스 배너" />
                  <span className="booth-manage__banner-hover-hint">
                    클릭하면 이미지를 변경할 수 있어요
                  </span>
                </>
              ) : (
                <div className="booth-manage__banner-placeholder">
                  <span className="booth-manage__banner-icon">🖼️</span>
                  <p>배너 이미지를 업로드해주세요.</p>
                  <span className="booth-manage__banner-hint">
                    권장 사이즈 1200 x 400px (JPG, PNG)
                  </span>
                  <span className="booth-manage__banner-select-btn">+ 이미지 선택</span>
                </div>
              )}
            </div>

            <div className="booth-manage__banner-guide">
              <p className="booth-manage__banner-guide-title">
                <span>ⓘ</span> 이미지 업로드 안내
              </p>
              <ul>
                <li>부스 대표 이미지로 박람회 페이지에 노출됩니다.</li>
                <li>가로형 이미지를 권장합니다. (1200x400px)</li>
                <li>파일 형식: JPG, PNG (최대 5MB)</li>
                <li>기업 로고, 부스 전경, 주제 색 이미지를 활용해보세요.</li>
              </ul>
            </div>
          </div>

          {bannerFile && (
            <div className="booth-manage__banner-actions">
              <button type="button" disabled={bannerUploading} onClick={handleBannerUpload}>
                {bannerUploading ? '저장 중...' : '배너 저장'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={bannerUploading}
                onClick={cancelBannerSelection}
              >
                취소
              </button>
            </div>
          )}
          {bannerError && <p className="booth-manage__error">{bannerError}</p>}
        </section>

        <section className="booth-manage__card">
          <div className="booth-manage__section-header">
            <span className="booth-manage__badge">3</span>
            <div>
              <h2>부스 소개</h2>
              <p className="booth-manage__section-desc">
                부스를 한눈에 알 수 있도록 상세 내용을 입력해주세요.
              </p>
            </div>
          </div>

          <label className="booth-manage__field">
            <span>제목 <span className="booth-manage__req">*</span></span>
            <input
              value={contentForm.title}
              maxLength={TITLE_MAX}
              onChange={(e) => setContentForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="부스 소개 제목을 입력해주세요."
            />
            <span className="booth-manage__counter">
              {contentForm.title.length}/{TITLE_MAX}
            </span>
          </label>
          <label className="booth-manage__field">
            <span>내용 <span className="booth-manage__req">*</span></span>
            <textarea
              rows={4}
              value={contentForm.content}
              maxLength={CONTENT_MAX}
              onChange={(e) => setContentForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="관람객에게 보여줄 부스 소개 내용을 입력해주세요."
            />
            <span className="booth-manage__counter">
              {contentForm.content.length}/{CONTENT_MAX}
            </span>
          </label>
          {contentError && <p className="booth-manage__error">{contentError}</p>}
          {contentMessage && <p className="booth-manage__success">{contentMessage}</p>}
          <button type="button" disabled={contentSaving} onClick={handleContentSave}>
            {contentSaving ? '저장 중...' : '저장'}
          </button>
        </section>

        {showVehicleSection && (
        <section className="booth-manage__card">
          <div className="booth-manage__card-header">
            <div className="booth-manage__section-header">
              <span className="booth-manage__badge">4</span>
              <div>
                <h2>전시 차량 관리</h2>
              </div>
            </div>
            {canRegisterVehicle ? (
              <Link to={`/mypage/booths/${boothId}/vehicles/new`} className="booth-manage__cta-link">
                + 차량 등록
              </Link>
            ) : (
              <span
                className="booth-manage__cta-link booth-manage__cta-link--disabled"
                title="배너 이미지와 부스 소개를 먼저 등록해주세요."
              >
                🔒 + 차량 등록
              </span>
            )}
          </div>

          {!canRegisterVehicle && (
            <p className="booth-manage__locked-notice">
              위의 <strong>배너 이미지</strong>와 <strong>부스 소개</strong>를 모두 등록해야 차량을 등록할 수 있어요.
              {!hasBanner && !hasIntro
                ? ' (배너 이미지, 부스 소개 모두 비어 있어요)'
                : !hasBanner
                ? ' (배너 이미지가 비어 있어요)'
                : ' (부스 소개가 비어 있어요)'}
            </p>
          )}

          {vehiclesError && <p className="booth-manage__error">{vehiclesError}</p>}

          <div className="booth-manage__vehicle-list">
            {vehicles.length === 0 && <p className="booth-manage__empty">등록된 차량이 없습니다.</p>}
            {vehicles.map((v) => (
              <div key={v.vehicleId} className="booth-manage__vehicle-row-wrap">
                <div className="booth-manage__vehicle-row">
                  <div className="booth-manage__vehicle-thumb">
                    {v.images[0] ? (
                      <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} />
                    ) : (
                      <span>이미지 없음</span>
                    )}
                  </div>
                  <div className="booth-manage__vehicle-info">
                    <strong>{v.name}</strong>
                    <span className="booth-manage__vehicle-tags">
                      {[v.brand, v.category].filter(Boolean).join(' · ') || v.tags.join(', ') || '-'}
                    </span>
                    <span className="booth-manage__vehicle-price">{v.startPrice.toLocaleString()}원</span>
                  </div>
                  <div className="booth-manage__vehicle-actions">
                    <Link
                      to={`/mypage/booths/${boothId}/vehicles/${v.vehicleId}/edit`}
                      className="booth-manage__edit-link"
                    >
                      수정
                    </Link>
                    <button type="button" onClick={() => handleDeleteVehicle(v.vehicleId)}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

export default BoothManage;