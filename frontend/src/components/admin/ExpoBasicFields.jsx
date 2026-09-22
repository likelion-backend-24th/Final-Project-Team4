import { ImageIcon, Info, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { TextField, TextareaField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const required = (msg) => z.string().trim().min(1, msg);

// 박람회 등록/수정 공통 기본 정보 스키마. 입력값은 모두 문자열(datetime-local, number)로 다루고 제출 시 변환한다.
export const expoSchema = z
  .object({
    title: required('박람회명을 입력해주세요.'),
    venue: required('장소를 입력해주세요.'),
    description: z.string().max(1000, '행사 소개는 1000자 이하로 입력해주세요.'),
    applyStartsAt: required('신청 시작 일시를 입력해주세요.'),
    applyEndsAt: required('신청 마감 일시를 입력해주세요.'),
    startsAt: required('개최 시작 일시를 입력해주세요.'),
    endsAt: required('개최 종료 일시를 입력해주세요.'),
    admissionFee: z
      .string()
      .min(1, '당일 입장료를 입력해주세요.')
      .refine((v) => Number(v) >= 0, '당일 입장료를 0 이상으로 입력해주세요.'),
  })
  .superRefine((v, ctx) => {
    // 규칙: 신청 시작 < 신청 마감 ≤ 개최 시작 < 개최 종료
    if (v.applyStartsAt && v.applyEndsAt && v.applyStartsAt >= v.applyEndsAt)
      ctx.addIssue({ code: 'custom', path: ['applyEndsAt'], message: '신청 마감은 신청 시작 이후여야 합니다.' });
    if (v.applyEndsAt && v.startsAt && v.applyEndsAt > v.startsAt)
      ctx.addIssue({ code: 'custom', path: ['startsAt'], message: '개최 시작은 신청 마감 이후여야 합니다.' });
    if (v.startsAt && v.endsAt && v.startsAt >= v.endsAt)
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: '개최 종료는 개최 시작 이후여야 합니다.' });
  });

export function ExpoBasicFields({ control, lockSchedule = false, descriptionAction, children }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={control} name="title" label="박람회명" required />
        <TextField control={control} name="venue" label="장소" required />
        <TextField control={control} name="applyStartsAt" type="datetime-local" label="신청 시작" required disabled={lockSchedule} />
        <TextField control={control} name="applyEndsAt" type="datetime-local" label="신청 마감" required disabled={lockSchedule} />
        <TextField control={control} name="startsAt" type="datetime-local" label="개최 시작" required disabled={lockSchedule} />
        <TextField control={control} name="endsAt" type="datetime-local" label="개최 종료" required disabled={lockSchedule} />
        <TextField
          control={control}
          name="admissionFee"
          type="number"
          min={0}
          label="당일 입장료(원)"
          required
          description="무료 QR 입장권이 없는 방문객이 개최 당일 결제하는 입장료. 0이면 당일에도 무료."
        />
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        규칙: 신청 시작 &lt; 신청 마감 ≤ 개최 시작 &lt; 개최 종료
        {lockSchedule && ' · 부스 신청이 있어 일정 필드는 수정할 수 없습니다.'}
      </p>

      <div className="flex flex-col gap-2">
        <TextareaField
          control={control}
          name="description"
          label="행사 소개 (선택, 최대 1000자)"
          rows={4}
          maxLength={1000}
          placeholder="비워두면 고객 화면에 기본 소개 문구가 대신 표시됩니다."
        />
        {descriptionAction}
      </div>

      {children}
    </div>
  );
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

// 배너 이미지 선택(드래그&드롭 + 버튼). 검증 통과한 File(또는 null)을 onFileChange로 올려준다.
export function BannerUpload({ existingUrl, onFileChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  // 언마운트 시 blob URL 해제
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const apply = (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError('PNG, JPG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.');
    if (file.size > MAX_SIZE) return setError('파일 용량은 5MB 이하만 업로드할 수 있습니다.');
    setError(null);
    setPreview(URL.createObjectURL(file));
    onFileChange(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    onFileChange(null);
  };

  const shown = preview ?? existingUrl;
  const pick = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>배너 이미지 (선택, PNG/JPEG/WEBP, 5MB 이하)</Label>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="size-3.5" /> 박람회 목록과 상세 페이지에 노출되는 대표 이미지입니다.
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          apply(e.target.files?.[0] ?? null);
          e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 발생하도록 초기화
        }}
      />

      {shown ? (
        <div className="flex flex-col gap-3 rounded-xl border p-3">
          <img src={shown} alt="배너 미리보기" className="max-h-56 w-full rounded-lg object-cover" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={pick}>이미지 변경</Button>
            {preview && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={clear}>
                선택 취소
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pick()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); apply(e.dataTransfer.files?.[0] ?? null); }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors hover:bg-muted/50',
            dragging && 'border-primary bg-primary/5'
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ImageIcon className="size-6" />
          </span>
          <p className="m-0 font-semibold">배너 이미지를 업로드해 주세요</p>
          <p className="m-0 text-sm text-muted-foreground">여기에 파일을 드래그하거나, 아래 버튼을 클릭하여 선택할 수 있습니다.</p>
          <Button type="button" size="sm" onClick={(e) => { e.stopPropagation(); pick(); }}>
            <Upload /> 이미지 선택하기
          </Button>
          <p className="m-0 text-xs text-muted-foreground">권장 사이즈 1920 x 600px · PNG, JPG, JPEG, WEBP · 최대 5MB</p>
        </div>
      )}
      {error && <p className="m-0 text-sm text-destructive">{error}</p>}
    </div>
  );
}
