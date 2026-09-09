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

function HallMap({ hallName, booths, selectedBoothIds = [], onSelect, reverseFood = false }) {
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

export function HallPlaza() {
  return (
    <div className="hall-map-plaza">
      <span className="hall-map-plaza__icon" aria-hidden="true">🌳🪑</span>
      <span className="hall-map-plaza__label">중앙광장</span>
    </div>
  );
}

export default HallMap;