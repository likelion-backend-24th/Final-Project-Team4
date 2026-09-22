import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Info, Lock, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  deleteVehicle,
  getBoothManageDetail,
  getBoothVehicles,
  toAssetUrl,
  updateBoothContent,
  uploadBoothBannerImage,
} from '@/api/expo.js';
import { getMyProfile } from '@/api/identity.js';
import ConsultationSlotSettings from '@/components/exhibitor/ConsultationSlotSettings';
import { TextareaField, TextField } from '@/components/form/fields';
import { isFoodBooth } from '@/utils/boothType.js';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TITLE_MAX = 50;
const CONTENT_MAX = 1000;

const contentSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(TITLE_MAX),
  content: z.string().trim().min(1, '내용을 입력해주세요.').max(CONTENT_MAX),
});

function StepCard({ step, title, description, action, children }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {step}
          </span>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input className="h-10 bg-muted" value={value ?? ''} readOnly />
    </div>
  );
}

function BoothManage() {
  const { boothId } = useParams();

  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  // 업체/담당자 정보 - 마이페이지의 계정 정보를 그대로 불러와서 "보여주기"만 한다.
  // 여기서 수정해도 저장되지 않음 (계정 정보 수정은 마이페이지에서).
  const [profile, setProfile] = useState(null);

  const contentForm = useForm({ resolver: zodResolver(contentSchema), defaultValues: { title: '', content: '' } });
  const titleValue = contentForm.watch('title');
  const contentValue = contentForm.watch('content');
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMessage, setContentMessage] = useState(null);
  const [contentError, setContentError] = useState(null);

  const bannerInputRef = useRef(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesError, setVehiclesError] = useState(null);

  const loadDetail = () => {
    getBoothManageDetail(boothId)
      .then((res) => {
        setDetail(res);
        if (res.content) {
          contentForm.reset({ title: res.content.title, content: res.content.content });
        }
      })
      .catch((err) =>
        setDetailError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.')
      );
  };

  const loadVehicles = () => {
    getBoothVehicles(boothId)
      .then(setVehicles)
      .catch((err) =>
        setVehiclesError(err.response?.data?.error?.message ?? '차량 목록을 불러오지 못했습니다.')
      );
  };

  useEffect(() => {
    loadDetail();
    loadVehicles();
    getMyProfile().then(setProfile).catch(() => setProfile(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boothId]);

  // 새로 고른(아직 저장 안 한) 배너 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  if (detailError) {
    return <EmptyState tone="error">{detailError}</EmptyState>;
  }
  if (!detail) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  const savedBannerUrl = toAssetUrl(detail.bannerImageUrl);
  const bannerDisplayUrl = bannerPreview ?? savedBannerUrl;

  // "배너 이미지"와 "부스 소개"를 둘 다 완료해야만 아래 "전시 차량 관리"에서 새 차량을 등록할 수 있다.
  // (이미 등록된 차량의 수정/이미지 관리/삭제는 이 조건과 무관하게 항상 가능)
  const hasBanner = Boolean(detail.bannerImageUrl);
  const hasIntro = Boolean(
    detail.content && detail.content.title?.trim() && detail.content.content?.trim()
  );
  const canRegisterVehicle = hasBanner && hasIntro;

  // 먹거리(푸드) 부스는 전시할 차량이 없으므로 "전시 차량 관리" 섹션 자체를 보여주지 않는다.
  const showVehicleSection = !isFoodBooth(detail.boothType);

  const handleContentSave = (values) => {
    setContentSaving(true);
    setContentError(null);
    setContentMessage(null);
    updateBoothContent(boothId, values)
      .then(() => {
        setContentMessage('저장되었습니다.');
        // 저장 직후 detail.content를 다시 불러와야 아래 "전시 차량 관리" 잠금 해제 여부가 바로 반영된다.
        loadDetail();
      })
      .catch((err) => setContentError(err.response?.data?.error?.message ?? '저장에 실패했습니다.'))
      .finally(() => setContentSaving(false));
  };

  const openBannerPicker = () => bannerInputRef.current?.click();

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setBannerError(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    if (!file) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const cancelBannerSelection = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleBannerUpload = () => {
    if (!bannerFile) return;
    setBannerUploading(true);
    setBannerError(null);
    uploadBoothBannerImage(boothId, bannerFile)
      .then(() => {
        if (bannerPreview) URL.revokeObjectURL(bannerPreview);
        setBannerFile(null);
        setBannerPreview(null);
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        loadDetail();
      })
      .catch((err) => setBannerError(err.response?.data?.error?.message ?? '업로드에 실패했습니다.'))
      .finally(() => setBannerUploading(false));
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (!confirm('이 차량을 삭제하시겠습니까?')) return;
    deleteVehicle(boothId, vehicleId)
      .then(() => loadVehicles())
      .catch((err) => alert(err.response?.data?.error?.message ?? '삭제에 실패했습니다.'));
  };

  return (
    <PageContainer size="md" className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-xs text-muted-foreground">
          <Link to="/mypage" className="text-muted-foreground no-underline hover:text-foreground">마이페이지</Link>
          {' > '}
          <span>{detail.boothNo} 부스 관리</span>
          {' > '}
          <span className="text-foreground">부스 정보 등록</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight">부스 정보 등록</h1>
            <p className="mt-1 mb-0 text-sm text-muted-foreground">
              부스 소개와 배너 이미지를 등록하여 관람객에게 부스를 효과적으로 소개하세요.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> 표시는 필수 입력 항목입니다.
          </span>
        </div>
      </div>

      <StepCard step={1} title="부스 기본 정보" description="박람회와 부스 정보를 입력해주세요.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ReadonlyField label="박람회" value={detail.expoTitle} />
            <ReadonlyField label="부스 유형" value={detail.boothType} />
            <ReadonlyField label="부스 번호" value={detail.boothNo} />
          </div>
          <div className="flex flex-col gap-4">
            <ReadonlyField label="업체명" value={profile?.companyName} />
            <ReadonlyField label="담당자명" value={profile?.managerName} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="연락처" value={profile?.contact} />
              <ReadonlyField label="이메일" value={profile?.email} />
            </div>
          </div>
        </div>
      </StepCard>

      <StepCard step={2} title="배너 이미지" description="부스 배너 이미지를 업로드해주세요. (권장 사이즈 1200 x 400px)">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div
            className="group relative flex aspect-[3/1] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition-colors hover:bg-muted"
            onClick={openBannerPicker}
          >
            <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerFileChange} hidden />
            {bannerDisplayUrl ? (
              <>
                <img src={bannerDisplayUrl} alt="부스 배너" className="size-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  클릭하면 이미지를 변경할 수 있어요
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
                <ImagePlus className="size-8" />
                <p className="m-0 text-sm font-medium">배너 이미지를 업로드해주세요.</p>
                <span className="text-xs">권장 사이즈 1200 x 400px (JPG, PNG)</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Plus className="size-3" /> 이미지 선택
                </span>
              </div>
            )}
          </div>

          <Alert>
            <Info />
            <AlertDescription>
              <p className="m-0 mb-1 font-semibold text-foreground">이미지 업로드 안내</p>
              <ul className="m-0 list-disc pl-4">
                <li>부스 대표 이미지로 박람회 페이지에 노출됩니다.</li>
                <li>가로형 이미지를 권장합니다. (1200x400px)</li>
                <li>파일 형식: JPG, PNG (최대 5MB)</li>
                <li>기업 로고, 부스 전경, 주제 색 이미지를 활용해보세요.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        {bannerFile && (
          <div className="flex gap-2">
            <Button type="button" disabled={bannerUploading} onClick={handleBannerUpload}>
              {bannerUploading ? '저장 중...' : '배너 저장'}
            </Button>
            <Button type="button" variant="outline" disabled={bannerUploading} onClick={cancelBannerSelection}>
              취소
            </Button>
          </div>
        )}
        {bannerError && <p className="m-0 text-sm text-destructive">{bannerError}</p>}
      </StepCard>

      <StepCard step={3} title="부스 소개" description="부스를 한눈에 알 수 있도록 상세 내용을 입력해주세요.">
        <Form {...contentForm}>
          <form className="flex flex-col gap-4" onSubmit={contentForm.handleSubmit(handleContentSave)} noValidate>
            <TextField
              control={contentForm.control}
              name="title"
              label="제목"
              required
              maxLength={TITLE_MAX}
              placeholder="부스 소개 제목을 입력해주세요."
              description={`${titleValue.length}/${TITLE_MAX}`}
            />
            <TextareaField
              control={contentForm.control}
              name="content"
              label="내용"
              required
              rows={4}
              maxLength={CONTENT_MAX}
              placeholder="관람객에게 보여줄 부스 소개 내용을 입력해주세요."
              description={`${contentValue.length}/${CONTENT_MAX}`}
            />
            {contentError && <p className="m-0 text-sm text-destructive">{contentError}</p>}
            {contentMessage && <p className="m-0 text-sm text-emerald-600">{contentMessage}</p>}
            <Button type="submit" className="w-fit" disabled={contentSaving}>
              {contentSaving ? '저장 중...' : '저장'}
            </Button>
          </form>
        </Form>
      </StepCard>

      {showVehicleSection && (
        <StepCard
          step={4}
          title="전시 차량 관리"
          action={
            canRegisterVehicle ? (
              <Button asChild size="sm">
                <Link to={`/mypage/booths/${boothId}/vehicles/new`}>
                  <Plus /> 차량 등록
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled title="배너 이미지와 부스 소개를 먼저 등록해주세요.">
                <Lock /> 차량 등록
              </Button>
            )
          }
        >
          {!canRegisterVehicle && (
            <Alert>
              <Lock />
              <AlertDescription>
                위의 <strong>배너 이미지</strong>와 <strong>부스 소개</strong>를 모두 등록해야 차량을 등록할 수 있어요.
                {!hasBanner && !hasIntro
                  ? ' (배너 이미지, 부스 소개 모두 비어 있어요)'
                  : !hasBanner
                  ? ' (배너 이미지가 비어 있어요)'
                  : ' (부스 소개가 비어 있어요)'}
              </AlertDescription>
            </Alert>
          )}

          {vehiclesError && <p className="m-0 text-sm text-destructive">{vehiclesError}</p>}

          <div className="flex flex-col gap-3">
            {vehicles.length === 0 && <EmptyState className="my-2">등록된 차량이 없습니다.</EmptyState>}
            {vehicles.map((v) => (
              <div key={v.vehicleId} className="flex items-center gap-4 rounded-xl border p-3">
                <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs text-muted-foreground">
                  {v.images[0] ? (
                    <img src={toAssetUrl(v.images[0].imageUrl)} alt={v.name} className="size-full object-cover" />
                  ) : (
                    <span>이미지 없음</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-sm">{v.name}</strong>
                  <span className="truncate text-xs text-muted-foreground">
                    {[v.brand, v.category].filter(Boolean).join(' · ') || v.tags.join(', ') || '-'}
                  </span>
                  <span className="text-sm font-semibold">{v.startPrice.toLocaleString()}원</span>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/mypage/booths/${boothId}/vehicles/${v.vehicleId}/edit`}>수정</Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteVehicle(v.vehicleId)}>
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </StepCard>
      )}

      <StepCard
        step={showVehicleSection ? 5 : 4}
        title="상담 접수 인원"
        description="날짜·시간대마다 받을 상담 건수를 지정하세요. 정원이 차면 고객이 그 시간대를 선택할 수 없습니다."
      >
        <ConsultationSlotSettings boothId={boothId} expoId={detail.expoId} />
      </StepCard>
    </PageContainer>
  );
}

export default BoothManage;
