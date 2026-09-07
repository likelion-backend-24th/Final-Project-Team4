import './BoothGrid.css';

const STATUS_LABEL = {
  AVAILABLE: '가능',
  RESERVED: '승인 대기중',
  ASSIGNED: '예약됨',
};

// booth.boothId(실제 API 응답 필드) 또는 booth.id(레거시 mock 데이터 필드) 둘 다 지원
function BoothGrid({ booths, selectedBoothIds = [], onToggle, readOnly = false }) {
  return (
    <div className={['booth-grid', readOnly && 'booth-grid--readonly'].filter(Boolean).join(' ')}>
      {booths.map((booth) => {
        const id = booth.boothId ?? booth.id;
        const isTaken = booth.status !== 'AVAILABLE';
        const isSelected = selectedBoothIds.includes(id);

        return (
          <button
            key={id}
            type="button"
            disabled={isTaken}
            className={[
              'booth-cell',
              isTaken && 'booth-cell--assigned',
              isSelected && 'booth-cell--selected',
              readOnly && 'booth-cell--readonly',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onToggle(id)}
          >
            <span className="booth-cell__no">{booth.boothNo}</span>
            {!readOnly && (
              <span className="booth-cell__status">{STATUS_LABEL[booth.status] ?? booth.status}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default BoothGrid;
