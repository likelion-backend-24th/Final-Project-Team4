import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  addVehicleImage,
  analyzeVehicleImage,
  getBoothManageDetail,
  getBoothVehicles,
  registerVehicle,
  updateVehicle,
} from '../api/expo';
import { getMyProfile } from '../api/identity';
import './BoothVehicleRegister.css';

const TRACKER_STEPS = [
  { id: 1, label: '기본 정보' },
  { id: 2, label: '이미지 업로드' },
  { id: 3, label: 'AI 자동 입력' },
  { id: 4, label: '정보 확인' },
  { id: 5, label: '등록 완료' },
];

const ANALYSIS_STAGES = [
  '이미지 전처리 중...',
  '차량 모델 인식 중...',
  '주요 사양 분석 중...',
  '정보 자동 입력 중...',
  '완료',
];

// 정면/측면/후면 3개 슬롯 - 이 중 최소 1장은 업로드해야 다음 단계로 진행할 수 있다.
const IMAGE_SLOTS = [
  { key: 'front', label: '정면' },
  { key: 'side', label: '측면' },
  { key: 'back', label: '후면' },
];

function emptyImages() {
  return { front: null, side: null, back: null };
}

function emptyVehicleForm() {
  return {
    name: '',
    brand: '',
    category: '',
    tagsText: '',
    startPrice: '',
    range: '',
    battery: '',
    power: '',
    drivetrain: '',
    chargingType: '',
    chargingTime: '',
    dimensions: '',
    weight: '',
    seatingCapacity: '',
    summary: '',
    description: '',
    features: '',
    colors: '',
  };
}

function vehicleToForm(vehicle) {
  return {
    name: vehicle.name ?? '',
    brand: vehicle.brand ?? '',
    category: vehicle.category ?? '',
    tagsText: (vehicle.tags ?? []).join(', '),
    startPrice: vehicle.startPrice != null ? String(vehicle.startPrice) : '',
    range: vehicle.range ?? '',
    battery: vehicle.battery ?? '',
    power: vehicle.power ?? '',
    drivetrain: vehicle.drivetrain ?? '',
    chargingType: vehicle.chargingType ?? '',
    chargingTime: vehicle.chargingTime ?? '',
    dimensions: vehicle.dimensions ?? '',
    weight: vehicle.weight ?? '',
    seatingCapacity: vehicle.seatingCapacity != null ? String(vehicle.seatingCapacity) : '',
    summary: vehicle.summary ?? '',
    description: vehicle.description ?? '',
    features: vehicle.features ?? '',
    colors: vehicle.colors ?? '',
  };
}

// 부스 정보 등록 - 5단계 마법사를 한 화면에 순서대로 잠금 해제하며 보여주는 전용 페이지.
// 기본정보 -> 이미지 업로드 -> AI 자동분석(Gemini Vision) -> 정보 확인/수정 -> 추가정보 -> 등록
function BoothVehicleRegister() {
  const { boothId, vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const editVehicleId = vehicleId ?? searchParams.get('vehicleId');
  const isEdit = Boolean(editVehicleId);
  const navigate = useNavigate();

  const [booth, setBooth] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // 1단계 - 담당자/업체 정보는 내 계정 정보를 그대로 보여주는 용도라 별도로 저장되지 않는다.
  const [contact, setContact] = useState({ managerName: '', contact: '', email: '', companyName: '' });

  const [step, setStep] = useState(1); // 현재까지 도달한(잠금 해제된) 단계
  const [form, setForm] = useState(emptyVehicleForm);
  const [stepError, setStepError] = useState(null); // 1단계 검증 메시지
  const [step4Error, setStep4Error] = useState(null); // 4단계 검증 메시지

  // 정면/측면/후면 슬롯별 파일 - 최소 1장 필수. 언제든(등록 완료 이후에도) 다시 골라서 재분석할 수 있다.
  const [images, setImages] = useState(emptyImages);
  const [imagePreviews, setImagePreviews] = useState(emptyImages);
  const [uploadError, setUploadError] = useState(null); // "최소 1장 필요" 등 이미지 자체의 검증 메시지

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0); // 0~4
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const analysisTimerRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    Promise.all([getBoothManageDetail(boothId), getMyProfile()])
      .then(([boothDetail, profile]) => {
        setBooth(boothDetail);
        setContact({
          managerName: profile.managerName ?? '',
          contact: profile.contact ?? '',
          email: profile.email ?? '',
          companyName: profile.companyName ?? '',
        });
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.')
      );
  }, [boothId]);

  // 수정 모드: 기존 차량 데이터를 불러와 전 단계를 바로 열어둔다 (처음 등록할 때만 순서대로 잠금).
  useEffect(() => {
    if (!editVehicleId) return;
    getBoothVehicles(boothId)
      .then((list) => {
        const vehicle = list.find((v) => String(v.vehicleId) === String(editVehicleId));
        if (vehicle) {
          setForm(vehicleToForm(vehicle));
          setStep(5);
          setAnalyzed(false);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVehicleId, boothId]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((url) => url && URL.revokeObjectURL(url));
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactField = (field) => (e) =>
    setContact((prev) => ({ ...prev, [field]: e.target.value }));

  const goStep1Next = () => {
    if (!contact.managerName.trim() || !contact.contact.trim() || !contact.email.trim()) {
      setStepError('담당자명, 연락처, 이메일을 모두 입력해주세요.');
      return;
    }
    setStepError(null);
    setStep((s) => Math.max(s, 2));
  };

  const hasAnyImage = Object.values(images).some(Boolean);

  const handleImageSelect = (slotKey) => (e) => {
    const file = e.target.files?.[0] ?? null;
    setImagePreviews((prev) => {
      if (prev[slotKey]) URL.revokeObjectURL(prev[slotKey]);
      return { ...prev, [slotKey]: file ? URL.createObjectURL(file) : null };
    });
    setImages((prev) => ({ ...prev, [slotKey]: file }));
    setUploadError(null);
  };

  // 이미지를 다시 넣고(정면/측면/후면 중 아무 슬롯이나 교체) 이 버튼을 누르면 그때마다 AI가 새로 검색한다.
  // 등록 완료(5단계) 이후에도 계속 눌러서 재분석할 수 있다 - step은 잠금 해제 여부만 결정할 뿐 되돌리지 않는다.
  const startAiAnalysis = () => {
    if (!hasAnyImage) {
      setUploadError('정면, 측면, 후면 중 최소 1장은 업로드해주세요.');
      return;
    }
    setUploadError(null);
    setStep((s) => Math.max(s, 3));
    setAnalyzing(true);
    setAnalysisStage(0);
    setAnalyzeError(null);

    const files = IMAGE_SLOTS.map((slot) => images[slot.key]).filter(Boolean);

    // 실제 API 응답을 기다리는 동안, 4단계까지는 타이머로 진행 상태를 보여주고
    // 응답이 오면 바로 5단계(완료)로 점프한다.
    analysisTimerRef.current = setInterval(() => {
      setAnalysisStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    analyzeVehicleImage(boothId, files)
      .then((result) => {
        if (result?.analyzed) {
          setAnalyzed(true);
          // 재분석 시에는 새로 찾은 값을 우선 반영한다 (다시 검색한 의미가 있도록).
          // 다만 AI가 이번엔 못 찾은 필드(null)는 기존에 입력해둔 값을 그대로 유지한다.
          setForm((prev) => ({
            ...prev,
            name: result.name ?? prev.name,
            brand: result.brand ?? prev.brand,
            category: result.category ?? prev.category,
            tagsText: result.tags?.length ? result.tags.join(', ') : prev.tagsText,
            range: result.range ?? prev.range,
            battery: result.battery ?? prev.battery,
            power: result.power ?? prev.power,
            drivetrain: result.drivetrain ?? prev.drivetrain,
            chargingType: result.chargingType ?? prev.chargingType,
            chargingTime: result.chargingTime ?? prev.chargingTime,
            dimensions: result.dimensions ?? prev.dimensions,
            weight: result.weight ?? prev.weight,
            seatingCapacity:
              result.seatingCapacity != null ? String(result.seatingCapacity) : prev.seatingCapacity,
            summary: result.summary ?? prev.summary,
            description: result.description ?? prev.description,
            features: result.features ?? prev.features,
            colors: result.colors ?? prev.colors,
          }));
        } else {
          setAnalyzed(false);
          setAnalyzeError('AI가 사진에서 차량 정보를 추출하지 못했어요. 아래에서 직접 입력해주세요.');
        }
      })
      .catch((err) => {
        setAnalyzed(false);
        setAnalyzeError(
          err.response?.data?.error?.message ?? 'AI 분석 중 오류가 발생했어요. 직접 입력해주세요.'
        );
      })
      .finally(() => {
        clearInterval(analysisTimerRef.current);
        setAnalyzing(false);
        setAnalysisStage(4);
        setTimeout(() => setStep((s) => Math.max(s, 4)), 500);
      });
  };

  const skipToManualInput = () => {
    if (!hasAnyImage) {
      setUploadError('정면, 측면, 후면 중 최소 1장은 업로드해주세요.');
      return;
    }
    setUploadError(null);
    setStep((s) => Math.max(s, 4));
  };

  const goStep4Next = () => {
    if (!form.name.trim() || !form.startPrice || !form.summary.trim() || !form.description.trim()) {
      setStep4Error('차량명, 시작 가격, 요약, 설명은 필수 항목입니다.');
      return;
    }
    setStep4Error(null);
    setStep((s) => Math.max(s, 5));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    startPrice: Number(form.startPrice),
    summary: form.summary.trim(),
    description: form.description.trim(),
    features: form.features.trim() || null,
    colors: form.colors.trim() || null,
    range: form.range.trim() || null,
    battery: form.battery.trim() || null,
    power: form.power.trim() || null,
    brand: form.brand.trim() || null,
    category: form.category.trim() || null,
    drivetrain: form.drivetrain.trim() || null,
    chargingType: form.chargingType.trim() || null,
    chargingTime: form.chargingTime.trim() || null,
    dimensions: form.dimensions.trim() || null,
    weight: form.weight.trim() || null,
    seatingCapacity: form.seatingCapacity ? Number(form.seatingCapacity) : null,
  });

  const handleRegister = () => {
    if (!form.name.trim() || !form.startPrice || !form.summary.trim() || !form.description.trim()) {
      setStep4Error('차량명, 시작 가격, 요약, 설명은 필수 항목입니다.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const payload = buildPayload();
    const request = isEdit
      ? updateVehicle(boothId, editVehicleId, payload)
      : registerVehicle(boothId, payload);

    const filesToUpload = IMAGE_SLOTS.map((slot) => images[slot.key]).filter(Boolean);

    request
      .then((saved) => {
        if (filesToUpload.length === 0) return null;
        // 정면/측면/후면 중 업로드된 이미지를 전부 순서대로 등록. 한 장이 실패해도 등록 자체는 막지 않는다.
        return filesToUpload.reduce(
          (chain, file) => chain.then(() => addVehicleImage(boothId, saved.vehicleId, file).catch(() => {})),
          Promise.resolve()
        );
      })
      .then(() => navigate(`/mypage/booths/${boothId}`))
      .catch((err) => setSaveError(err.response?.data?.error?.message ?? '등록에 실패했습니다.'))
      .finally(() => setSaving(false));
  };

  if (loadError) {
    return <p className="bvr-status">{loadError}</p>;
  }
  if (!booth) {
    return <p className="bvr-status">불러오는 중...</p>;
  }

  const isLocked = (n) => step < n;
  const analysisProgress = Math.round(((analysisStage + 1) / ANALYSIS_STAGES.length) * 100);
  const alreadyAnalyzedOnce = analyzed || analysisStage > 0;

  return (
    <div className="bvr">
      <div className="bvr-header">
        <div className="bvr-crumb">
          <Link to="/mypage">마이페이지</Link> &gt;{' '}
          <Link to={`/mypage/booths/${boothId}`}>{booth.boothNo} 부스 관리</Link> &gt;{' '}
          <span>부스 정보 등록</span>
        </div>
        <h1>부스 정보 등록</h1>
        <p className="bvr-subtitle">
          부스 정보를 입력하고 차량 이미지를 업로드하면 AI가 정보를 자동으로 분석해 더 간편하게 등록할 수 있습니다.
        </p>

        <ol className="bvr-tracker">
          {TRACKER_STEPS.map((t) => (
            <li
              key={t.id}
              className={
                'bvr-tracker__item' +
                (t.id === step ? ' is-active' : '') +
                (t.id < step ? ' is-done' : '')
              }
            >
              <span className="bvr-tracker__dot">{t.id < step ? '✓' : t.id}</span>
              <span className="bvr-tracker__label">{t.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 1. 기본 정보 입력 */}
      <section className="bvr-section is-open">
        <header className="bvr-section__head">
          <span className="bvr-section__badge is-active">1</span>
          <h2>기본 정보 입력</h2>
          <span className="bvr-chip">필수</span>
          <p className="bvr-section__desc">먼저 기본 정보를 입력해주세요. 입력 후 다음 단계로 진행할 수 있습니다.</p>
        </header>
        <div className="bvr-section__body">
          <div className="bvr-grid">
            <label className="bvr-field">
              <span>박람회명</span>
              <input value={booth.expoTitle} disabled />
            </label>
            <label className="bvr-field">
              <span>담당자명 *</span>
              <input value={contact.managerName} onChange={handleContactField('managerName')} />
            </label>
            <label className="bvr-field">
              <span>부스 번호</span>
              <input value={`${booth.boothNo} (${booth.boothType})`} disabled />
            </label>
            <label className="bvr-field">
              <span>연락처 *</span>
              <input value={contact.contact} onChange={handleContactField('contact')} />
            </label>
            <label className="bvr-field">
              <span>참가 업체명</span>
              <input value={contact.companyName} disabled />
            </label>
            <label className="bvr-field">
              <span>이메일 *</span>
              <input value={contact.email} onChange={handleContactField('email')} />
            </label>
          </div>
          {step === 1 && stepError && <p className="bvr-hint bvr-hint--error">{stepError}</p>}
          {step === 1 && (
            <div className="bvr-section__actions">
              <button type="button" className="bvr-btn" onClick={goStep1Next}>
                다음 단계 &gt;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. 차량 이미지 업로드 */}
      <section className={`bvr-section ${isLocked(2) ? 'is-locked' : 'is-open'}`}>
        <header className="bvr-section__head">
          <span className={`bvr-section__badge ${isLocked(2) ? '' : 'is-active'}`}>2</span>
          <h2>차량 이미지 업로드</h2>
          {isLocked(2) ? <LockIcon /> : null}
          <p className="bvr-section__desc">
            정면, 측면, 후면 중 최소 1장을 업로드해주세요. 언제든 사진을 바꿔 다시 분석할 수 있습니다.
          </p>
        </header>
        {isLocked(2) ? (
          <div className="bvr-section__placeholder">1단계를 완료하면 이곳에서 차량 이미지를 업로드할 수 있어요.</div>
        ) : (
          <div className="bvr-section__body">
            <div className="bvr-slot-grid">
              {IMAGE_SLOTS.map((slot) => (
                <div key={slot.key} className="bvr-slot">
                  <span className="bvr-slot__label">{slot.label}</span>
                  <label className="bvr-slot__drop">
                    {imagePreviews[slot.key] ? (
                      <img src={imagePreviews[slot.key]} alt={`차량 ${slot.label}`} className="bvr-slot__preview" />
                    ) : (
                      <>
                        <span className="bvr-slot__icon">🚗</span>
                        <span className="bvr-slot__placeholder">사진 선택</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageSelect(slot.key)}
                      hidden
                    />
                  </label>
                  {imagePreviews[slot.key] && (
                    <span className="bvr-slot__hint">다시 클릭하면 사진을 바꿀 수 있어요</span>
                  )}
                </div>
              ))}
            </div>

            <div className="bvr-upload-guide">
              <h4>업로드 가이드</h4>
              <ul>
                <li>✔ 정면, 측면, 후면 중 최소 1장은 필수입니다. 여러 장을 함께 올리면 AI 인식 정확도가 올라갑니다.</li>
                <li>✔ 차량이 잘 보이도록 선명한 이미지를 업로드해주세요.</li>
                <li>✔ 번호판 등 개인정보가 노출되지 않도록 주의해주세요.</li>
              </ul>
              <p className="bvr-upload-drop__hint">권장 형식: JPG, PNG, WEBP (최대 10MB, 장당)</p>
            </div>

            {uploadError && <p className="bvr-hint bvr-hint--error">{uploadError}</p>}
            {!isLocked(2) && (
              <div className="bvr-section__actions">
                <button type="button" className="bvr-btn bvr-btn--ghost" onClick={skipToManualInput}>
                  건너뛰고 직접 입력
                </button>
                <button type="button" className="bvr-btn" onClick={startAiAnalysis} disabled={analyzing}>
                  {analyzing
                    ? '분석 중...'
                    : alreadyAnalyzedOnce
                      ? '이 사진으로 다시 분석하기'
                      : 'AI 분석 시작 >'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. AI 자동 입력 */}
      <section className={`bvr-section ${isLocked(3) ? 'is-locked' : 'is-open'}`}>
        <header className="bvr-section__head">
          <span className={`bvr-section__badge ${isLocked(3) ? '' : 'is-active'}`}>3</span>
          <h2>AI 자동 입력</h2>
          {isLocked(3) ? <LockIcon /> : null}
          <p className="bvr-section__desc">차량 이미지를 업로드하면 AI가 자동으로 차량 정보를 분석해 입력해줍니다.</p>
        </header>
        {isLocked(3) ? (
          <div className="bvr-section__placeholder">이미지 업로드를 완료하면 AI 분석이 시작됩니다.</div>
        ) : (
          <div className="bvr-section__body">
            <div className="bvr-analysis">
              <div className="bvr-analysis__icon">AI</div>
              <div className="bvr-analysis__main">
                <h3>
                  {analysisStage >= 4
                    ? analyzed
                      ? 'AI 분석이 완료됐어요.'
                      : 'AI 분석을 완료하지 못했어요.'
                    : 'AI가 차량 정보를 분석 중입니다.'}
                </h3>
                <p>
                  {analysisStage >= 4
                    ? (analyzeError ?? '업로드한 이미지를 바탕으로 차량 정보를 입력했어요. 다음 단계에서 확인해주세요.')
                    : '업로드한 이미지를 분석하여 차량의 주요 정보를 자동으로 입력합니다. 잠시만 기다려주세요.'}
                </p>
                <div className="bvr-progress">
                  <div className="bvr-progress__bar" style={{ width: `${analysisProgress}%` }} />
                </div>
                <span className="bvr-progress__pct">{analysisProgress}%</span>
                {analysisStage >= 4 && !analyzed && (
                  <p className="bvr-hint bvr-hint--error" style={{ marginTop: 10 }}>
                    계속 실패한다면 위 2단계에서 다른 각도의 사진으로 바꿔 "다시 분석하기"를 눌러보세요.
                  </p>
                )}
              </div>
              <ul className="bvr-analysis__checklist">
                {ANALYSIS_STAGES.map((label, i) => (
                  <li key={label} className={i <= analysisStage ? 'is-done' : ''}>
                    <span>{i <= analysisStage ? '✔' : '○'}</span> {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 4. 차량 정보 확인 및 수정 */}
      <section className={`bvr-section ${isLocked(4) ? 'is-locked' : 'is-open'}`}>
        <header className="bvr-section__head">
          <span className={`bvr-section__badge ${isLocked(4) ? '' : 'is-active'}`}>4</span>
          <h2>차량 정보 확인 및 수정</h2>
          {isLocked(4) ? <LockIcon /> : null}
          <p className="bvr-section__desc">AI가 입력한 정보를 확인하고 필요한 경우 수정해주세요.</p>
        </header>
        {isLocked(4) ? (
          <div className="bvr-section__placeholder">AI 분석 완료 후, 차량 정보가 여기에 표시됩니다.</div>
        ) : (
          <div className="bvr-section__body">
            <div className="bvr-grid">
              <label className="bvr-field">
                <span>차량명 *</span>
                <input value={form.name} onChange={handleField('name')} placeholder="예: 아이오닉 5" />
              </label>
              <label className="bvr-field">
                <span>브랜드</span>
                <input value={form.brand} onChange={handleField('brand')} placeholder="예: 현대" />
              </label>
              <label className="bvr-field">
                <span>카테고리</span>
                <input value={form.category} onChange={handleField('category')} placeholder="예: SUV, 세단" />
              </label>
              <label className="bvr-field">
                <span>태그 (쉼표로 구분)</span>
                <input value={form.tagsText} onChange={handleField('tagsText')} placeholder="전기차, SUV" />
              </label>
              <label className="bvr-field">
                <span>시작 가격 *</span>
                <input
                  type="number"
                  value={form.startPrice}
                  onChange={handleField('startPrice')}
                  placeholder="52400000"
                />
              </label>
              <label className="bvr-field">
                <span>1회 충전 주행거리</span>
                <input value={form.range} onChange={handleField('range')} placeholder="458 km" />
              </label>
              <label className="bvr-field">
                <span>배터리 용량</span>
                <input value={form.battery} onChange={handleField('battery')} placeholder="77.4 kWh" />
              </label>
              <label className="bvr-field">
                <span>최대 출력</span>
                <input value={form.power} onChange={handleField('power')} placeholder="325 ps" />
              </label>
              <label className="bvr-field">
                <span>구동 방식</span>
                <input value={form.drivetrain} onChange={handleField('drivetrain')} placeholder="AWD" />
              </label>
              <label className="bvr-field">
                <span>충전 방식</span>
                <input value={form.chargingType} onChange={handleField('chargingType')} placeholder="DC 콤보" />
              </label>
              <label className="bvr-field">
                <span>충전 시간</span>
                <input
                  value={form.chargingTime}
                  onChange={handleField('chargingTime')}
                  placeholder="18분(10~80%)"
                />
              </label>
              <label className="bvr-field">
                <span>크기 (전장x전폭x전고)</span>
                <input
                  value={form.dimensions}
                  onChange={handleField('dimensions')}
                  placeholder="4635x1890x1620mm"
                />
              </label>
              <label className="bvr-field">
                <span>무게</span>
                <input value={form.weight} onChange={handleField('weight')} placeholder="2100 kg" />
              </label>
              <label className="bvr-field">
                <span>승차 인원</span>
                <input
                  type="number"
                  value={form.seatingCapacity}
                  onChange={handleField('seatingCapacity')}
                  placeholder="5"
                />
              </label>
              <label className="bvr-field bvr-field--wide">
                <span>요약 *</span>
                <input value={form.summary} onChange={handleField('summary')} placeholder="한 줄 요약" />
              </label>
              <label className="bvr-field bvr-field--wide">
                <span>설명 *</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={handleField('description')}
                  placeholder="전시 소개용 상세 설명"
                />
              </label>
            </div>
            {step === 4 && step4Error && <p className="bvr-hint bvr-hint--error">{step4Error}</p>}
            {step === 4 && (
              <div className="bvr-section__actions">
                <button type="button" className="bvr-btn" onClick={goStep4Next}>
                  다음 단계 &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. 추가 정보 입력 */}
      <section className={`bvr-section ${isLocked(5) ? 'is-locked' : 'is-open'}`}>
        <header className="bvr-section__head">
          <span className={`bvr-section__badge ${isLocked(5) ? '' : 'is-active'}`}>5</span>
          <h2>추가 정보 입력</h2>
          {isLocked(5) ? <LockIcon /> : null}
          <p className="bvr-section__desc">차량의 주요 특징과 컬러 등 추가 정보를 입력해주세요.</p>
        </header>
        {isLocked(5) ? (
          <div className="bvr-section__grid-preview">
            <div className="bvr-section__preview-card">
              <span>🏷️</span>
              <strong>주요 특징</strong>
              <p>AI가 분석한 내용을 바탕으로 차량의 주요 특징을 입력하거나 수정할 수 있습니다.</p>
            </div>
            <div className="bvr-section__preview-card">
              <span>🎨</span>
              <strong>컬러</strong>
              <p>차량의 외장/내장 컬러를 선택하거나 추가해주세요.</p>
            </div>
          </div>
        ) : (
          <div className="bvr-section__body">
            <div className="bvr-grid">
              <label className="bvr-field bvr-field--wide">
                <span>주요 특징</span>
                <textarea
                  rows={3}
                  value={form.features}
                  onChange={handleField('features')}
                  placeholder="차량의 주요 특징을 입력해주세요."
                />
              </label>
              <label className="bvr-field bvr-field--wide">
                <span>컬러</span>
                <textarea
                  rows={2}
                  value={form.colors}
                  onChange={handleField('colors')}
                  placeholder="선택 가능한 컬러를 입력해주세요."
                />
              </label>
            </div>
            {saveError && <p className="bvr-hint bvr-hint--error">{saveError}</p>}
          </div>
        )}
      </section>

      <div className="bvr-footer">
        <div className="bvr-footer__note">
          <span>ℹ️</span>
          <div>
            <strong>순서대로 진행해주세요.</strong>
            <p>1단계 기본 정보 입력 후, 다음 단계들이 활성화됩니다.</p>
          </div>
        </div>
        <div className="bvr-footer__actions">
          <button type="button" className="bvr-btn bvr-btn--ghost" onClick={() => navigate(`/mypage/booths/${boothId}`)}>
            취소
          </button>
          <button type="button" className="bvr-btn" disabled={step < 5 || saving} onClick={handleRegister}>
            {saving ? '등록 중...' : isEdit ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="bvr-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default BoothVehicleRegister;
