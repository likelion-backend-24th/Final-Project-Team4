import { isFoodBooth } from '../utils/boothType';
import './HallMap.css';

const STATUS_LABEL = {
  AVAILABLE: '미배정',
  RESERVED: '결제대기',
  ASSIGNED: '참가확정',
  // 실제 부스 자체의 상태는 아니고, Admin 화면에서 "심사중인 신청이 있는 부스"를 표시하려고
  // 클라이언트에서만 임시로 덧씌우는 값 (백엔드 Booth.status에는 없음)
  PENDING_REVIEW: '심사중',
  // 같은 부스에 심사중인 신청이 2건 이상 걸려있는 경우 (경쟁)
  PENDING_CONFLICT: '심사중(중복)',
};

// 부스 칸 아래에 상태 뱃지 텍스트를 보여줄지 여부 - 심사중/중복은 항상 표시,
// 결제대기/참가확정은 showStatusLabel(관리자 화면 전용)이 true일 때만 표시
function BoothCell({ booth, selected, onSelect, showStatusLabel = false }) {
  const id = booth.boothId ?? booth.id;
  const isPending = booth.status === 'PENDING_REVIEW';
  const isConflict = booth.status === 'PENDING_CONFLICT';
  const isReserved = booth.status === 'RESERVED';
  const isAssigned = booth.status === 'ASSIGNED';
  const isTaken = isReserved || isAssigned;
  const isFood = isFoodBooth(booth.type);
  const showBadge = isPending || isConflict || (showStatusLabel && isTaken);

  return (
    <button
      type="button"
      disabled={isTaken || isPending || isConflict}
      title={`${booth.boothNo} · ${STATUS_LABEL[booth.status] ?? booth.status}`}
      className={[
        'hall-map__cell',
        isFood && 'hall-map__cell--food',
        isPending && 'hall-map__cell--pending',
        isConflict && 'hall-map__cell--conflict',
        isReserved && 'hall-map__cell--reserved',
        isAssigned && 'hall-map__cell--assigned',
        selected && 'hall-map__cell--selected',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(id)}
    >
      {isFood && <span className="hall-map__cell-icon" aria-hidden="true">🍴</span>}
      <span className="hall-map__cell-no">{booth.boothNo}</span>
      {showBadge && <span className="hall-map__cell-status">{STATUS_LABEL[booth.status]}</span>}
    </button>
  );
}

// 박람회 부스 배치도의 한 홀(A홀/B홀 등)을 렌더링. boothNo("A-101")의 "-" 앞부분으로 홀을 묶는다.
// 먹거리 부스는 홀 바깥쪽 열에, 나머지 부스는 가운데 격자에 배치하고, 휴게공간/안내데스크/출입구는
// 실제 데이터가 없는 장식용 요소라 고정 라벨로만 표시한다.
function HallMap({
  hallName,
  booths,
  selectedBoothIds = [],
  onSelect,
  reverseFood = false,
  showStatusLabel = false,
}) {
  const foodBooths = booths.filter((b) => isFoodBooth(b.type));
  const mainBooths = booths.filter((b) => !isFoodBooth(b.type));

  const foodCol = foodBooths.length > 0 && (
    <div className="hall-map__food-col">
      {foodBooths.map((b) => (
        <BoothCell
          key={b.boothId ?? b.id}
          booth={b}
          selected={selectedBoothIds.includes(b.boothId ?? b.id)}
          onSelect={onSelect}
          showStatusLabel={showStatusLabel}
        />
      ))}
    </div>
  );

  return (
    <div className="hall-map">
      <div className="hall-map__label">{hallName}홀</div>
      <div className={`hall-map__body ${reverseFood ? 'hall-map__body--reverse' : ''}`}>
        {foodCol}
        <div className="hall-map__grid">
          {mainBooths.map((b) => (
            <BoothCell
              key={b.boothId ?? b.id}
              booth={b}
              selected={selectedBoothIds.includes(b.boothId ?? b.id)}
              onSelect={onSelect}
              showStatusLabel={showStatusLabel}
            />
          ))}
        </div>
      </div>
      <div className={`hall-map__footer ${reverseFood ? 'hall-map__footer--reverse' : ''}`}>
        <span className="hall-map__fixture hall-map__fixture--rest">🛋️ 휴게 공간</span>
        <span className="hall-map__fixture hall-map__fixture--gate">↑ 출입구</span>
        <span className="hall-map__fixture hall-map__fixture--desk">ⓘ 안내데스크</span>
      </div>
    </div>
  );
}

// 두 홀 사이의 중앙광장 장식 요소(실제 데이터 없음, 고정 라벨).
export function HallPlaza() {
  return (
    <div className="hall-map-plaza">
      <span className="hall-map-plaza__icon" aria-hidden="true">🌳🪑</span>
      <span className="hall-map-plaza__label">중앙광장</span>
    </div>
  );
}

export default HallMap;