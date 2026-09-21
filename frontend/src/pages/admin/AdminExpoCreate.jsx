import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerExpo, openExpo, uploadExpoBannerImage, draftExpoDescription } from '../../api/expo';
import { getBoothHall, isFoodBooth } from '../../utils/boothType';
import './AdminExpoCreate.css';

// 홀(A/B 등)당 등록 가능한 최대 부스 수 — 부스 배치도 화면의 격자 크기에 맞춘 제한
const MAX_BOOTHS_PER_HALL = 16; // 일반 부스(조립/독립)
const MAX_FOOD_PER_HALL = 4; // 먹거리 부스

// datetime-local 입력용 문자열(YYYY-MM-DDTHH:mm) 생성 - 지금부터 days일 뒤 09:00
const isoLocal = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BOOTH_TYPES = ['조립 부스 (3m x 3m)', '푸드 부스 (3m x 3m)'];

function AdminExpoCreate() {
  const navigate = useNavigate();

  // 기본값: 신청 -5일 ~ +10일, 개최 +30일 ~ +33일 (시드 스크립트와 동일 규칙)
  const [form, setForm] = useState({
    title: '2026 서울 모빌리티 엑스포',
    venue: 'COEX Hall A',
    // 행사 소개 문구(선택) - 고객 화면(박람회 상세 '개요' 탭, 입장 방법 선택 모달)에 노출됨.
    // 비워두면 프론트에서 제목 기반 기본 문구로 대체해서 보여줌.
    description: '',
    applyStartsAt: isoLocal(-5),
    applyEndsAt: isoLocal(10),
    startsAt: isoLocal(30),
    endsAt: isoLocal(33),
    admissionFee: 20000,
  });
  const [booths, setBooths] = useState([]);
  const [autoOpen, setAutoOpen] = useState(true);

  const bannerInputRef = useRef(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerError, setBannerError] = useState(null);
  const [bannerDragActive, setBannerDragActive] = useState(false);

  const BANNER_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const BANNER_MAX_SIZE = 5 * 1024 * 1024;

  // 드래그&드롭/버튼 선택 공용 - 실제 MIME 타입·용량까지 검증(드래그&드롭은 accept 속성이 안 먹힘)
  const applyBannerFile = (file) => {
    if (!file) return;
    if (!BANNER_ACCEPTED_TYPES.includes(file.type)) {
      setBannerError('PNG, JPG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > BANNER_MAX_SIZE) {
      setBannerError('파일 용량은 5MB 이하만 업로드할 수 있습니다.');
      return;
    }
    setBannerError(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleBannerFileChange = (e) => {
    applyBannerFile(e.target.files?.[0] ?? null);
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 발생하도록 초기화
  };

  const handleBannerDrop = (e) => {
    e.preventDefault();
    setBannerDragActive(false);
    applyBannerFile(e.dataTransfer.files?.[0] ?? null);
  };

  const clearBannerFile = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [genError, setGenError] = useState(null);

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

  const handleAiDraft = () => {
    if (!form.title.trim()) {
      setDraftError('박람회명을 먼저 입력해주세요.');
      return;
    }
    setDrafting(true);
    setDraftError(null);
    draftExpoDescription({ title: form.title.trim(), venue: form.venue.trim() || null })
      .then((res) => {
        if (!res.draft) {
          setDraftError('AI 초안 생성에 실패했습니다. 직접 작성해주세요.');
          return;
        }
        setForm((f) => ({ ...f, description: res.draft }));
      })
      .catch((err) => setDraftError(err.response?.data?.error?.message ?? 'AI 초안 생성 중 오류가 발생했습니다.'))
      .finally(() => setDrafting(false));
  };

  // 부스 일괄 생성 입력값
  const [gen, setGen] = useState({ prefix: 'A-', start: 101, count: 10, type: BOOTH_TYPES[0], fee: 3000000 });

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setGenField = (k) => (e) => setGen((g) => ({ ...g, [k]: e.target.value }));

  // 홀(A/B 등)별 일반 부스·먹거리 부스 개수 집계. boothNo("A-101")의 "-" 앞부분을 홀로 봄 (getBoothHall과 동일 규칙).
  const hallCounts = useMemo(() => {
    const map = {};
    booths.forEach((b) => {
      const hall = getBoothHall(b.boothNo);
      if (!map[hall]) map[hall] = { normal: 0, food: 0 };
      if (isFoodBooth(b.type)) map[hall].food += 1;
      else map[hall].normal += 1;
    });
    return map;
  }, [booths]);

  const addGenerated = () => {
    const start = Number(gen.start);
    const count = Number(gen.count);
    const fee = Number(gen.fee);
    if (!gen.prefix || !Number.isFinite(start) || !Number.isFinite(count) || count < 1) return;

    const hall = getBoothHall(`${gen.prefix}${start}`);
    const isFood = isFoodBooth(gen.type);
    const limit = isFood ? MAX_FOOD_PER_HALL : MAX_BOOTHS_PER_HALL;
    const current = hallCounts[hall]?.[isFood ? 'food' : 'normal'] ?? 0;

    if (current + count > limit) {
      setGenError(   // ← 여기 setError였던 걸 setGenError로 변경
      `${hall}홀 ${isFood ? '먹거리 부스' : '일반 부스'}는 최대 ${limit}개까지만 등록할 수 있습니다. ` +
        `(현재 ${current}개 + 추가 시도 ${count}개)`
    );
    return;
  }

    setGenError(null);
    const rows = Array.from({ length: count }, (_, i) => ({
      boothNo: `${gen.prefix}${start + i}`,
      type: gen.type,
      fee,
    }));
    setBooths((prev) => [...prev, ...rows]);
    // 다음에 "추가"를 또 누르면 이어지는 번호부터 생성되도록 시작 번호를 자동으로 갱신
    setGen((g) => ({ ...g, start: start + count }));
  };

  const addRow = () => setBooths((prev) => [...prev, { boothNo: '', type: BOOTH_TYPES[0], fee: 3000000 }]);
  const removeRow = (idx) => setBooths((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, key, value) =>
    setBooths((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b)));

  const totalFee = useMemo(
    () => booths.reduce((sum, b) => sum + (Number(b.fee) || 0), 0),
    [booths],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (booths.length === 0) {
      setError('부스를 1개 이상 추가해주세요.');
      return;
    }
    const invalid = booths.some((b) => !b.boothNo.trim() || !b.type.trim() || Number(b.fee) <= 0);
    if (invalid) {
      setError('부스 번호 / 유형 / 임차료(양수)를 모두 채워주세요.');
      return;
    }
    
    // 수동으로 "행 추가"하거나 유형/부스번호를 고쳐서 일괄 생성 시 체크를 우회했을 수 있어 제출 직전 다시 확인
    const overLimitHall = Object.entries(hallCounts).find(
      ([, c]) => c.normal > MAX_BOOTHS_PER_HALL || c.food > MAX_FOOD_PER_HALL
    );
    
    if (overLimitHall) {
          const [hall, c] = overLimitHall;
          setError(
            c.normal > MAX_BOOTHS_PER_HALL
              ? `${hall}홀의 일반 부스가 ${c.normal}개입니다. 최대 ${MAX_BOOTHS_PER_HALL}개까지만 등록할 수 있습니다.`
              : `${hall}홀의 먹거리 부스가 ${c.food}개입니다. 최대 ${MAX_FOOD_PER_HALL}개까지만 등록할 수 있습니다.`
          );
          return;
    }

    if (form.admissionFee === '' || Number(form.admissionFee) < 0) {
      setError('당일 입장료를 0 이상으로 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        venue: form.venue,
        description: form.description?.trim() ? form.description.trim() : null,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        applyStartsAt: form.applyStartsAt,
        applyEndsAt: form.applyEndsAt,
        admissionFee: Number(form.admissionFee),
        booths: booths.map((b) => ({ boothNo: b.boothNo.trim(), type: b.type.trim(), fee: Number(b.fee) })),
      };
      const res = await registerExpo(payload);
      if (bannerFile) {
        await uploadExpoBannerImage(res.expoId, bannerFile);
      }
      if (autoOpen) {
        await openExpo(res.expoId);
      }
      alert(`박람회 등록 완료 (expoId=${res.expoId}${autoOpen ? ', 공개됨' : ', 비공개'})`);
      navigate('/admin/applications');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '박람회 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-expo-create">
      <section className="admin-expo-create__hero">
        <p className="admin-expo-create__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>박람회 등록</h1>
        <p>박람회 기본 정보와 부스를 입력해 새 박람회를 생성합니다. 공개하면 참가업체가 신청할 수 있습니다.</p>
      </section>

      <form className="admin-expo-create__form" onSubmit={handleSubmit}>
        <section className="admin-expo-create__panel">
          <h2>기본 정보</h2>
          <div className="admin-expo-create__grid">
            <label>
              박람회명
              <input value={form.title} onChange={setField('title')} required />
            </label>
            <label>
              장소
              <input value={form.venue} onChange={setField('venue')} required />
            </label>
            <label>
              신청 시작
              <input type="datetime-local" value={form.applyStartsAt} onChange={setField('applyStartsAt')} required />
            </label>
            <label>
              신청 마감
              <input type="datetime-local" value={form.applyEndsAt} onChange={setField('applyEndsAt')} required />
            </label>
            <label>
              개최 시작
              <input type="datetime-local" value={form.startsAt} onChange={setField('startsAt')} required />
            </label>
            <label>
              개최 종료
              <input type="datetime-local" value={form.endsAt} onChange={setField('endsAt')} required />
            </label>
            <label>
              당일 입장료(원)
              <input type="number" min={0} value={form.admissionFee} onChange={setField('admissionFee')} required />
            </label>
          </div>
          <p className="admin-expo-create__hint">규칙: 신청 시작 &lt; 신청 마감 ≤ 개최 시작 &lt; 개최 종료</p>
          <p className="admin-expo-create__hint">당일 입장료: 무료 QR 입장권이 없는 방문객이 개최 당일 결제하는 입장료. 0이면 당일에도 무료.</p>

          <div className="admin-expo-create__desc-field">
            <div className="admin-expo-create__desc-label-row">
              <label htmlFor="expo-description">행사 소개 (선택, 최대 1000자)</label>
              <button
                type="button"
                className="admin-expo-create__ai-btn"
                onClick={handleAiDraft}
                disabled={drafting}
              >
                {drafting ? 'AI 작성 중...' : 'AI로 소개 문구 생성'}
              </button>
            </div>
            <textarea
              id="expo-description"
              rows={3}
              maxLength={1000}
              placeholder="비워두면 고객 화면에 기본 소개 문구가 대신 표시됩니다."
              value={form.description}
              onChange={setField('description')}
            />
            {draftError && <p className="admin-expo-create__ai-error">{draftError}</p>}
            <p className="admin-expo-create__hint">AI 초안은 박람회명(+장소)을 참고해 생성되며, 등록 전 내용을 꼭 확인·수정해주세요.</p>
          </div>

          <div className="admin-expo-create__banner-field">
            <div className="admin-expo-create__banner-label-row">
              <label htmlFor="expo-banner">배너 이미지 (선택, PNG/JPEG/WEBP, 5MB 이하)</label>
              <span className="admin-expo-create__banner-info">
                <span className="admin-expo-create__banner-info-icon" aria-hidden="true">i</span>
                박람회 목록과 상세 페이지에 노출되는 대표 이미지입니다.
              </span>
            </div>

            <input
              ref={bannerInputRef}
              id="expo-banner"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBannerFileChange}
              hidden
            />

            {bannerPreview ? (
              <div className="admin-expo-create__banner-preview-box">
                <img src={bannerPreview} alt="배너 미리보기" className="admin-expo-create__banner-preview" />
                <div className="admin-expo-create__banner-preview-actions">
                  <button type="button" className="admin-expo-create__ai-btn" onClick={() => bannerInputRef.current?.click()}>
                    이미지 변경
                  </button>
                  <button type="button" className="admin-expo-create__banner-remove-btn" onClick={clearBannerFile}>
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`admin-expo-create__dropzone${bannerDragActive ? ' is-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => bannerInputRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bannerInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setBannerDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setBannerDragActive(false); }}
                onDrop={handleBannerDrop}
              >
                <span className="admin-expo-create__dropzone-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M21 15.5 16 10.5 6.5 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="admin-expo-create__dropzone-title">배너 이미지를 업로드해 주세요</p>
                <p className="admin-expo-create__dropzone-desc">여기에 파일을 드래그하거나, 아래 버튼을 클릭하여 선택할 수 있습니다.</p>
                <button
                  type="button"
                  className="admin-expo-create__dropzone-btn"
                  onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 20V6M12 6l-5.5 5.5M12 6l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  이미지 선택하기
                </button>
                <p className="admin-expo-create__dropzone-hint">권장 사이즈 1920 x 600px&nbsp;&nbsp;·&nbsp;&nbsp;PNG, JPG, JPEG, WEBP&nbsp;&nbsp;·&nbsp;&nbsp;최대 5MB</p>
              </div>
            )}
            {bannerError && <p className="admin-expo-create__ai-error">{bannerError}</p>}
          </div>
        </section>

        <section className="admin-expo-create__panel">
          <h2>부스 일괄 생성</h2>
          <div className="admin-expo-create__gen">
            <label>
              접두사
              <input value={gen.prefix} onChange={setGenField('prefix')} />
            </label>
            <label>
              시작 번호
              <input type="number" value={gen.start} onChange={setGenField('start')} />
            </label>
            <label>
              개수
              <input type="number" min={1} value={gen.count} onChange={setGenField('count')} />
            </label>
            <label>
              유형
              <select value={gen.type} onChange={setGenField('type')}>
                {BOOTH_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              임차료(원)
              <input type="number" min={1} value={gen.fee} onChange={setGenField('fee')} />
            </label>
            <button type="button" className="admin-expo-create__gen-btn" onClick={addGenerated}>
              추가
            </button>
          </div>
          {genError && <p className="admin-expo-create__error">{genError}</p>}   {/* ← 새로 추가 */}
        </section>

        <section className="admin-expo-create__panel">
          <div className="admin-expo-create__panel-head">
            <h2>부스 목록 ({booths.length}개)</h2>
          </div>

          {Object.keys(hallCounts).length > 0 && (
            <p className="admin-expo-create__hint">
              {Object.entries(hallCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(
                  ([hall, c]) =>
                    `${hall}홀 — 일반 ${c.normal}/${MAX_BOOTHS_PER_HALL}개, 먹거리 ${c.food}/${MAX_FOOD_PER_HALL}개`
                )
                .join('  ·  ')}
            </p>
          )}

          {booths.length === 0 ? (
            <p className="admin-expo-create__empty">아직 부스가 없습니다. 위에서 일괄 생성하거나 행을 추가하세요.</p>
          ) : (
            <div className="admin-expo-create__table-scroll">
              <table className="admin-expo-create__table">
                <thead>
                  <tr>
                    <th>부스 번호</th>
                    <th>유형</th>
                    <th>임차료(원)</th>
                    <th aria-label="삭제" />
                  </tr>
                </thead>
                <tbody>
                  {booths.map((b, idx) => (
                    <tr key={idx}>
                      <td>
                        <input value={b.boothNo} onChange={(e) => updateRow(idx, 'boothNo', e.target.value)} />
                      </td>
                      <td>
                        <select value={b.type} onChange={(e) => updateRow(idx, 'type', e.target.value)}>
                          {BOOTH_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          {!BOOTH_TYPES.includes(b.type) && <option value={b.type}>{b.type}</option>}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={1} value={b.fee} onChange={(e) => updateRow(idx, 'fee', e.target.value)} />
                      </td>
                      <td>
                        <button type="button" className="admin-expo-create__row-del" onClick={() => removeRow(idx)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {booths.length > 0 && (
            <p className="admin-expo-create__total">임차료 합계 ₩{totalFee.toLocaleString()}</p>
          )}
        </section>

        {error && <p className="admin-expo-create__error">{error}</p>}

        <div className="admin-expo-create__actions">
          <label className="admin-expo-create__auto-open">
            <input type="checkbox" checked={autoOpen} onChange={(e) => setAutoOpen(e.target.checked)} />
            등록 후 바로 공개
          </label>
          <div className="admin-expo-create__buttons">
            <button type="button" className="admin-expo-create__cancel" onClick={() => navigate('/admin/applications')}>
              취소
            </button>
            <button type="submit" className="admin-expo-create__submit" disabled={submitting}>
              {submitting ? '등록 중...' : '박람회 등록'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AdminExpoCreate;