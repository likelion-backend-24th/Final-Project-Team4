import { isFoodBooth } from '../utils/boothType';
import './HallMap.css';

const STATUS_LABEL = {
  AVAILABLE: '신청 가능',
  RESERVED: '결제 대기중',
  ASSIGNED: '배정 완료',
};

function BoothCell({ booth, selected, onSelect }) {
  const id = booth.boothId ?? booth.id;
  const isTaken = booth.status !== 'AVAILABLE';
  const isFood = isFoodBooth(booth.type);

  return (
    <button
      type="button"
      disabled={isTaken}
      title={`${booth.boothNo} · ${STATUS_LABEL[booth.status] ?? booth.status}`}
      className={[
        'hall-map__cell',
        isFood && 'hall-map__cell--food',
        isTaken && 'hall-map__cell--assigned',
        selected && 'hall-map__cell--selected',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(id)}
    >
      {isFood && <span className="hall-map__cell-icon" aria-hidden="true">🍴</span>}
      <span className="hall-map__cell-no">{booth.boothNo}</span>
    </button>
  );
}

// 박람회 부스 배치도의 한 홀(A홀/B홀 등)을 렌더링. boothNo("A-101")의 "-" 앞부분으로 홀을 묶는다.
// 먹거리 부스는 홀 바깥쪽 열에, 나머지 부스는 가운데 격자에 배치하고, 휴게공간/안내데스크/출입구는
// 실제 데이터가 없는 장식용 요소라 고정 라벨로만 표시한다.
function HallMap({ hallName, booths, selectedBoothId, onSelect, reverseFood = false }) {
  const foodBooths = booths.filter((b) => isFoodBooth(b.type));
  const mainBooths = booths.filter((b) => !isFoodBooth(b.type));

  const foodCol = foodBooths.length > 0 && (
    <div className="hall-map__food-col">
      {foodBooths.map((b) => (
        <BoothCell
          key={b.boothId ?? b.id}
          booth={b}
          selected={(b.boothId ?? b.id) === selectedBoothId}
          onSelect={onSelect}
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
              selected={(b.boothId ?? b.id) === selectedBoothId}
              onSelect={onSelect}
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
