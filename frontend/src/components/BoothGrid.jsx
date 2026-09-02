import './BoothGrid.css';

function BoothGrid({ booths, selectedBoothId, onSelect }) {
  return (
    <div className="booth-grid">
      {booths.map((booth) => {
        const isAssigned = booth.status === 'ASSIGNED';
        const isSelected = booth.id === selectedBoothId;

        return (
          <button
            key={booth.id}
            type="button"
            disabled={isAssigned}
            className={[
              'booth-cell',
              isAssigned && 'booth-cell--assigned',
              isSelected && 'booth-cell--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(booth.id)}
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
