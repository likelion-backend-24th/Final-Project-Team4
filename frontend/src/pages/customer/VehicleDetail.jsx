import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BulkConsultPromo from '@/components/customer/BulkConsultPromo';
import { getCustomerExpoVehicles, toAssetUrl } from '@/api/expo';
import { EmptyState, PageContainer } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// 주요 제원 그리드에 뿌릴 항목 - 값이 없는 항목(선택 입력이라 비어있을 수 있음)은 자동으로 건너뛴다.
const SPEC_FIELDS = [
  { key: 'range', icon: '🛣️', label: '1회 충전 주행거리' },
  { key: 'battery', icon: '🔋', label: '배터리 용량' },
  { key: 'power', icon: '⚡', label: '최대 출력' },
  { key: 'drivetrain', icon: '⚙️', label: '구동 방식' },
  { key: 'chargingType', icon: '🔌', label: '충전 방식' },
  { key: 'chargingTime', icon: '⏱️', label: '충전 시간' },
  { key: 'dimensions', icon: '📐', label: '크기 (전장x전폭x전고)' },
  { key: 'weight', icon: '⚖️', label: '무게' },
  { key: 'seatingCapacity', icon: '👥', label: '승차 인원', suffix: '명' },
];

// 컬러 이름에 자주 쓰이는 한글 표현을 대략적인 색상으로 매핑 - 못 찾으면 중립 회색 스와치로 표시.
const COLOR_HEX_MAP = [
  [/화이트|백색|펄/i, '#f8fafc'],
  [/블랙|흑색/i, '#0f172a'],
  [/그레이|실버|그래파이트/i, '#94a3b8'],
  [/레드|적색/i, '#ef4444'],
  [/블루|청색/i, '#2563eb'],
  [/그린|녹색/i, '#10b981'],
  [/옐로우|노랑/i, '#f59e0b'],
  [/베이지|아이보리|화이트/i, '#e7dfce'],
  [/카키/i, '#6b7a4a'],
  [/브라운|갈색/i, '#78350f'],
  [/골드|금색/i, '#caa456'],
];

const colorToHex = (name) => COLOR_HEX_MAP.find(([re]) => re.test(name))?.[1] ?? '#cbd5e1';

const splitLines = (text) =>
  (text ?? '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

function FeatureList({ lines }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-3" />
          </span>
          {line}
        </li>
      ))}
    </ul>
  );
}

function ColorGrid({ lines }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-4">
      {lines.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <span className="size-10 rounded-full border border-border" style={{ background: colorToHex(name) }} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}

function VehicleDetail() {
  const { expoId, vehicleId } = useParams();
  const [groups, setGroups] = useState([]);
  const [found, setFound] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [tab, setTab] = useState('intro');

  useEffect(() => {
    getCustomerExpoVehicles(expoId)
      .then((groupsRes) => {
        setGroups(groupsRes);
        for (const group of groupsRes) {
          const vehicle = group.vehicles.find((v) => String(v.vehicleId) === vehicleId);
          if (vehicle) {
            setFound({ vehicle, group });
            return;
          }
        }
        setLoadError('차량 정보를 찾을 수 없습니다.');
      })
      .catch((err) =>
        setLoadError(err.response?.data?.error?.message ?? '차량 정보를 불러오지 못했습니다.')
      );
  }, [expoId, vehicleId]);

  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!found) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  const { vehicle, group } = found;
  const images = vehicle.images;
  const imageCount = images.length;
  const mainImageUrl = images[activeImageIdx] ? toAssetUrl(images[activeImageIdx].imageUrl) : null;
  const brandName = vehicle.brand || group.title;
  const brandLogoUrl = group.bannerImageUrl ? toAssetUrl(group.bannerImageUrl) : null;

  const goPrevImage = () => setActiveImageIdx((i) => (i - 1 + imageCount) % imageCount);
  const goNextImage = () => setActiveImageIdx((i) => (i + 1) % imageCount);

  const specs = SPEC_FIELDS.filter((f) => vehicle[f.key] !== null && vehicle[f.key] !== undefined && vehicle[f.key] !== '');
  const featureLines = splitLines(vehicle.features);
  const colorLines = splitLines(vehicle.colors);

  return (
    <PageContainer>
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="breadcrumb">
        <Link to="/customer" className="text-muted-foreground no-underline hover:text-foreground">홈</Link>
        <ChevronRight className="size-3" />
        <Link to={`/customer/expos/${expoId}`} className="text-muted-foreground no-underline hover:text-foreground">전시 차량</Link>
        <ChevronRight className="size-3" />
        <Link to={`/customer/expos/${expoId}/booths/${group.boothId}`} className="text-muted-foreground no-underline hover:text-foreground">
          {group.title}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{vehicle.name}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              {mainImageUrl && <img src={mainImageUrl} alt={vehicle.name} className="size-full object-cover" />}
              {imageCount > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full opacity-90"
                    onClick={goPrevImage}
                    aria-label="이전 사진"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full opacity-90"
                    onClick={goNextImage}
                    aria-label="다음 사진"
                  >
                    <ChevronRight />
                  </Button>
                  <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
                    {activeImageIdx + 1} / {imageCount}
                  </span>
                </>
              )}
            </div>
            {imageCount > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2.5">
                {images.map((img, i) => (
                  <button
                    key={img.imageId}
                    type="button"
                    className={cn(
                      'aspect-[3/2] cursor-pointer overflow-hidden rounded-lg border-2 bg-muted p-0 transition-colors',
                      i === activeImageIdx ? 'border-primary' : 'border-transparent hover:border-border'
                    )}
                    onClick={() => setActiveImageIdx(i)}
                  >
                    <img src={toAssetUrl(img.imageUrl)} alt={`${vehicle.name} ${i + 1}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              {brandLogoUrl ? (
                <img className="h-7 max-w-36 rounded object-contain" src={brandLogoUrl} alt={brandName} />
              ) : (
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {brandName.slice(0, 1)}
                </span>
              )}
              <span className="text-sm font-semibold text-muted-foreground">{brandName}</span>
            </div>
            <h1 className="m-0 text-3xl font-bold tracking-tight">{vehicle.name}</h1>
            <p className="mt-2 mb-3 text-sm text-muted-foreground">{vehicle.summary}</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {vehicle.tags.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              시작 가격 <strong className="ml-1 text-2xl font-extrabold text-foreground">{vehicle.startPrice.toLocaleString()}원</strong>
            </p>
          </div>

          {specs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 주요 제원</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {specs.map((f) => (
                  <div key={f.key} className="flex items-start gap-3 rounded-lg border p-3.5">
                    <span className="text-lg leading-none">{f.icon}</span>
                    <div>
                      <span className="block text-xs text-muted-foreground">{f.label}</span>
                      <span className="mt-1 block text-sm font-bold">
                        {vehicle[f.key]}
                        {f.suffix ?? ''}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="intro">차량 소개</TabsTrigger>
                  <TabsTrigger value="features">주요 특징</TabsTrigger>
                  <TabsTrigger value="colors">컬러</TabsTrigger>
                </TabsList>

                <TabsContent value="intro">
                  <div className="flex flex-col items-start gap-5 sm:flex-row">
                    <div className="min-w-0 flex-1 text-sm leading-relaxed">
                      {vehicle.description ? (
                        vehicle.description.split('\n').map((line, i) => (
                          <p key={i} className="mt-0 mb-2">{line}</p>
                        ))
                      ) : (
                        <p className="m-0 text-muted-foreground">등록된 차량 소개가 없습니다.</p>
                      )}
                    </div>
                    {images[1] && (
                      <img
                        src={toAssetUrl(images[1].imageUrl)}
                        alt={vehicle.name}
                        className="w-full shrink-0 rounded-lg object-cover sm:w-56"
                      />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="features">
                  {featureLines.length > 0 ? (
                    <FeatureList lines={featureLines} />
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">등록된 주요 특징 정보가 없습니다.</p>
                  )}
                </TabsContent>
                <TabsContent value="colors">
                  {colorLines.length > 0 ? (
                    <ColorGrid lines={colorLines} />
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">등록된 컬러 정보가 없습니다.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <BulkConsultPromo expoId={expoId} groups={groups} lockedBoothId={group.boothId} defaultVehicle={vehicle.name} />
      </div>
    </PageContainer>
  );
}

export default VehicleDetail;
