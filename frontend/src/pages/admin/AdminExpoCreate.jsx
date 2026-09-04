import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerExpo, openExpo } from '../../api/expo';
import './AdminExpoCreate.css';

// datetime-local 입력용 문자열(YYYY-MM-DDTHH:mm) 생성 - 지금부터 days일 뒤 09:00
const isoLocal = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BOOTH_TYPES = ['조립 부스 (3m x 3m)', '독립 부스 (6m x 3m)'];

function AdminExpoCreate() {
  const navigate = useNavigate();

  // 기본값: 신청 -5일 ~ +10일, 개최 +30일 ~ +33일 (시드 스크립트와 동일 규칙)
  const [form, setForm] = useState({
    title: '2026 서울 모빌리티 엑스포',
    venue: 'COEX Hall A',
    applyStartsAt: isoLocal(-5),
    applyEndsAt: isoLocal(10),
    startsAt: isoLocal(30),
    endsAt: isoLocal(33),
  });
  const [booths, setBooths] = useState([]);
  const [autoOpen, setAutoOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 부스 일괄 생성 입력값
  const [gen, setGen] = useState({ prefix: 'A-', start: 101, count: 10, type: BOOTH_TYPES[0], fee: 3000000 });

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setGenField = (k) => (e) => setGen((g) => ({ ...g, [k]: e.target.value }));

  const addGenerated = () => {
    const start = Number(gen.start);
    const count = Number(gen.count);
    const fee = Number(gen.fee);
    if (!gen.prefix || !Number.isFinite(start) || !Number.isFinite(count) || count < 1) return;
    const rows = Array.from({ length: count }, (_, i) => ({
      boothNo: `${gen.prefix}${start + i}`,
      type: gen.type,
      fee,
    }));
    setBooths((prev) => [...prev, ...rows]);
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

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        venue: form.venue,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        applyStartsAt: form.applyStartsAt,
        applyEndsAt: form.applyEndsAt,
        booths: booths.map((b) => ({ boothNo: b.boothNo.trim(), type: b.type.trim(), fee: Number(b.fee) })),
      };
      const res = await registerExpo(payload);
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
          </div>
          <p className="admin-expo-create__hint">규칙: 신청 시작 &lt; 신청 마감 ≤ 개최 시작 &lt; 개최 종료</p>
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
        </section>

        <section className="admin-expo-create__panel">
          <div className="admin-expo-create__panel-head">
            <h2>부스 목록 ({booths.length}개)</h2>
            <button type="button" className="admin-expo-create__row-add" onClick={addRow}>
              + 행 추가
            </button>
          </div>

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
