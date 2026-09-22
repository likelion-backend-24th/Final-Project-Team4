import { toAssetUrl } from '../../api/expo';
import { AppDialog } from '@/components/layout/AppDialog';
import { Badge } from '@/components/ui/badge';

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 후기 상세 - 목록에서 "›" 화살표(혹은 항목 자체)를 누르면 열린다. 잘려있던 본문 전체와 첨부 사진을 보여준다.
function ReviewDetailModal({ review, onClose }) {
  return (
    <AppDialog onClose={onClose} title={review.customerName} size="md">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{review.vehicleName || `부스 ${review.boothNo}`}</Badge>
        <span className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</span>
      </div>
      <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{review.content}</p>

      {review.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {review.images.map((img) => (
            <img
              key={img.imageId}
              src={toAssetUrl(img.imageUrl)}
              alt="후기 사진"
              className="aspect-square w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}
    </AppDialog>
  );
}

export default ReviewDetailModal;
