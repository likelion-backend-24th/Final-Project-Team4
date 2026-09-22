import { Maximize2, Plus, Sparkles, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { addBoothReviewImage, createBoothReview, draftConsultationReview, polishReviewContent, updateBoothReview } from '../../api/expo';
import { TextareaField, TextField } from '../form/fields';
import { AppDialog } from '@/components/layout/AppDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// 후기 작성 모달 - 예약한 상담(마이페이지)에서 "후기 작성하러 가기"로 진입하거나,
// 부스 상세 화면에서 직접 열림. 작성 자격(상담 완료 후 5일 이내)은 서버가 최종 검증한다.
// consultationId가 있을 때만(=상담에서 진입) AI 초안 생성을 쓸 수 있다 - 본인 상담 요구사항 +
// 참가업체 현장 메모를 근거로 하기 때문에 어느 상담에서 왔는지 알아야 한다.
// editing(내가 쓴 후기 1건)을 넘기면 수정 모드 - 유형은 고정, 내용/차량명만 수정하고 사진은 다루지 않는다.
const TYPE_LABEL = { CONSULT: '상담후기', BOOTH: '부스후기' };
const MAX_IMAGES = 5;

function ReviewWriteModal({ boothId, consultationId, defaultType = 'CONSULT', defaultVehicleName = '', lockType = false, editing, onClose, onCreated }) {
  const [reviewType, setReviewType] = useState(editing?.reviewType ?? defaultType);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false); // 후기 내용 "크게 보기" 패널
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  // 문장 다듬기 - 내가 쓴 글을 AI가 다시 쓰므로 마음에 안 들면 원문으로 되돌릴 수 있게 다듬기 직전 글을 보관한다.
  const [polishing, setPolishing] = useState(false);
  const [beforePolish, setBeforePolish] = useState(null);

  const form = useForm({
    defaultValues: {
      vehicleName: editing?.vehicleName ?? defaultVehicleName,
      content: editing?.content ?? '',
    },
  });
  const content = form.watch('content');
  const vehicleName = form.watch('vehicleName');

  const setContent = (value) => form.setValue('content', value, { shouldDirty: true });

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handlePolish = () => {
    setPolishing(true);
    setDraftError(null);
    polishReviewContent({ reviewType, vehicleName: reviewType === 'CONSULT' ? vehicleName.trim() || null : null, content: content.trim() })
      .then((res) => {
        if (!res.draft) {
          setDraftError('AI 문장 다듬기에 실패했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }
        setBeforePolish(content);
        setContent(res.draft);
      })
      .catch((err) => setDraftError(err.response?.data?.error?.message ?? 'AI 문장 다듬기 중 오류가 발생했습니다.'))
      .finally(() => setPolishing(false));
  };

  const handleAiDraft = () => {
    setDrafting(true);
    setDraftError(null);
    draftConsultationReview(consultationId, { reviewType, vehicleName: vehicleName.trim() || null })
      .then((res) => {
        if (!res.draft) {
          setDraftError('AI 초안 생성에 실패했습니다. 직접 작성해주세요.');
          return;
        }
        setContent(res.draft);
      })
      .catch((err) => setDraftError(err.response?.data?.error?.message ?? 'AI 초안 생성 중 오류가 발생했습니다.'))
      .finally(() => setDrafting(false));
  };

  const handleSubmit = (values) => {
    if (reviewType === 'CONSULT' && !values.vehicleName.trim()) {
      setError('차량명을 입력해주세요.');
      return;
    }
    if (!values.content.trim()) {
      setError('후기 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      reviewType,
      // 상담후기는 상담 1건당 1개라 어느 상담에 대한 후기인지 함께 보낸다(수정 시에는 서버가 기존 값을 유지).
      consultationId: reviewType === 'CONSULT' && consultationId ? Number(consultationId) : null,
      vehicleName: reviewType === 'CONSULT' ? values.vehicleName.trim() : null,
      content: values.content.trim(),
    };
    (editing ? updateBoothReview(boothId, editing.reviewId, payload) : createBoothReview(boothId, payload))
      .then((review) =>
        // 사진 업로드는 부가 기능 - 한 장이 실패해도 이미 등록된 후기 자체는 그대로 둔다(best-effort). 수정 모드는 사진 없음.
        images
          .reduce((chain, file) => chain.then(() => addBoothReviewImage(boothId, review.reviewId, file).catch(() => {})), Promise.resolve())
          .then(() => review)
      )
      .then((review) => {
        onCreated?.(review);
        onClose();
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? `후기 ${editing ? '수정' : '작성'} 중 오류가 발생했습니다.`))
      .finally(() => setSubmitting(false));
  };

  const busy = drafting || polishing;

  return (
    <>
      <AppDialog
        onClose={() => !submitting && onClose()}
        dismissible={!submitting}
        size="md"
        title={editing ? '후기 수정' : '후기 작성'}
      >
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            {lockType || editing ? (
              <p className="m-0 text-sm font-semibold text-primary">{TYPE_LABEL[reviewType]}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <Button key={value} type="button" variant={reviewType === value ? 'default' : 'outline'} onClick={() => setReviewType(value)}>
                    {label}
                  </Button>
                ))}
              </div>
            )}

            {reviewType === 'CONSULT' && (
              <TextField control={form.control} name="vehicleName" label="차량명" placeholder="예: EV6" />
            )}

            <div className="flex flex-wrap gap-2">
              {consultationId && !editing && (
                <Button type="button" variant="outline" size="sm" className="flex-1 border-primary text-primary" onClick={handleAiDraft} disabled={busy}>
                  <Sparkles /> {drafting ? 'AI 작성 중...' : 'AI로 후기 작성하기'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-primary text-primary"
                onClick={handlePolish}
                disabled={!content.trim() || busy}
              >
                <Sparkles /> {polishing ? 'AI 다듬는 중...' : 'AI로 문장 다듬기'}
              </Button>
              {beforePolish !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setContent(beforePolish);
                    setBeforePolish(null);
                  }}
                >
                  <Undo2 /> 원래 문장으로 되돌리기
                </Button>
              )}
            </div>
            {draftError && <p className="m-0 text-sm text-destructive">{draftError}</p>}

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">후기 내용</span>
                <Button type="button" variant="ghost" size="xs" className="text-primary" onClick={() => setExpanded(true)}>
                  <Maximize2 /> 크게 보기
                </Button>
              </div>
              <TextareaField
                control={form.control}
                name="content"
                rows={5}
                placeholder="상담 또는 방문 경험을 자유롭게 남겨주세요."
                onValueChange={() => setBeforePolish(null)}
              />
            </div>

            {!editing && (
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">사진 (선택, 최대 {MAX_IMAGES}장)</span>
                <div className="flex flex-wrap gap-2">
                  {images.map((file, i) => (
                    <div key={i} className="relative size-16 overflow-hidden rounded-lg border">
                      <img src={URL.createObjectURL(file)} alt={`첨부 이미지 ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="사진 삭제"
                        className="absolute top-0.5 right-0.5 flex size-[18px] cursor-pointer items-center justify-center rounded-full border-0 bg-black/70 p-0 text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted">
                      <Plus />
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleAddImages} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {error && <p className="m-0 text-sm text-destructive">{error}</p>}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (editing ? '수정 중...' : '등록 중...') : editing ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </Form>
      </AppDialog>

      {expanded && (
        <AppDialog onClose={() => setExpanded(false)} title="후기 내용 (크게 보기)" size="lg" className={cn('sm:h-[80vh]')}>
          <Textarea
            autoFocus
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setBeforePolish(null);
            }}
            className="min-h-64 flex-1 resize-none"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={() => setExpanded(false)}>
              완료
            </Button>
          </div>
        </AppDialog>
      )}
    </>
  );
}

export default ReviewWriteModal;
