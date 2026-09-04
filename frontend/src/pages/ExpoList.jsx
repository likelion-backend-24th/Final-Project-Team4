import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getExpoList } from "../api/expo";
import "./ExpoList.css";

// 상단 필터 탭 목록
const FILTERS = ["전체", "모집중", "모집마감", "진행중", "종료"];

// 카드 썸네일에 순서대로 돌려가며 입힐 그라데이션 색상들
const GRADIENTS = [
  "linear-gradient(135deg, #1e293b, #0f172a)",
  "linear-gradient(135deg, #7f1d1d, #1f2937)",
  "linear-gradient(135deg, #0e7490, #0f172a)",
  "linear-gradient(135deg, #14532d, #0f172a)",
];

// ISO 날짜(2026-05-12T10:00:00) → 화면 표시용(2026.05.12)
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "");

// 신청/개최 기간과 현재 시각을 비교해서 진행 단계(모집예정/모집중/모집마감/진행중/종료)를 계산
// 참고: 서버는 기본적으로 OPEN 상태인 박람회만 내려주지만, 화면에서는 날짜 기준으로 세분화해서 보여줌
const phaseOf = (e) => {
  const now = Date.now();
  const at = (s) => new Date(s).getTime();
  if (now < at(e.applyStartsAt)) return "모집예정";
  if (now <= at(e.applyEndsAt)) return "모집중";
  if (now < at(e.startsAt)) return "모집마감";
  if (now <= at(e.endsAt)) return "진행중";
  return "종료";
};

// 서버에서 받은 실제 박람회 데이터를 카드에서 쓰기 편한 형태로 변환
const toRealCard = (e) => ({
  key: `real-${e.expoId}`,
  expoId: e.expoId,
  title: e.title,
  phase: phaseOf(e),
  venue: e.venue,
  startsAt: fmtDate(e.startsAt),
  endsAt: fmtDate(e.endsAt),
  applyEnd: fmtDate(e.applyEndsAt),
});

function ExpoList() {
  // 서버에서 불러온 실제 박람회 카드 목록 (더미/예시 데이터는 사용하지 않음)
  const [cards, setCards] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [keyword, setKeyword] = useState("");

  // 컴포넌트가 처음 렌더링될 때 한 번만 박람회 목록을 서버에서 불러옴
  useEffect(() => {
    getExpoList({ page: 0, size: 50 })
      .then((res) => setCards(res.content.map(toRealCard)))
      .catch((err) =>
        setLoadError(
          err.response?.data?.error?.message ??
            "박람회 목록을 불러오지 못했습니다.",
        ),
      );
  }, []);

  // 선택된 필터(상태 탭)와 검색어에 맞는 카드만 걸러냄
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

  // 카드 하나의 내부 UI(썸네일 + 뱃지 + 제목 + 날짜/장소 + 하단 링크)를 그려주는 함수
  const renderCardBody = (c, i) => (
    <>
      {/* 카드 상단 썸네일 영역 (그라데이션 배경) */}
      <div
        className="expo-card__thumb"
        style={{ background: GRADIENTS[i % GRADIENTS.length] }}
      />
      <div className="expo-card__body">
        <div className="expo-card__meta">
          {/* 진행 단계 뱃지: 모집마감/종료면 회색(closed), 그 외엔 강조색(open) */}
          <span
            className={`expo-card__badge expo-card__badge--${
              ["모집마감", "종료"].includes(c.phase) ? "closed" : "open"
            }`}
          >
            {c.phase}
          </span>
          <span>
            신청 마감 <strong>{c.applyEnd}</strong>
          </span>
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
          <span className="expo-card__link">상세 보기 및 부스 신청</span>
          <span className="expo-card__arrow" />
        </div>
      </div>
    </>
  );

  return (
    <div className="expo-list">
      {/* 상단 소개 영역 */}
      <section className="expo-list__hero">
        <p className="expo-list__eyebrow">ONLINE REGISTRATION PORTAL</p>
        <h1>박람회 참가 신청</h1>
        <p>
          현재 모집 중이거나 진행 예정인 모빌리티 분야 전문 박람회의 부스 참가
          신청을 접수하고 있습니다.
        </p>
      </section>

      {/* 필터 탭 + 검색창 */}
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

      {/* 박람회 카드 목록 */}
      <div className="expo-list__grid-wrap">
        {loadError && <p className="expo-list__status">{loadError}</p>}
        <div className="expo-list__grid">
          {filtered.map((c, i) => (
            // 모든 카드는 실제 박람회이므로 클릭하면 상세 페이지로 이동
            <Link key={c.key} to={`/expos/${c.expoId}`} className="expo-card">
              {renderCardBody(c, i)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExpoList;