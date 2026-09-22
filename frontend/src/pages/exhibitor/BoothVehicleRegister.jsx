import { Car, Check, ChevronRight, Circle, Info, Lock, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  addVehicleImage,
  analyzeVehicleImage,
  getBoothManageDetail,
  getBoothVehicles,
  registerVehicle,
  toAssetUrl,
  updateVehicle,
} from '../../api/expo';
import { getMyProfile } from '../../api/identity';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const TRACKER_STEPS = [
  { id: 1, label: '기본 정보' },
  { id: 2, label: '이미지 업로드' },
  { id: 3, label: 'AI 자동 입력' },
  { id: 4, label: '정보 확인' },
  { id: 5, label: '등록 완료' },
];

const ANALYSIS_STAGES = [
  '이미지 전처리 중...',
  '차량 모델 인식 중...',
  '주요 사양 분석 중...',
  '정보 자동 입력 중...',
  '완료',
];

// 정면/측면/후면 3개 슬롯 - 이 중 최소 1장은 업로드해야 다음 단계로 진행할 수 있다.
const IMAGE_SLOTS = [
  { key: 'front', label: '정면' },
  { key: 'side', label: '측면' },
  { key: 'back', label: '후면' },
];

function emptyImages() {
  return { front: null, side: null, back: null };
}

function emptyVehicleForm() {
  return {
    name: '',
    brand: '',
    category: '',
    tagsText: '',
    startPrice: '',
    range: '',
    battery: '',
    power: '',
    drivetrain: '',
    chargingType: '',
    chargingTime: '',
    dimensions: '',
    weight: '',
    seatingCapacity: '',
    summary: '',
    description: '',
    features: '',
    colors: '',
  };
}

function vehicleToForm(vehicle) {
  return {
    name: vehicle.name ?? '',
    brand: vehicle.brand ?? '',
    category: vehicle.category ?? '',
    tagsText: (vehicle.tags ?? []).join(', '),
    startPrice: vehicle.startPrice != null ? String(vehicle.startPrice) : '',
    range: vehicle.range ?? '',
    battery: vehicle.battery ?? '',
    power: vehicle.power ?? '',
    drivetrain: vehicle.drivetrain ?? '',
    chargingType: vehicle.chargingType ?? '',
    chargingTime: vehicle.chargingTime ?? '',
    dimensions: vehicle.dimensions ?? '',
    weight: vehicle.weight ?? '',
    seatingCapacity: vehicle.seatingCapacity != null ? String(vehicle.seatingCapacity) : '',
    summary: vehicle.summary ?? '',
    description: vehicle.description ?? '',
    features: vehicle.features ?? '',
    colors: vehicle.colors ?? '',
  };
}

// 부스 정보 등록 - 5단계 마법사를 한 화면에 순서대로 잠금 해제하며 보여주는 전용 페이지.
// 기본정보 -> 이미지 업로드 -> AI 자동분석(Gemini Vision) -> 정보 확인/수정 -> 추가정보 -> 등록
function BoothVehicleRegister() {
  const { boothId, vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const editVehicleId = vehicleId ?? searchParams.get('vehicleId');
  const isEdit = Boolean(editVehicleId);
  const navigate = useNavigate();

  const [booth, setBooth] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // 1단계 - 담당자/업체 정보는 내 계정 정보를 그대로 보여주는 용도라 별도로 저장되지 않는다.
  const [contact, setContact] = useState({ managerName: '', contact: '', email: '', companyName: '' });

  const [step, setStep] = useState(1); // 현재까지 도달한(잠금 해제된) 단계
  const [form, setForm] = useState(emptyVehicleForm);
  const [stepError, setStepError] = useState(null); // 1단계 검증 메시지
  const [step4Error, setStep4Error] = useState(null); // 4단계 검증 메시지

  // 정면/측면/후면 슬롯별 파일 - 최소 1장 필수. 언제든(등록 완료 이후에도) 다시 골라서 재분석할 수 있다.
   const [images, setImages] = useState(emptyImages);
  const [imagePreviews, setImagePreviews] = useState(emptyImages);
  const [uploadError, setUploadError] = useState(null); // "최소 1장 필요" 등 이미지 자체의 검증 메시지

  // 수정 모드에서 이미 등록되어 있던 차량 사진 - 여기서는 보여주기만 하고 삭제/추가 버튼은 두지 않는다.
  // (슬롯에서 새 사진을 고르지 않는 한 그대로 유지되며, 새로 고른 사진은 기존 사진에 추가로 등록된다.)
  const [existingImages, setExistingImages] = useState([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0); // 0~4
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const analysisTimerRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    Promise.all([getBoothManageDetail(boothId), getMyProfile()])
      .then(([boothDetail, profile]) => {
        setBooth(boothDetail);
        setContact({
          managerName: profile.managerName ?? '',
          contact: profile.contact ?? '',
          email: profile.email ?? '',
          companyName: profile.companyName ?? '',
        });
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '부스 정보를 불러오지 못했습니다.')
      );
  }, [boothId]);

  // 수정 모드: 기존 차량 데이터를 불러와 전 단계를 바로 열어둔다 (처음 등록할 때만 순서대로 잠금).
  useEffect(() => {
    if (!editVehicleId) return;
    getBoothVehicles(boothId)
      .then((list) => {
         const vehicle = list.find((v) => String(v.vehicleId) === String(editVehicleId));
        if (vehicle) {
          setForm(vehicleToForm(vehicle));
          setExistingImages(vehicle.images ?? []);
          setStep(5);
          setAnalyzed(false);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVehicleId, boothId]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((url) => url && URL.revokeObjectURL(url));
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactField = (field) => (e) =>
    setContact((prev) => ({ ...prev, [field]: e.target.value }));

  const goStep1Next = () => {
    if (!contact.managerName.trim() || !contact.contact.trim() || !contact.email.trim()) {
      setStepError('담당자명, 연락처, 이메일을 모두 입력해주세요.');
      return;
    }
    setStepError(null);
    setStep((s) => Math.max(s, 2));
  };

  const hasAnyImage = Object.values(images).some(Boolean);

  const handleImageSelect = (slotKey) => (e) => {
    const file = e.target.files?.[0] ?? null;
    setImagePreviews((prev) => {
      if (prev[slotKey]) URL.revokeObjectURL(prev[slotKey]);
      return { ...prev, [slotKey]: file ? URL.createObjectURL(file) : null };
    });
    setImages((prev) => ({ ...prev, [slotKey]: file }));
    setUploadError(null);
  };

  // 이미지를 다시 넣고(정면/측면/후면 중 아무 슬롯이나 교체) 이 버튼을 누르면 그때마다 AI가 새로 검색한다.
  // 등록 완료(5단계) 이후에도 계속 눌러서 재분석할 수 있다 - step은 잠금 해제 여부만 결정할 뿐 되돌리지 않는다.
  const startAiAnalysis = () => {
    if (!hasAnyImage) {
      setUploadError('정면, 측면, 후면 중 최소 1장은 업로드해주세요.');
      return;
    }
    setUploadError(null);
    setStep((s) => Math.max(s, 3));
    setAnalyzing(true);
    setAnalysisStage(0);
    setAnalyzeError(null);

    const files = IMAGE_SLOTS.map((slot) => images[slot.key]).filter(Boolean);

    // 실제 API 응답을 기다리는 동안, 4단계까지는 타이머로 진행 상태를 보여주고
    // 응답이 오면 바로 5단계(완료)로 점프한다.
    analysisTimerRef.current = setInterval(() => {
      setAnalysisStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    analyzeVehicleImage(boothId, files)
      .then((result) => {
        if (result?.analyzed) {
          setAnalyzed(true);
          // 재분석 시에는 새로 찾은 값을 우선 반영한다 (다시 검색한 의미가 있도록).
          // 다만 AI가 이번엔 못 찾은 필드(null)는 기존에 입력해둔 값을 그대로 유지한다.
          setForm((prev) => ({
            ...prev,
            name: result.name ?? prev.name,
            brand: result.brand ?? prev.brand,
            category: result.category ?? prev.category,
            tagsText: result.tags?.length ? result.tags.join(', ') : prev.tagsText,
            range: result.range ?? prev.range,
            battery: result.battery ?? prev.battery,
            power: result.power ?? prev.power,
            drivetrain: result.drivetrain ?? prev.drivetrain,
            chargingType: result.chargingType ?? prev.chargingType,
            chargingTime: result.chargingTime ?? prev.chargingTime,
            dimensions: result.dimensions ?? prev.dimensions,
            weight: result.weight ?? prev.weight,
            seatingCapacity:
              result.seatingCapacity != null ? String(result.seatingCapacity) : prev.seatingCapacity,
            summary: result.summary ?? prev.summary,
            description: result.description ?? prev.description,
            features: result.features ?? prev.features,
            colors: result.colors ?? prev.colors,
          }));
        } else {
          setAnalyzed(false);
          setAnalyzeError('AI가 사진에서 차량 정보를 추출하지 못했어요. 아래에서 직접 입력해주세요.');
        }
      })
      .catch((err) => {
        setAnalyzed(false);
        setAnalyzeError(
          err.response?.data?.error?.message ?? 'AI 분석 중 오류가 발생했어요. 직접 입력해주세요.'
        );
      })
      .finally(() => {
        clearInterval(analysisTimerRef.current);
        setAnalyzing(false);
        setAnalysisStage(4);
        setTimeout(() => setStep((s) => Math.max(s, 4)), 500);
      });
  };

  const skipToManualInput = () => {
    if (!hasAnyImage) {
      setUploadError('정면, 측면, 후면 중 최소 1장은 업로드해주세요.');
      return;
    }
    setUploadError(null);
    setStep((s) => Math.max(s, 4));
  };

  const goStep4Next = () => {
    if (!form.name.trim() || !form.startPrice || !form.summary.trim() || !form.description.trim()) {
      setStep4Error('차량명, 시작 가격, 요약, 설명은 필수 항목입니다.');
      return;
    }
    setStep4Error(null);
    setStep((s) => Math.max(s, 5));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    startPrice: Number(form.startPrice),
    summary: form.summary.trim(),
    description: form.description.trim(),
    features: form.features.trim() || null,
    colors: form.colors.trim() || null,
    range: form.range.trim() || null,
    battery: form.battery.trim() || null,
    power: form.power.trim() || null,
    brand: form.brand.trim() || null,
    category: form.category.trim() || null,
    drivetrain: form.drivetrain.trim() || null,
    chargingType: form.chargingType.trim() || null,
    chargingTime: form.chargingTime.trim() || null,
    dimensions: form.dimensions.trim() || null,
    weight: form.weight.trim() || null,
    seatingCapacity: form.seatingCapacity ? Number(form.seatingCapacity) : null,
  });

  const handleRegister = () => {
    if (!form.name.trim() || !form.startPrice || !form.summary.trim() || !form.description.trim()) {
      setStep4Error('차량명, 시작 가격, 요약, 설명은 필수 항목입니다.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const payload = buildPayload();
    const request = isEdit
      ? updateVehicle(boothId, editVehicleId, payload)
      : registerVehicle(boothId, payload);

    const filesToUpload = IMAGE_SLOTS.map((slot) => images[slot.key]).filter(Boolean);

    request
      .then((saved) => {
        if (filesToUpload.length === 0) return null;
        // 정면/측면/후면 중 업로드된 이미지를 전부 순서대로 등록. 한 장이 실패해도 등록 자체는 막지 않는다.
        return filesToUpload.reduce(
          (chain, file) => chain.then(() => addVehicleImage(boothId, saved.vehicleId, file).catch(() => {})),
          Promise.resolve()
        );
      })
      .then(() => navigate(`/mypage/booths/${boothId}`))
      .catch((err) => setSaveError(err.response?.data?.error?.message ?? '등록에 실패했습니다.'))
      .finally(() => setSaving(false));
  };

  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!booth) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  const isLocked = (n) => step < n;
  const analysisProgress = Math.round(((analysisStage + 1) / ANALYSIS_STAGES.length) * 100);
  const alreadyAnalyzedOnce = analyzed || analysisStage > 0;

  // 라벨 + 입력을 한 묶음으로 - form 객체의 필드를 직접 바인딩
  const field = (name, label, props = {}) => (
    <Field key={name} label={label} className={props.wide ? 'md:col-span-2' : ''}>
      {props.textarea ? (
        <Textarea rows={props.rows ?? 3} value={form[name]} onChange={handleField(name)} placeholder={props.placeholder} />
      ) : (
        <Input
          className="h-10"
          type={props.type}
          value={form[name]}
          onChange={handleField(name)}
          placeholder={props.placeholder}
        />
      )}
    </Field>
  );

  return (
    <PageContainer size="md" className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-xs text-muted-foreground">
          <Link to="/mypage" className="text-muted-foreground no-underline hover:text-foreground">마이페이지</Link>
          {' > '}
          <Link to={`/mypage/booths/${boothId}`} className="text-muted-foreground no-underline hover:text-foreground">
            {booth.boothNo} 부스 관리
          </Link>
          {' > '}
          <span className="text-foreground">부스 정보 등록</span>
        </div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">부스 정보 등록</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          부스 정보를 입력하고 차량 이미지를 업로드하면 AI가 정보를 자동으로 분석해 더 간편하게 등록할 수 있습니다.
        </p>

        <ol className="m-0 flex list-none flex-wrap items-center gap-x-6 gap-y-2 p-0">
          {TRACKER_STEPS.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                  t.id <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {t.id < step ? <Check className="size-3.5" /> : t.id}
              </span>
              <span className={cn(t.id === step ? 'font-semibold' : 'text-muted-foreground')}>{t.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 1. 기본 정보 입력 */}
      <Section
        n={1}
        active
        title="기본 정보 입력"
        chip="필수"
        desc="먼저 기본 정보를 입력해주세요. 입력 후 다음 단계로 진행할 수 있습니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="박람회명">
            <Input className="h-10 bg-muted" value={booth.expoTitle} disabled />
          </Field>
          <Field label="담당자명 *">
            <Input className="h-10" value={contact.managerName} onChange={handleContactField('managerName')} />
          </Field>
          <Field label="부스 번호">
            <Input className="h-10 bg-muted" value={`${booth.boothNo} (${booth.boothType})`} disabled />
          </Field>
          <Field label="연락처 *">
            <Input className="h-10" value={contact.contact} onChange={handleContactField('contact')} />
          </Field>
          <Field label="참가 업체명">
            <Input className="h-10 bg-muted" value={contact.companyName} disabled />
          </Field>
          <Field label="이메일 *">
            <Input className="h-10" value={contact.email} onChange={handleContactField('email')} />
          </Field>
        </div>
        {step === 1 && stepError && <p className="m-0 text-sm text-destructive">{stepError}</p>}
        {step === 1 && (
          <div className="flex justify-end">
            <Button type="button" onClick={goStep1Next}>
              다음 단계 <ChevronRight />
            </Button>
          </div>
        )}
      </Section>

      {/* 2. 차량 이미지 업로드 */}
      <Section
        n={2}
        locked={isLocked(2)}
        title="차량 이미지 업로드"
        desc={
          isEdit
            ? '기존에 등록한 사진은 그대로 유지돼요. 새 사진을 고르지 않으면 아무것도 바뀌지 않습니다.'
            : '정면, 측면, 후면 중 최소 1장을 업로드해주세요. 언제든 사진을 바꿔 다시 분석할 수 있습니다.'
        }
        lockedNote="1단계를 완료하면 이곳에서 차량 이미지를 업로드할 수 있어요."
      >
        {isEdit && existingImages.length > 0 && (
          <div>
            <span className="mb-2 block text-xs text-muted-foreground">
              현재 등록된 사진 ({existingImages.length}장) - 그대로 유지됩니다
            </span>
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img) => (
                <img key={img.imageId} src={toAssetUrl(img.imageUrl)} alt="등록된 차량 사진" className="size-20 rounded-lg object-cover" />
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {IMAGE_SLOTS.map((slot) => (
            <div key={slot.key} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{slot.label}</span>
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted">
                {imagePreviews[slot.key] ? (
                  <img src={imagePreviews[slot.key]} alt={`차량 ${slot.label}`} className="size-full object-cover" />
                ) : (
                  <>
                    <Car className="size-7" />
                    <span className="text-xs">사진 선택</span>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageSelect(slot.key)} hidden />
              </label>
              {imagePreviews[slot.key] && (
                <span className="text-xs text-muted-foreground">다시 클릭하면 사진을 바꿀 수 있어요</span>
              )}
            </div>
          ))}
        </div>

        <Alert>
          <Info />
          <AlertDescription>
            <p className="m-0 mb-1 font-semibold text-foreground">업로드 가이드</p>
            <ul className="m-0 list-disc pl-4">
              <li>정면, 측면, 후면 중 최소 1장은 필수입니다. 여러 장을 함께 올리면 AI 인식 정확도가 올라갑니다.</li>
              <li>차량이 잘 보이도록 선명한 이미지를 업로드해주세요.</li>
              <li>번호판 등 개인정보가 노출되지 않도록 주의해주세요.</li>
              <li>권장 형식: JPG, PNG, WEBP (최대 10MB, 장당)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {uploadError && <p className="m-0 text-sm text-destructive">{uploadError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={skipToManualInput}>
            건너뛰고 직접 입력
          </Button>
          <Button type="button" onClick={startAiAnalysis} disabled={analyzing}>
            <Sparkles />
            {analyzing ? '분석 중...' : alreadyAnalyzedOnce ? '이 사진으로 다시 분석하기' : 'AI 분석 시작'}
          </Button>
        </div>
      </Section>

      {/* 3. AI 자동 입력 */}
      <Section
        n={3}
        locked={isLocked(3)}
        title="AI 자동 입력"
        desc="차량 이미지를 업로드하면 AI가 자동으로 차량 정보를 분석해 입력해줍니다."
        lockedNote="이미지 업로드를 완료하면 AI 분석이 시작됩니다."
      >
        <div className="grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-base font-semibold">
              {analysisStage >= 4
                ? analyzed
                  ? 'AI 분석이 완료됐어요.'
                  : 'AI 분석을 완료하지 못했어요.'
                : 'AI가 차량 정보를 분석 중입니다.'}
            </h3>
            <p className="m-0 text-sm text-muted-foreground">
              {analysisStage >= 4
                ? (analyzeError ?? '업로드한 이미지를 바탕으로 차량 정보를 입력했어요. 다음 단계에서 확인해주세요.')
                : '업로드한 이미지를 분석하여 차량의 주요 정보를 자동으로 입력합니다. 잠시만 기다려주세요.'}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${analysisProgress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{analysisProgress}%</span>
            {analysisStage >= 4 && !analyzed && (
              <p className="m-0 text-sm text-destructive">
                계속 실패한다면 위 2단계에서 다른 각도의 사진으로 바꿔 &quot;다시 분석하기&quot;를 눌러보세요.
              </p>
            )}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {ANALYSIS_STAGES.map((label, i) => (
              <li key={label} className={cn('flex items-center gap-2', i <= analysisStage ? 'text-foreground' : 'text-muted-foreground')}>
                {i <= analysisStage ? <Check className="size-4 text-emerald-600" /> : <Circle className="size-4" />}
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 4. 차량 정보 확인 및 수정 */}
      <Section
        n={4}
        locked={isLocked(4)}
        title="차량 정보 확인 및 수정"
        desc="AI가 입력한 정보를 확인하고 필요한 경우 수정해주세요."
        lockedNote="AI 분석 완료 후, 차량 정보가 여기에 표시됩니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {field('name', '차량명 *', { placeholder: '예: 아이오닉 5' })}
          {field('brand', '브랜드', { placeholder: '예: 현대' })}
          {field('category', '카테고리', { placeholder: '예: SUV, 세단' })}
          {field('tagsText', '태그 (쉼표로 구분)', { placeholder: '전기차, SUV' })}
          {field('startPrice', '시작 가격 *', { type: 'number', placeholder: '52400000' })}
          {field('range', '1회 충전 주행거리', { placeholder: '458 km' })}
          {field('battery', '배터리 용량', { placeholder: '77.4 kWh' })}
          {field('power', '최대 출력', { placeholder: '325 ps' })}
          {field('drivetrain', '구동 방식', { placeholder: 'AWD' })}
          {field('chargingType', '충전 방식', { placeholder: 'DC 콤보' })}
          {field('chargingTime', '충전 시간', { placeholder: '18분(10~80%)' })}
          {field('dimensions', '크기 (전장x전폭x전고)', { placeholder: '4635x1890x1620mm' })}
          {field('weight', '무게', { placeholder: '2100 kg' })}
          {field('seatingCapacity', '승차 인원', { type: 'number', placeholder: '5' })}
          {field('summary', '요약 *', { placeholder: '한 줄 요약', wide: true })}
          {field('description', '설명 *', { placeholder: '전시 소개용 상세 설명', textarea: true, rows: 3, wide: true })}
        </div>
        {step === 4 && step4Error && <p className="m-0 text-sm text-destructive">{step4Error}</p>}
        {step === 4 && (
          <div className="flex justify-end">
            <Button type="button" onClick={goStep4Next}>
              다음 단계 <ChevronRight />
            </Button>
          </div>
        )}
      </Section>

      {/* 5. 추가 정보 입력 */}
      <Section
        n={5}
        locked={isLocked(5)}
        title="추가 정보 입력"
        desc="차량의 주요 특징과 컬러 등 추가 정보를 입력해주세요."
        lockedNote="차량 정보 확인을 마치면 주요 특징과 컬러를 입력할 수 있어요."
      >
        <div className="grid gap-4">
          {field('features', '주요 특징', { placeholder: '차량의 주요 특징을 입력해주세요.', textarea: true, rows: 3 })}
          {field('colors', '컬러', { placeholder: '선택 가능한 컬러를 입력해주세요.', textarea: true, rows: 2 })}
        </div>
        {saveError && <p className="m-0 text-sm text-destructive">{saveError}</p>}
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-2 text-sm">
          <Info className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <strong className="block">순서대로 진행해주세요.</strong>
            <p className="m-0 text-muted-foreground">1단계 기본 정보 입력 후, 다음 단계들이 활성화됩니다.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/mypage/booths/${boothId}`)}>
            취소
          </Button>
          <Button type="button" disabled={step < 5 || saving} onClick={handleRegister}>
            {saving ? '등록 중...' : isEdit ? '수정 완료' : '등록하기'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

// 단계 카드 - locked면 흐리게 하고 안내 문구만 보여준다.
function Section({ n, title, desc, chip, active, locked, lockedNote, children }) {
  return (
    <Card className={cn(locked && 'opacity-70')}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              locked ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
            )}
          >
            {n}
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
          {chip && <Badge variant="secondary">{chip}</Badge>}
          {locked && <Lock className="size-4 text-muted-foreground" />}
        </div>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {locked && !active ? <p className="m-0 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">{lockedNote}</p> : children}
      </CardContent>
    </Card>
  );
}

function Field({ label, className, children }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default BoothVehicleRegister;
