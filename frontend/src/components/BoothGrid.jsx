import './BoothGrid.css';

// booth.boothId(실제 API 응답 필드) 또는 booth.id(레거시 mock 데이터 필드) 둘 다 지원
function BoothGrid({ booths, selectedBoothIds = [], onToggle }) {
  return (
    <div className="booth-grid">
      {booths.map((booth) => {
        const id = booth.boothId ?? booth.id;
        const isAssigned = booth.status === 'ASSIGNED';
        const isSelected = selectedBoothIds.includes(id);

        return (
          <button
            key={id}
            type="button"
            disabled={isAssigned}
            className={[
              'booth-cell',
              isAssigned && 'booth-cell--assigned',
              isSelected && 'booth-cell--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onToggle(id)}
          >
            <span className="booth-cell__no">{booth.boothNo}</span>
            <span className="booth-cell__status">{isAssigned ? '예약됨' : '가능'}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BoothGrid;
