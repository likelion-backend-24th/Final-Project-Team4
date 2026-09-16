import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisitedBooths } from '../../api/expo';
import './Modal.css';
import './VisitedBoothsModal.css';

// 나의 입장권(만료 후 5일 이내)에서 "후기 작성하러 가기"를 누르면 뜨는 모달 - QR 스캔으로 방문 기록을
// 남긴 부스 중 하나를 골라 그 부스의 부스후기 작성 화면으로 이동한다(TASK 7-3).
function VisitedBoothsModal({ expoId, onClose }) {
  const navigate = useNavigate();
  const [booths, setBooths] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getVisitedBooths(expoId)
      .then(setBooths)
      .catch((err) => setError(err.response?.data?.error?.message ?? '방문한 부스 목록을 불러오지 못했습니다.'));
  }, [expoId]);

  const goWriteReview = (boothId) => {
    navigate(`/customer/expos/${expoId}/booths/${boothId}?writeReview=BOOTH`);
  };

  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2>방문한 부스 선택</h2>
        <p className="c-modal__desc">후기를 남길 부스를 선택해주세요.</p>

        {error ? (
          <p className="c-modal__error">{error}</p>
        ) : !booths ? (
          <p className="c-visited-booths__status">불러오는 중...</p>
        ) : booths.length === 0 ? (
          <p className="c-visited-booths__status">방문 기록이 있는 부스가 없습니다.</p>
        ) : (
          <ul className="c-visited-booths__list">
            {booths.map((b) => (
              <li key={b.boothId}>
                <button type="button" onClick={() => goWriteReview(b.boothId)}>
                  <span>{b.companyName || `${b.boothNo} 부스`}</span>
                  <span className="c-visited-booths__booth-no">{b.boothNo}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VisitedBoothsModal;
