import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addVehicleImage,
  deleteVehicle,
  deleteVehicleImage,
  getBoothManageDetail,
  getBoothVehicles,
  toAssetUrl,
  updateBoothContent,
  uploadBoothBannerImage,
} from '../api/expo';
import './BoothManage.css';

function BoothManage() {
  const { boothId } = useParams();

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const [contentForm, setContentForm] = useState({ title: '', content: '' });
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMessage, setContentMessage] = useState(null);
  const [contentError, setContentError] = useState(null);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesError, setVehiclesError] = useState(null);

  // 이미 등록된 차량의 사진 추가/삭제만 담당하는 별도의 간단한 관리 영역
  // (차량 등록/수정 5단계 마법사는 /mypage/booths/:boothId/vehicles/new 전용 페이지로 이동)
  const [imageManagerId, setImageManagerId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boothId]);

  if (detailError) {
    return <p className="booth-manage__status">{detailError}</p>;
  }
  if (!detail) {
    return <p className="booth-manage__status">불러오는 중...</p>;
  }

  const bannerUrl = toAssetUrl(detail.bannerImageUrl);

  const handleContentSave = () => {
    if (!contentForm.title.trim() || !contentForm.content.trim()) {
      setContentError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setContentSaving(true);
    setContentError(null);
    setContentMessage(null);
    updateBoothContent(boothId, contentForm)
      .then(() => setContentMessage('저장되었습니다.'))
      .catch((err) => setContentError(err.response?.data?.error?.message ?? '저장에 실패했습니다.'))
      .finally(() => setContentSaving(false));
  };

  const handleBannerUpload = () => {
    if (!bannerFile) return;
    setBannerUploading(true);
    setBannerError(null);
    uploadBoothBannerImage(boothId, bannerFile)
      .then(() => {
        setBannerFile(null);
        loadDetail();
      })
      .catch((err) => setBannerError(err.response?.data?.error?.message ?? '업로드에 실패했습니다.'))
      .finally(() => setBannerUploading(false));
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (!confirm('이 차량을 삭제하시겠습니까?')) return;
    deleteVehicle(boothId, vehicleId)
      .then(() => {
        loadVehicles();
        if (imageManagerId === vehicleId) setImageManagerId(null);
      })
      .catch((err) => alert(err.response?.data?.error?.message ?? '삭제에 실패했습니다.'));
  };

  const toggleImageManager = (vehicleId) => {
    setImageManagerId((prev) => (prev === vehicleId ? null : vehicleId));
    setImageFile(null);
    setImageError(null);
  };

  const managingVehicle = vehicles.find((v) => v.vehicleId === imageManagerId) ?? null;

  const handleImageUpload = () => {
    if (!imageFile || imageManagerId === null) return;
    setImageUploading(true);
    setImageError(null);
    addVehicleImage(boothId, imageManagerId, imageFile)
      .then(() => {
        setImageFile(null);
        loadVehicles();
      })
      .catch((err) => setImageError(err.response?.data?.error?.message ?? '이미지 업로드에 실패했습니다.'))
      .finally(() => setImageUploading(false));
  };

  const handleImageDelete = (imageId) => {
    if (imageManagerId === null) return;
    deleteVehicleImage(boothId, imageManagerId, imageId)
      .then(loadVehicles)
      .catch((err) => setImageError(err.response?.data?.error?.message ?? '이미지 삭제에 실패했습니다.'));
  };

  return (
    <div className="booth-manage">
      <div className="booth-manage__main">
        <div className="booth-manage__crumb">
          <Link to="/mypage">마이페이지</Link> &gt; <span>{detail.boothNo} 부스 관리</span>
        </div>

        <section className="booth-manage__card">
          <h2>부스 정보</h2>
          <dl className="booth-manage__info">
            <dt>박람회</dt>
            <dd>{detail.expoTitle}</dd>
            <dt>부스 번호</dt>
            <dd>{detail.boothNo} ({detail.boothType})</dd>
          </dl>
        </section>

        <section className="booth-manage__card">
          <h2>배너 이미지</h2>
          <div className="booth-manage__banner-row">
            <div className="booth-manage__banner-preview">
              {bannerUrl ? (
                <img src={bannerUrl} alt="부스 배너" />
              ) : (
                <span className="booth-manage__banner-empty">등록된 배너가 없습니다.</span>
              )}
            </div>
            <div className="booth-manage__banner-controls">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={!bannerFile || bannerUploading}
                onClick={handleBannerUpload}
              >
                {bannerUploading ? '업로드 중...' : '배너 업로드'}
              </button>
              {bannerError && <p className="booth-manage__error">{bannerError}</p>}
            </div>
          </div>
        </section>

        <section className="booth-manage__card">
          <h2>부스 소개</h2>
          <label className="booth-manage__field">
            <span>제목</span>
            <input
              value={contentForm.title}
              onChange={(e) => setContentForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="부스 소개 제목을 입력해주세요."
            />
          </label>
          <label className="booth-manage__field">
            <span>내용</span>
            <textarea
              rows={4}
              value={contentForm.content}
              onChange={(e) => setContentForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="관람객에게 보여줄 부스 소개 내용을 입력해주세요."
            />
          </label>
          {contentError && <p className="booth-manage__error">{contentError}</p>}
          {contentMessage && <p className="booth-manage__success">{contentMessage}</p>}
          <button type="button" disabled={contentSaving} onClick={handleContentSave}>
            {contentSaving ? '저장 중...' : '저장'}
          </button>
        </section>

        <section className="booth-manage__card">
          <div className="booth-manage__card-header">
            <h2>전시 차량 관리</h2>
            <Link to={`/mypage/booths/${boothId}/vehicles/new`} className="booth-manage__cta-link">
              + 차량 등록
            </Link>
          </div>

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
                    <button type="button" onClick={() => toggleImageManager(v.vehicleId)}>
                      이미지 관리
                    </button>
                    <button type="button" onClick={() => handleDeleteVehicle(v.vehicleId)}>삭제</button>
                  </div>
                </div>

                {imageManagerId === v.vehicleId && managingVehicle && (
                  <div className="booth-manage__image-manager">
                    <h4>차량 이미지 ({managingVehicle.images.length}/5)</h4>
                    <div className="booth-manage__image-grid">
                      {managingVehicle.images.map((img) => (
                        <div key={img.imageId} className="booth-manage__image-thumb">
                          <img src={toAssetUrl(img.imageUrl)} alt={managingVehicle.name} />
                          <button type="button" onClick={() => handleImageDelete(img.imageId)}>
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                    {managingVehicle.images.length < 5 && (
                      <div className="booth-manage__banner-controls">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        />
                        <button type="button" disabled={!imageFile || imageUploading} onClick={handleImageUpload}>
                          {imageUploading ? '업로드 중...' : '이미지 추가'}
                        </button>
                      </div>
                    )}
                    {imageError && <p className="booth-manage__error">{imageError}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default BoothManage;