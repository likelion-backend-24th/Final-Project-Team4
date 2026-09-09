import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addVehicleImage,
  deleteVehicle,
  deleteVehicleImage,
  getBoothManageDetail,
  getBoothVehicles,
  registerVehicle,
  toAssetUrl,
  updateBoothContent,
  updateVehicle,
  uploadBoothBannerImage,
} from '../api/expo';
import './BoothManage.css';

const EMPTY_VEHICLE_FORM = {
  name: '',
  tagsText: '',
  startPrice: '',
  summary: '',
  description: '',
  features: '',
  colors: '',
  range: '',
  battery: '',
  power: '',
};

function vehicleToForm(vehicle) {
  return {
    name: vehicle.name,
    tagsText: vehicle.tags.join(', '),
    startPrice: String(vehicle.startPrice),
    summary: vehicle.summary,
    description: vehicle.description,
    features: vehicle.features ?? '',
    colors: vehicle.colors ?? '',
    range: vehicle.range ?? '',
    battery: vehicle.battery ?? '',
    power: vehicle.power ?? '',
  };
}

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

  const [vehicleEditingId, setVehicleEditingId] = useState(null); // null | 'new' | vehicleId
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState(null);

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

  const openNewVehicleForm = () => {
    setVehicleEditingId('new');
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setVehicleFormError(null);
    setImageError(null);
    setImageFile(null);
  };

  const openEditVehicleForm = (vehicle) => {
    setVehicleEditingId(vehicle.vehicleId);
    setVehicleForm(vehicleToForm(vehicle));
    setVehicleFormError(null);
    setImageError(null);
    setImageFile(null);
  };

  const closeVehicleForm = () => setVehicleEditingId(null);

  const handleVehicleFormChange = (field) => (e) =>
    setVehicleForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleVehicleSubmit = () => {
    const payload = {
      name: vehicleForm.name.trim(),
      tags: vehicleForm.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      startPrice: Number(vehicleForm.startPrice),
      summary: vehicleForm.summary.trim(),
      description: vehicleForm.description.trim(),
      features: vehicleForm.features.trim() || null,
      colors: vehicleForm.colors.trim() || null,
      range: vehicleForm.range.trim() || null,
      battery: vehicleForm.battery.trim() || null,
      power: vehicleForm.power.trim() || null,
    };

    if (!payload.name || !payload.summary || !payload.description || !vehicleForm.startPrice) {
      setVehicleFormError('차량명, 시작 가격, 요약, 설명은 필수 항목입니다.');
      return;
    }

    setVehicleSaving(true);
    setVehicleFormError(null);
    const request =
      vehicleEditingId === 'new'
        ? registerVehicle(boothId, payload)
        : updateVehicle(boothId, vehicleEditingId, payload);

    request
      .then((saved) => {
        loadVehicles();
        setVehicleEditingId(saved.vehicleId);
      })
      .catch((err) => setVehicleFormError(err.response?.data?.error?.message ?? '저장에 실패했습니다.'))
      .finally(() => setVehicleSaving(false));
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (!confirm('이 차량을 삭제하시겠습니까?')) return;
    deleteVehicle(boothId, vehicleId)
      .then(() => {
        loadVehicles();
        if (vehicleEditingId === vehicleId) closeVehicleForm();
      })
      .catch((err) => alert(err.response?.data?.error?.message ?? '삭제에 실패했습니다.'));
  };

  const editingVehicle =
    typeof vehicleEditingId === 'number'
      ? vehicles.find((v) => v.vehicleId === vehicleEditingId)
      : null;
  const currentImages = editingVehicle?.images ?? [];

  const handleImageUpload = () => {
    if (!imageFile || typeof vehicleEditingId !== 'number') return;
    setImageUploading(true);
    setImageError(null);
    addVehicleImage(boothId, vehicleEditingId, imageFile)
      .then(() => {
        setImageFile(null);
        loadVehicles();
      })
      .catch((err) => setImageError(err.response?.data?.error?.message ?? '이미지 업로드에 실패했습니다.'))
      .finally(() => setImageUploading(false));
  };

  const handleImageDelete = (imageId) => {
    if (typeof vehicleEditingId !== 'number') return;
    deleteVehicleImage(boothId, vehicleEditingId, imageId)
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
            <button type="button" onClick={openNewVehicleForm}>+ 차량 등록</button>
          </div>

          {vehiclesError && <p className="booth-manage__error">{vehiclesError}</p>}

          {vehicleEditingId !== null && (
            <div className="booth-manage__vehicle-form">
              <h3>{vehicleEditingId === 'new' ? '차량 등록' : '차량 수정'}</h3>
              <div className="booth-manage__vehicle-form-grid">
                <label className="booth-manage__field">
                  <span>차량명 *</span>
                  <input value={vehicleForm.name} onChange={handleVehicleFormChange('name')} />
                </label>
                <label className="booth-manage__field">
                  <span>태그 (쉼표로 구분)</span>
                  <input
                    value={vehicleForm.tagsText}
                    onChange={handleVehicleFormChange('tagsText')}
                    placeholder="전기차, SUV"
                  />
                </label>
                <label className="booth-manage__field">
                  <span>시작 가격 *</span>
                  <input
                    type="number"
                    value={vehicleForm.startPrice}
                    onChange={handleVehicleFormChange('startPrice')}
                  />
                </label>
                <label className="booth-manage__field">
                  <span>1회 충전 주행거리</span>
                  <input value={vehicleForm.range} onChange={handleVehicleFormChange('range')} />
                </label>
                <label className="booth-manage__field">
                  <span>배터리 용량</span>
                  <input value={vehicleForm.battery} onChange={handleVehicleFormChange('battery')} />
                </label>
                <label className="booth-manage__field">
                  <span>최대 출력</span>
                  <input value={vehicleForm.power} onChange={handleVehicleFormChange('power')} />
                </label>
              </div>
              <label className="booth-manage__field">
                <span>요약 *</span>
                <input value={vehicleForm.summary} onChange={handleVehicleFormChange('summary')} />
              </label>
              <label className="booth-manage__field">
                <span>설명 *</span>
                <textarea
                  rows={3}
                  value={vehicleForm.description}
                  onChange={handleVehicleFormChange('description')}
                />
              </label>
              <label className="booth-manage__field">
                <span>주요 특징</span>
                <textarea
                  rows={3}
                  value={vehicleForm.features}
                  onChange={handleVehicleFormChange('features')}
                  placeholder="차량의 주요 특징을 입력해주세요."
                />
              </label>
              <label className="booth-manage__field">
                <span>컬러</span>
                <textarea
                  rows={2}
                  value={vehicleForm.colors}
                  onChange={handleVehicleFormChange('colors')}
                  placeholder="선택 가능한 컬러를 입력해주세요."
                />
              </label>

              {vehicleFormError && <p className="booth-manage__error">{vehicleFormError}</p>}

              <div className="booth-manage__vehicle-form-actions">
                <button type="button" disabled={vehicleSaving} onClick={handleVehicleSubmit}>
                  {vehicleSaving ? '저장 중...' : '저장'}
                </button>
                <button type="button" className="ghost" onClick={closeVehicleForm}>
                  닫기
                </button>
              </div>

              {typeof vehicleEditingId === 'number' && (
                <div className="booth-manage__image-manager">
                  <h4>차량 이미지 ({currentImages.length}/5)</h4>
                  <div className="booth-manage__image-grid">
                    {currentImages.map((img) => (
                      <div key={img.imageId} className="booth-manage__image-thumb">
                        <img src={toAssetUrl(img.imageUrl)} alt={editingVehicle?.name} />
                        <button type="button" onClick={() => handleImageDelete(img.imageId)}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                  {currentImages.length < 5 && (
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
          )}

          <div className="booth-manage__vehicle-list">
            {vehicles.length === 0 && <p className="booth-manage__empty">등록된 차량이 없습니다.</p>}
            {vehicles.map((v) => (
              <div key={v.vehicleId} className="booth-manage__vehicle-row">
                <div className="booth-manage__vehicle-thumb">
                  {v.images[0] ? (
                    <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} />
                  ) : (
                    <span>이미지 없음</span>
                  )}
                </div>
                <div className="booth-manage__vehicle-info">
                  <strong>{v.name}</strong>
                  <span className="booth-manage__vehicle-tags">{v.tags.join(', ') || '-'}</span>
                  <span className="booth-manage__vehicle-price">{v.startPrice.toLocaleString()}원</span>
                </div>
                <div className="booth-manage__vehicle-actions">
                  <button type="button" onClick={() => openEditVehicleForm(v)}>수정</button>
                  <button type="button" onClick={() => handleDeleteVehicle(v.vehicleId)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default BoothManage;
