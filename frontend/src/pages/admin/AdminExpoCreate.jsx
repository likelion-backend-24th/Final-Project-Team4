import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerExpo, openExpo } from '../../api/expo';
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

const BOOTH_TYPES = ['조립 부스 (3m x 3m)', '독립 부스 (6m x 3m)', '푸드 부스 (3m x 3m)'];

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
    // 박람회 시작 이후(사전 예약 마감 후) 방문객이 내는 당일 입장료. 0이면 당일에도 무료.
    // Reservation 서비스가 이 값을 조회해 당일 유료 입장권 결제 금액으로 사용함(US17/US18).
    admissionFee: 20000,
  });
  const [booths, setBooths] = useState([]);
  const [autoOpen, setAutoOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      setError(
        `${hall}홀 ${isFood ? '먹거리 부스' : '일반 부스'}는 최대 ${limit}개까지만 등록할 수 있습니다. ` +
          `(현재 ${current}개 + 추가 시도 ${count}개)`
      );
      return;
    }

    setError(null);
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
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        applyStartsAt: form.applyStartsAt,
        applyEndsAt: form.applyEndsAt,
        admissionFee: Number(form.admissionFee),
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
            <label>
              당일 입장료(원)
              <input type="number" min={0} value={form.admissionFee} onChange={setField('admissionFee')} required />
            </label>
          </div>
          <p className="admin-expo-create__hint">규칙: 신청 시작 &lt; 신청 마감 ≤ 개최 시작 &lt; 개최 종료</p>
          <p className="admin-expo-create__hint">당일 입장료: 무료 QR 입장권이 없는 방문객이 개최 당일 결제하는 입장료. 0이면 당일에도 무료.</p>
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