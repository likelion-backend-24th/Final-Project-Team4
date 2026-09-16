import { toAssetUrl } from '../../api/expo';
import './Modal.css';
import './ReviewDetailModal.css';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 후기 상세 - 목록에서 "›" 화살표(혹은 항목 자체)를 누르면 열린다. 잘려있던 본문 전체와 첨부 사진을 보여준다.
function ReviewDetailModal({ review, onClose }) {
  return (
    <div className="c-modal__backdrop" onClick={onClose}>
      <div className="c-modal c-review-detail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="c-review-detail__head">
          <span className="c-review-detail__tag">{review.vehicleName || `부스 ${review.boothNo}`}</span>
          <span className="c-review-detail__date">{fmtDate(review.createdAt)}</span>
        </div>
        <p className="c-review-detail__author">{review.customerName}</p>
        <p className="c-review-detail__content">{review.content}</p>

        {review.images?.length > 0 && (
          <div className="c-review-detail__images">
            {review.images.map((img) => (
              <img key={img.imageId} src={toAssetUrl(img.imageUrl)} alt="후기 사진" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewDetailModal;
