import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { getExpoBooths, applyBooth } from '../../api/expo';
import HallMap, { HallPlaza } from '../../components/HallMap';
import { CheckboxField, TextareaField, TextField } from '../../components/form/fields';
import { getBoothHall, getSelectedKind } from '../../utils/boothType';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const STEPS = ['부스 선택', '신청 정보 입력', '신청 완료'];

const schema = z.object({
  exhibitionItem: z.string().trim().min(1, '전시 품목을 입력해주세요.'),
  conceptDescription: z.string().trim().min(1, '전시 컨셉 설명을 입력해주세요.'),
  powerRequested: z.boolean(),
  waterSupplyRequested: z.boolean(),
  internetRequested: z.boolean(),
  additionalRequest: z.string(),
});

function LegendDot({ className, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={cn('inline-block size-3 rounded-sm border', className)} />
      {label}
    </span>
  );
}

function BoothApplication() {
  const { expoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [expoBooths, setExpoBooths] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(1);
  // ExpoDetail의 부스 배치도에서 여러 부스를 선택하고 넘어오면 boothId 쿼리 파라미터가 여러 개 붙어서 옴
  const initialBoothIds = searchParams.getAll('boothId').map(Number).filter((id) => !Number.isNaN(id));
  const [selectedBoothIds, setSelectedBoothIds] = useState(initialBoothIds);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      exhibitionItem: '',
      conceptDescription: '',
      powerRequested: true,
      waterSupplyRequested: false,
      internetRequested: true,
      additionalRequest: '',
    },
  });

  useEffect(() => {
    getExpoBooths(expoId)
      .then(setExpoBooths)
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.'));
  }, [expoId]);

  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!expoBooths) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  const selectedBooths = expoBooths.booths.filter((b) => selectedBoothIds.includes(b.boothId));
  const totalFee = selectedBooths.reduce((sum, b) => sum + b.fee, 0);
  // ExpoDetail의 부스 배치도와 동일하게 A홀/B홀로 나눠서 보여주기 위한 계산
  const halls = [...new Set(expoBooths.booths.map((b) => getBoothHall(b.boothNo)))].sort();
  const selectedKind = getSelectedKind(expoBooths.booths, selectedBoothIds); // 먹거리/조립 중 한 종류만 선택 가능

  const toggleBooth = (boothId) => {
    setSelectedBoothIds((prev) =>
      prev.includes(boothId) ? prev.filter((id) => id !== boothId) : [...prev, boothId]
    );
  };

  const handleSubmit = (values) => {
    if (selectedBoothIds.length === 0) return;
    setSubmitError(null);
    setSubmitting(true);
    applyBooth({
      expoId: Number(expoId),
      boothIds: selectedBoothIds,
      exhibitionItem: values.exhibitionItem,
      conceptDescription: values.conceptDescription,
      powerRequested: values.powerRequested,
      waterSupplyRequested: values.waterSupplyRequested,
      internetRequested: values.internetRequested,
      additionalRequest: values.additionalRequest,
      saveMode: 'SUBMIT',
    })
      .then(() => setStep(3))
      .catch((err) => setSubmitError(err.response?.data?.error?.message ?? '신청 처리 중 오류가 발생했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <PageContainer size="xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-2xl font-bold tracking-tight">부스 참가 신청</h1>
        <ol className="m-0 flex list-none items-center gap-2 p-0 text-sm">
          {STEPS.map((label, idx) => {
            const active = idx + 1 === step;
            const done = idx + 1 < step;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    active || done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : idx + 1}
                </span>
                <span className={cn(active ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
                {idx < STEPS.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
              </li>
            );
          })}
        </ol>
      </div>

      {step < 3 && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">부스 도면에서 위치 선택 (같은 종류 부스만 다중 선택 가능)</CardTitle>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <LegendDot className="border-blue-100 bg-blue-50" label="선택가능" />
                  <LegendDot className="border-slate-200 bg-slate-100" label="예약됨" />
                  <LegendDot className="border-primary bg-primary" label="선택됨" />
                </div>
              </CardHeader>
              <CardContent className="flex gap-4 overflow-x-auto pb-4">
                {halls.map((h, i) => (
                  <Fragment key={h}>
                    {i > 0 && <HallPlaza />}
                    <HallMap
                      hallName={h}
                      booths={expoBooths.booths.filter((b) => getBoothHall(b.boothNo) === h)}
                      selectedBoothIds={selectedBoothIds}
                      onSelect={toggleBooth}
                      selectedKind={selectedKind}
                      reverseFood={i % 2 === 1}
                    />
                  </Fragment>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="m-0 text-xs text-muted-foreground">선택한 부스 정보</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold">
                      {selectedBooths.length > 0 ? selectedBooths.map((b) => b.boothNo).join(', ') : '-'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedBooths.length > 0 ? `${selectedBooths.length}개 부스 선택됨` : '부스를 선택해주세요'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="m-0 text-xs text-muted-foreground">최종 부스 임차료 합계</p>
                  <p className="m-0 mt-1 text-xl font-bold text-primary">
                    {selectedBooths.length > 0 ? `${totalFee.toLocaleString()} 원` : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">상세 신청 정보 입력</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
                  <TextField
                    control={form.control}
                    name="exhibitionItem"
                    label="전시 품목"
                    required
                    placeholder="예: 전기차 배터리 매니지먼트 시스템(BMS)"
                  />
                  <TextField
                    control={form.control}
                    name="conceptDescription"
                    label="전시 컨셉 설명"
                    required
                    placeholder="부스 내 전시 레이아웃 및 주요 기술 컨셉을 작성해주세요."
                  />

                  <div className="grid gap-2">
                    <span className="text-sm font-medium">추가 필요 부대시설</span>
                    <div className="flex flex-col gap-2 rounded-lg border p-3">
                      <CheckboxField control={form.control} name="powerRequested" label="전기 (1kW 단위)" />
                      <CheckboxField control={form.control} name="waterSupplyRequested" label="수도 / 배수" />
                      <CheckboxField control={form.control} name="internetRequested" label="인터넷 선" />
                    </div>
                  </div>

                  <TextareaField
                    control={form.control}
                    name="additionalRequest"
                    label="추가 요청 사항"
                    rows={3}
                    placeholder="특별한 부스 기술 사양이나 가구 추가 대여 요청 사항이 있다면 입력해주세요."
                  />

                  {(submitError || Object.keys(form.formState.errors).length > 0) && (
                    <Alert variant="destructive">
                      <AlertDescription>{submitError ?? '필수 항목을 모두 입력해주세요.'}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" size="lg" disabled={selectedBoothIds.length === 0 || submitting}>
                    {submitting ? '신청 중...' : '신청 완료하기'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-7" />
            </span>
            <p className="m-0 text-xl font-bold">신청이 완료되었습니다.</p>
            <p className="m-0 text-sm text-muted-foreground">관리자 심사 후 결과가 마이페이지에 안내됩니다.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/mypage')}>마이페이지에서 확인하기</Button>
              <Button variant="outline" onClick={() => navigate(`/expos/${expoId}`)}>
                박람회 상세로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

export default BoothApplication;
