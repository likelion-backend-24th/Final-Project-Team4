import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getExpoList } from "../api/expo";
import { mockExpos } from "../mock/data";
import "./ExpoList.css";

const FILTERS = ["전체", "모집중", "모집마감", "진행중", "종료"];
const GRADIENTS = [
  "linear-gradient(135deg, #1e293b, #0f172a)",
  "linear-gradient(135deg, #7f1d1d, #1f2937)",
  "linear-gradient(135deg, #0e7490, #0f172a)",
  "linear-gradient(135deg, #14532d, #0f172a)",
];

// ISO(2026-05-12T10:00:00) → 2026.05.12
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "");

// 신청/개최 기간과 현재 시각으로 진행 단계 계산 (서버는 OPEN 박람회만 내려줌)
const phaseOf = (e) => {
  const now = Date.now();
  const at = (s) => new Date(s).getTime();
  if (now < at(e.applyStartsAt)) return "모집예정";
  if (now <= at(e.applyEndsAt)) return "모집중";
  if (now < at(e.startsAt)) return "모집마감";
  if (now <= at(e.endsAt)) return "진행중";
  return "종료";
};

// 실 API 응답 → 카드 공통 형태
const toRealCard = (e) => ({
  key: `real-${e.expoId}`,
  real: true,
  expoId: e.expoId,
  title: e.title,
  phase: phaseOf(e),
  venue: e.venue,
  startsAt: fmtDate(e.startsAt),
  endsAt: fmtDate(e.endsAt),
  applyEnd: fmtDate(e.applyEndsAt),
});

// 예시 목업. (클릭 불가, "예시" 표시)
const mockCards = mockExpos.map((m) => ({
  key: `mock-${m.id}`,
  real: false,
  title: m.title,
  phase: m.status,
  venue: m.venue,
  startsAt: m.startsAt,
  endsAt: m.endsAt,
  applyEnd: m.applyPeriod?.split(" - ")[1] ?? "",
}));

function ExpoList() {
  const [realCards, setRealCards] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    getExpoList({ page: 0, size: 50 })
      .then((res) => setRealCards(res.content.map(toRealCard)))
      .catch((err) =>
        setLoadError(
          err.response?.data?.error?.message ??
            "박람회 목록을 불러오지 못했습니다.",
        ),
      );
  }, []);

  // 데모용 실제 박람회(신청 가능)를 앞, 예시 목업을 뒤 배치
  const cards = useMemo(() => [...realCards, ...mockCards], [realCards]);

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        const matchesFilter = filter === "전체" || c.phase === filter;
        const matchesKeyword = c.title
          .toLowerCase()
          .includes(keyword.toLowerCase());
        return matchesFilter && matchesKeyword;
      }),
    [cards, filter, keyword],
  );

  const renderCardBody = (c, i) => (
    <>
      <div
        className="expo-card__thumb"
        style={{ background: GRADIENTS[i % GRADIENTS.length] }}
      />
      <div className="expo-card__body">
        <div className="expo-card__meta">
          <span
            className={`expo-card__badge expo-card__badge--${
              ["모집마감", "종료"].includes(c.phase) ? "closed" : "open"
            }`}
          >
            {c.phase}
          </span>
          {c.real ? (
            <span>
              신청 마감 <strong>{c.applyEnd}</strong>
            </span>
          ) : (
            <span style={{ color: "#94a3b8" }}>예시</span>
          )}
        </div>
        <h3>{c.title}</h3>
        <div className="expo-card__meta-list">
          <p>
            <span className="expo-card__icon expo-card__icon--calendar" />
            {c.startsAt} - {c.endsAt}
          </p>
          <p>
            <span className="expo-card__icon expo-card__icon--pin" />
            {c.venue}
          </p>
        </div>
        <div className="expo-card__divider" />
        <div className="expo-card__footer">
          <span className="expo-card__link">
            {c.real ? "상세 보기 및 부스 신청" : "예시 데이터"}
          </span>
          <span className="expo-card__arrow" />
        </div>
      </div>
    </>
  );

  return (
    <div className="expo-list">
      <section className="expo-list__hero">
        <p className="expo-list__eyebrow">ONLINE REGISTRATION PORTAL</p>
        <h1>박람회 참가 신청</h1>
        <p>
          현재 모집 중이거나 진행 예정인 모빌리티 분야 전문 박람회의 부스 참가
          신청을 접수하고 있습니다.
        </p>
      </section>

      <div className="expo-list__toolbar">
        <div className="expo-list__filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={f === filter ? "is-active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="expo-list__search-wrap">
          <span className="expo-list__search-icon" />
          <input
            className="expo-list__search"
            placeholder="박람회 명칭 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="expo-list__grid-wrap">
        {loadError && <p className="expo-list__status">{loadError}</p>}
        <div className="expo-list__grid">
          {filtered.map((c, i) =>
            c.real ? (
              <Link key={c.key} to={`/expos/${c.expoId}`} className="expo-card">
                {renderCardBody(c, i)}
              </Link>
            ) : (
              <div
                key={c.key}
                className="expo-card"
                style={{ opacity: 0.55, cursor: "default" }}
              >
                {renderCardBody(c, i)}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpoList;
