import loadingCarImage from '../../assets/car-image.png';
import './ConsultationLoadingOverlay.css';

// 상담 신청/수정 저장 중(AI 요약 생성 포함) 대기 화면. 실제 진행률과 무관하게 차가 계속 앞으로만 달린다.
function ConsultationLoadingOverlay() {
  return (
    <div className="c-modal__backdrop">
      <div className="c-consult-loading">
        <span className="c-consult-loading__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4h16v11H8l-4 4V4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2>상담 <span className="c-consult-loading__accent">신청중</span>입니다</h2>
        <p className="c-consult-loading__desc">
          잠시만 기다려주세요.<br />원활한 상담을 위해 최선을 다하고 있습니다.
        </p>
        <div className="c-consult-loading__track">
          <img className="c-consult-loading__car" src={loadingCarImage} alt="" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default ConsultationLoadingOverlay;
