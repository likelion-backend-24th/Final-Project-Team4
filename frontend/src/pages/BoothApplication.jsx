import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getExpoBooths, applyBooth } from '../api/expo';
import BoothGrid from '../components/BoothGrid';
import './BoothApplication.css';

const STEPS = ['부스 선택', '신청 정보 입력', '신청 완료'];

function BoothApplication() {
  const { expoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [expoBooths, setExpoBooths] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(2);
  const initialBoothId = searchParams.get('boothId');
  const [selectedBoothIds, setSelectedBoothIds] = useState(
    initialBoothId ? [Number(initialBoothId)] : []
  );
  const [form, setForm] = useState({
    exhibitionItem: '',
    conceptDescription: '',
    powerRequested: true,
    waterSupplyRequested: false,
    internetRequested: true,
    additionalRequest: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // 필수 항목별 에러 메시지를 담아두는 곳 (예: { exhibitionItem: '전시 품목을 입력해주세요.' })
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    getExpoBooths(expoId)
      .then(setExpoBooths)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.'));
  }, [expoId]);

  if (loadError) {
    return <p className="booth-application__status">{loadError}</p>;
  }
  if (!expoBooths) {
    return <p className="booth-application__status">불러오는 중...</p>;
  }

  const selectedBooths = expoBooths.booths.filter((b) => selectedBoothIds.includes(b.boothId));
  const totalFee = selectedBooths.reduce((sum, b) => sum + b.fee, 0);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    // 입력을 시작하면 해당 필드의 에러 표시는 지워줌
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleCheck = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));

  const toggleBooth = (boothId) => {
    setSelectedBoothIds((prev) =>
      prev.includes(boothId) ? prev.filter((id) => id !== boothId) : [...prev, boothId]
    );
  };

  // "신청 완료하기"를 누르기 전에 필수 항목이 채워졌는지 검사
  const validate = () => {
    const errors = {};
    if (!form.exhibitionItem.trim()) {
      errors.exhibitionItem = '전시 품목을 입력해주세요.';
    }
    if (!form.conceptDescription.trim()) {
      errors.conceptDescription = '전시 컨셉 설명을 입력해주세요.';
    }
    return errors;
  };

  const buildPayload = (saveMode) => ({
    expoId: Number(expoId),
    boothIds: selectedBoothIds,
    exhibitionItem: form.exhibitionItem,
    conceptDescription: form.conceptDescription,
    powerRequested: form.powerRequested,
    waterSupplyRequested: form.waterSupplyRequested,
    internetRequested: form.internetRequested,
    additionalRequest: form.additionalRequest,
    saveMode,
  });

  const handleSubmit = () => {
    if (selectedBoothIds.length === 0) return;

    // 필수 항목 검사: 하나라도 비어있으면 서버에 보내지 않고 바로 안내
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('필수 항목을 모두 입력해주세요.');
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(true);
    applyBooth(buildPayload('SUBMIT'))
      .then(() => setStep(3))
      .catch((err) =>
        setSubmitError(err.response?.data?.error?.message ?? '신청 처리 중 오류가 발생했습니다.')
      )
      .finally(() => setSubmitting(false));
  };

  const handleSaveDraft = () => {
    if (selectedBoothIds.length === 0) return;
    setSubmitError(null);
    setSavingDraft(true);
    applyBooth(buildPayload('DRAFT'))
      .then(() => navigate('/mypage'))
      .catch((err) =>
        setSubmitError(err.response?.data?.error?.message ?? '임시저장 중 오류가 발생했습니다.')
      )
      .finally(() => setSavingDraft(false));
  };

  return (
    <div className="booth-application">
      <div className="booth-application__step-bar">
        <h1>부스 참가 신청</h1>
        <ol className="booth-application__steps">
          {STEPS.map((label, idx) => (
            <li key={label} className={idx + 1 === step ? 'is-active' : idx + 1 < step ? 'is-done' : ''}>
              <span className="booth-application__step-badge">{idx + 1}</span>
              <span className="booth-application__step-label">{label}</span>
              {idx < STEPS.length - 1 && <span className="booth-application__step-chevron" />}
            </li>
          ))}
        </ol>
      </div>

      {step < 3 && (
        <div className="booth-application__main">
          <div className="booth-application__left">
            <section className="booth-application__map-card">
              <div className="booth-application__map-header">
                <h2>부스 도면에서 위치 선택 (다중 선택 가능)</h2>
                <div className="booth-application__legend">
                  <span><i className="booth-application__dot booth-application__dot--available" />선택가능</span>
                  <span><i className="booth-application__dot booth-application__dot--reserved" />예약됨</span>
                  <span><i className="booth-application__dot booth-application__dot--selected" />선택됨</span>
                </div>
              </div>
              <div className="booth-application__grid-scroll">
                <BoothGrid
                  booths={expoBooths.booths}
                  selectedBoothIds={selectedBoothIds}
                  onToggle={toggleBooth}
                />
              </div>
            </section>

            <section className="booth-application__selected-card">
              <div className="booth-application__selected-left">
                <p className="booth-application__selected-eyebrow">선택한 부스 정보</p>
                <div className="booth-application__selected-title-row">
                  <span className="booth-application__selected-id">
                    {selectedBooths.length > 0
                      ? selectedBooths.map((b) => b.boothNo).join(', ')
                      : '-'}
                  </span>
                  <span className="booth-application__selected-specs">
                    {selectedBooths.length > 0 ? `${selectedBooths.length}개 부스 선택됨` : '부스를 선택해주세요'}
                  </span>
                </div>
              </div>
              <div className="booth-application__selected-right">
                <p className="booth-application__selected-price-label">최종 부스 임차료 합계</p>
                <p className="booth-application__selected-price">
                  {selectedBooths.length > 0 ? `${totalFee.toLocaleString()} 원` : '-'}
                </p>
              </div>
            </section>
          </div>

          <section className="booth-application__form-panel">
            <h2>상세 신청 정보 입력</h2>
            <div className="booth-application__form-fields">
              <label className="booth-application__field">
                <span className="booth-application__label-row">
                  전시 품목<span className="booth-application__required">*</span>
                </span>
                <input
                  className={fieldErrors.exhibitionItem ? 'booth-application__input--invalid' : ''}
                  placeholder="예: 전기차 배터리 매니지먼트 시스템(BMS)"
                  value={form.exhibitionItem}
                  onChange={handleChange('exhibitionItem')}
                />
                {fieldErrors.exhibitionItem && (
                  <span className="booth-application__field-error">{fieldErrors.exhibitionItem}</span>
                )}
              </label>

              <label className="booth-application__field">
                <span className="booth-application__label-row">
                  전시 컨셉 설명<span className="booth-application__required">*</span>
                </span>
                <input
                  className={fieldErrors.conceptDescription ? 'booth-application__input--invalid' : ''}
                  placeholder="부스 내 전시 레이아웃 및 주요 기술 컨셉을 작성해주세요."
                  value={form.conceptDescription}
                  onChange={handleChange('conceptDescription')}
                />
                {fieldErrors.conceptDescription && (
                  <span className="booth-application__field-error">{fieldErrors.conceptDescription}</span>
                )}
              </label>

              <div className="booth-application__field">
                <span className="booth-application__label-row">추가 필요 부대시설</span>
                <div className="booth-application__checkbox-grid">
                  <label className="booth-application__checkbox">
                    <input
                      type="checkbox"
                      checked={form.powerRequested}
                      onChange={handleCheck('powerRequested')}
                    />
                    전기 (1kW 단위)
                  </label>
                  <label className="booth-application__checkbox">
                    <input
                      type="checkbox"
                      checked={form.waterSupplyRequested}
                      onChange={handleCheck('waterSupplyRequested')}
                    />
                    수도 / 배수
                  </label>
                  <label className="booth-application__checkbox">
                    <input
                      type="checkbox"
                      checked={form.internetRequested}
                      onChange={handleCheck('internetRequested')}
                    />
                    인터넷 선
                  </label>
                </div>
              </div>

              <label className="booth-application__field">
                <span className="booth-application__label-row">추가 요청 사항</span>
                <div className="booth-application__textarea-container">
                  <textarea
                    placeholder="특별한 부스 기술 사양이나 가구 추가 대여 요청 사항이 있다면 입력해주세요."
                    value={form.additionalRequest}
                    onChange={handleChange('additionalRequest')}
                    rows={3}
                  />
                </div>
              </label>
            </div>

            {submitError && <p className="booth-application__error">{submitError}</p>}

            <div className="booth-application__form-divider" />

            <div className="booth-application__form-actions">
              <button
                type="button"
                className="booth-application__submit"
                disabled={selectedBoothIds.length === 0 || submitting || savingDraft}
                onClick={handleSubmit}
              >
                {submitting ? '신청 중...' : '신청 완료하기'}
              </button>
              <button
                type="button"
                className="booth-application__save"
                disabled={selectedBoothIds.length === 0 || submitting || savingDraft}
                onClick={handleSaveDraft}
              >
                {savingDraft ? '저장 중...' : '임시 저장'}
              </button>
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <section className="booth-application__done">
          <p className="booth-application__done-icon">✓</p>
          <p className="booth-application__done-title">신청이 완료되었습니다.</p>
          <p className="booth-application__done-desc">
            관리자 심사 후 결과가 마이페이지에 안내됩니다.
          </p>
          <div className="booth-application__done-actions">
            <button type="button" onClick={() => navigate('/mypage')}>
              마이페이지에서 확인하기
            </button>
            <button type="button" className="ghost" onClick={() => navigate(`/expos/${expoId}`)}>
              박람회 상세로 돌아가기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default BoothApplication;