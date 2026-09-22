import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { registerExpo, openExpo, uploadExpoBannerImage, draftExpoDescription } from '@/api/expo';
import { getBoothHall, isFoodBooth } from '@/utils/boothType';
import { AdminSidebarLayout } from '@/components/admin/AdminSidebarLayout';
import { BannerUpload, ExpoBasicFields, expoSchema } from '@/components/admin/ExpoBasicFields';
import { PageHeader } from '@/components/layout/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// 홀(A/B 등)당 등록 가능한 최대 부스 수 — 부스 배치도 화면의 격자 크기에 맞춘 제한
const MAX_BOOTHS_PER_HALL = 16; // 일반 부스(조립/독립)
const MAX_FOOD_PER_HALL = 4; // 먹거리 부스

// datetime-local 입력용 문자열(YYYY-MM-DDTHH:mm) 생성 - 지금부터 days일 뒤 09:00
const isoLocal = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BOOTH_TYPES = ['조립 부스 (3m x 3m)', '푸드 부스 (3m x 3m)'];

function TypeSelect({ value, onChange, extra }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BOOTH_TYPES.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
        {extra && !BOOTH_TYPES.includes(extra) && <SelectItem value={extra}>{extra}</SelectItem>}
      </SelectContent>
    </Select>
  );
}

function AdminExpoCreate() {
  const navigate = useNavigate();

  // 기본값: 신청 -5일 ~ +10일, 개최 +30일 ~ +33일 (시드 스크립트와 동일 규칙)
  const form = useForm({
    resolver: zodResolver(expoSchema),
    defaultValues: {
      title: '2026 서울 모빌리티 엑스포',
      venue: 'COEX Hall A',
      // 행사 소개 문구(선택) - 고객 화면(박람회 상세 '개요' 탭, 입장 방법 선택 모달)에 노출됨.
      // 비워두면 프론트에서 제목 기반 기본 문구로 대체해서 보여줌.
      description: '',
      applyStartsAt: isoLocal(-5),
      applyEndsAt: isoLocal(10),
      startsAt: isoLocal(30),
      endsAt: isoLocal(33),
      admissionFee: '20000',
    },
  });

  const [booths, setBooths] = useState([]);
  const [autoOpen, setAutoOpen] = useState(true);
  const [bannerFile, setBannerFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [genError, setGenError] = useState(null);

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

  const handleAiDraft = () => {
    const { title, venue } = form.getValues();
    if (!title.trim()) {
      setDraftError('박람회명을 먼저 입력해주세요.');
      return;
    }
    setDrafting(true);
    setDraftError(null);
    draftExpoDescription({ title: title.trim(), venue: venue.trim() || null })
      .then((res) => {
        if (!res.draft) {
          setDraftError('AI 초안 생성에 실패했습니다. 직접 작성해주세요.');
          return;
        }
        form.setValue('description', res.draft, { shouldValidate: true });
      })
      .catch((err) => setDraftError(err.response?.data?.error?.message ?? 'AI 초안 생성 중 오류가 발생했습니다.'))
      .finally(() => setDrafting(false));
  };

  // 부스 일괄 생성 입력값
  const [gen, setGen] = useState({ prefix: 'A-', start: 101, count: 10, type: BOOTH_TYPES[0], fee: 3000000 });
  const setGenField = (k) => (e) => setGen((g) => ({ ...g, [k]: e.target.value }));

  // 홀(A/B 등)별 일반 부스·먹거리 부스 개수 집계. boothNo("A-101")의 "-" 앞부분을 홀로 봄 (getBoothHall과 동일 규칙).
  const hallCounts = useMemo(() => {
    const map = {};
    booths.forEach((b) => {
      const hall = getBoothHall(b.boothNo);
      if (!map[hall]) map[hall] = { normal: 0, food: 0 };
      if (isFoodBooth(b.type)) map[hall].food += 1;
      else map[hall].normal += 1;
    });
    return map;
  }, [booths]);

  const addGenerated = () => {
    const start = Number(gen.start);
    const count = Number(gen.count);
    const fee = Number(gen.fee);
    if (!gen.prefix || !Number.isFinite(start) || !Number.isFinite(count) || count < 1) return;

    const hall = getBoothHall(`${gen.prefix}${start}`);
    const isFood = isFoodBooth(gen.type);
    const limit = isFood ? MAX_FOOD_PER_HALL : MAX_BOOTHS_PER_HALL;
    const current = hallCounts[hall]?.[isFood ? 'food' : 'normal'] ?? 0;

    if (current + count > limit) {
      setGenError(
        `${hall}홀 ${isFood ? '먹거리 부스' : '일반 부스'}는 최대 ${limit}개까지만 등록할 수 있습니다. ` +
          `(현재 ${current}개 + 추가 시도 ${count}개)`
      );
      return;
    }

    setGenError(null);
    const rows = Array.from({ length: count }, (_, i) => ({
      boothNo: `${gen.prefix}${start + i}`,
      type: gen.type,
      fee,
    }));
    setBooths((prev) => [...prev, ...rows]);
    // 다음에 "추가"를 또 누르면 이어지는 번호부터 생성되도록 시작 번호를 자동으로 갱신
    setGen((g) => ({ ...g, start: start + count }));
  };

  const removeRow = (idx) => setBooths((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, key, value) =>
    setBooths((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b)));

  const totalFee = useMemo(() => booths.reduce((sum, b) => sum + (Number(b.fee) || 0), 0), [booths]);

  const onSubmit = async (values) => {
    setError(null);

    if (booths.length === 0) {
      setError('부스를 1개 이상 추가해주세요.');
      return;
    }
    const invalid = booths.some((b) => !b.boothNo.trim() || !b.type.trim() || Number(b.fee) <= 0);
    if (invalid) {
      setError('부스 번호 / 유형 / 임차료(양수)를 모두 채워주세요.');
      return;
    }

    // 수동으로 유형/부스번호를 고쳐서 일괄 생성 시 체크를 우회했을 수 있어 제출 직전 다시 확인
    const overLimitHall = Object.entries(hallCounts).find(
      ([, c]) => c.normal > MAX_BOOTHS_PER_HALL || c.food > MAX_FOOD_PER_HALL
    );
    if (overLimitHall) {
      const [hall, c] = overLimitHall;
      setError(
        c.normal > MAX_BOOTHS_PER_HALL
          ? `${hall}홀의 일반 부스가 ${c.normal}개입니다. 최대 ${MAX_BOOTHS_PER_HALL}개까지만 등록할 수 있습니다.`
          : `${hall}홀의 먹거리 부스가 ${c.food}개입니다. 최대 ${MAX_FOOD_PER_HALL}개까지만 등록할 수 있습니다.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerExpo({
        title: values.title,
        venue: values.venue,
        description: values.description.trim() || null,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        applyStartsAt: values.applyStartsAt,
        applyEndsAt: values.applyEndsAt,
        admissionFee: Number(values.admissionFee),
        booths: booths.map((b) => ({ boothNo: b.boothNo.trim(), type: b.type.trim(), fee: Number(b.fee) })),
      });
      if (bannerFile) await uploadExpoBannerImage(res.expoId, bannerFile);
      if (autoOpen) await openExpo(res.expoId);
      alert(`박람회 등록 완료 (expoId=${res.expoId}${autoOpen ? ', 공개됨' : ', 비공개'})`);
      navigate('/admin/applications');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '박람회 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminSidebarLayout breadcrumb="박람회 등록">
      <PageHeader
        title="박람회 등록"
        description="박람회 기본 정보와 부스를 입력해 새 박람회를 생성합니다. 공개하면 참가업체가 신청할 수 있습니다."
      />

      <div className="mx-auto w-full max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpoBasicFields
                  control={form.control}
                  descriptionAction={
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={handleAiDraft} disabled={drafting}>
                        <Sparkles /> {drafting ? 'AI 작성 중...' : 'AI로 소개 문구 생성'}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        AI 초안은 박람회명(+장소)을 참고해 생성되며, 등록 전 내용을 꼭 확인·수정해주세요.
                      </span>
                      {draftError && <p className="m-0 w-full text-sm text-destructive">{draftError}</p>}
                    </div>
                  }
                >
                  <BannerUpload onFileChange={setBannerFile} />
                </ExpoBasicFields>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>부스 일괄 생성</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_1.5fr_auto] lg:items-end">
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-prefix">접두사</Label>
                    <Input id="gen-prefix" className="h-9" value={gen.prefix} onChange={setGenField('prefix')} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-start">시작 번호</Label>
                    <Input id="gen-start" className="h-9" type="number" value={gen.start} onChange={setGenField('start')} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-count">개수</Label>
                    <Input id="gen-count" className="h-9" type="number" min={1} value={gen.count} onChange={setGenField('count')} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>유형</Label>
                    <TypeSelect value={gen.type} onChange={(v) => setGen((g) => ({ ...g, type: v }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-fee">임차료(원)</Label>
                    <Input id="gen-fee" className="h-9" type="number" min={1} value={gen.fee} onChange={setGenField('fee')} />
                  </div>
                  <Button type="button" onClick={addGenerated}>추가</Button>
                </div>
                {genError && <p className="m-0 text-sm text-destructive">{genError}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>부스 목록 ({booths.length}개)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Object.keys(hallCounts).length > 0 && (
                  <p className="m-0 text-xs text-muted-foreground">
                    {Object.entries(hallCounts)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(
                        ([hall, c]) =>
                          `${hall}홀 — 일반 ${c.normal}/${MAX_BOOTHS_PER_HALL}개, 먹거리 ${c.food}/${MAX_FOOD_PER_HALL}개`
                      )
                      .join('  ·  ')}
                  </p>
                )}

                {booths.length === 0 ? (
                  <p className="m-0 py-6 text-center text-sm text-muted-foreground">
                    아직 부스가 없습니다. 위에서 일괄 생성하세요.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">부스 번호</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead className="w-48">임차료(원)</TableHead>
                          <TableHead className="w-16" aria-label="삭제" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {booths.map((b, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input className="h-8" value={b.boothNo} onChange={(e) => updateRow(idx, 'boothNo', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <TypeSelect value={b.type} extra={b.type} onChange={(v) => updateRow(idx, 'type', v)} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" type="number" min={1} value={b.fee} onChange={(e) => updateRow(idx, 'fee', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeRow(idx)} aria-label="삭제">
                                <Trash2 />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {booths.length > 0 && (
                  <p className="m-0 text-right text-sm font-semibold">임차료 합계 ₩{totalFee.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label className="cursor-pointer font-normal">
                <Checkbox checked={autoOpen} onCheckedChange={(v) => setAutoOpen(!!v)} />
                등록 후 바로 공개
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/applications')}>취소</Button>
                <Button type="submit" disabled={submitting}>{submitting ? '등록 중...' : '박람회 등록'}</Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </AdminSidebarLayout>
  );
}

export default AdminExpoCreate;