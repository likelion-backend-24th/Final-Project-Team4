import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockExpos } from '../mock/data';
import BoothGrid from '../components/BoothGrid';
import './BoothApplication.css';

const STEPS = ['부스 선택', '신청 정보 입력', '신청 완료'];

function BoothApplication() {
  const { expoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const expo = mockExpos.find((e) => String(e.id) === expoId);
  const [step, setStep] = useState(2);
  const [selectedBoothId, setSelectedBoothId] = useState(searchParams.get('boothId') || null);
  const [form, setForm] = useState({
    exhibitionItem: '',
    conceptDescription: '',
    powerRequested: true,
    waterSupplyRequested: false,
    internetRequested: true,
    additionalRequest: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!expo) {
    return <p className="booth-application__status">박람회를 찾을 수 없습니다.</p>;
  }

  const selectedBooth = expo.booths.find((b) => b.id === selectedBoothId);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCheck = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));

  const handleSubmit = () => {
    if (!selectedBoothId) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(3);
    }, 500);
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
                <h2>부스 도면에서 위치 선택</h2>
                <div className="booth-application__legend">
                  <span><i className="booth-application__dot booth-application__dot--available" />선택가능</span>
                  <span><i className="booth-application__dot booth-application__dot--reserved" />예약됨</span>
                  <span><i className="booth-application__dot booth-application__dot--selected" />선택됨</span>
                </div>
              </div>
              <div className="booth-application__grid-scroll">
                <BoothGrid
                  booths={expo.booths}
                  selectedBoothId={selectedBoothId}
                  onSelect={setSelectedBoothId}
                />
              </div>
            </section>

            <section className="booth-application__selected-card">
              <div className="booth-application__selected-left">
                <p className="booth-application__selected-eyebrow">선택한 부스 정보</p>
                <div className="booth-application__selected-title-row">
                  <span className="booth-application__selected-id">
                    {selectedBooth ? selectedBooth.boothNo : '-'}
                  </span>
                  <span className="booth-application__selected-specs">
                    {selectedBooth ? `${selectedBooth.type} 부스 (3m x 3m)` : '부스를 선택해주세요'}
                  </span>
                </div>
              </div>
              <div className="booth-application__selected-right">
                <p className="booth-application__selected-price-label">최종 부스 임차료</p>
                <p className="booth-application__selected-price">
                  {selectedBooth ? `${selectedBooth.fee.toLocaleString()} 원` : '-'}
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
                  placeholder="예: 전기차 배터리 매니지먼트 시스템(BMS)"
                  value={form.exhibitionItem}
                  onChange={handleChange('exhibitionItem')}
                />
              </label>

              <label className="booth-application__field">
                <span className="booth-application__label-row">
                  전시 컨셉 설명<span className="booth-application__required">*</span>
                </span>
                <input
                  placeholder="부스 내 전시 레이아웃 및 주요 기술 컨셉을 작성해주세요."
                  value={form.conceptDescription}
                  onChange={handleChange('conceptDescription')}
                />
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

            <div className="booth-application__form-divider" />

            <div className="booth-application__form-actions">
              <button
                type="button"
                className="booth-application__submit"
                disabled={!selectedBoothId || submitting}
                onClick={handleSubmit}
              >
                {submitting ? '신청 중...' : '신청 완료하기'}
              </button>
              <button type="button" className="booth-application__save">
                임시 저장
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
