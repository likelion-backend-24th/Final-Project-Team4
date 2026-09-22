import { isFoodBooth } from '../utils/boothType';
import { cn } from '@/lib/utils';

const STATUS_LABEL = {
  AVAILABLE: '미배정',
  RESERVED: '결제대기',
  ASSIGNED: '참가확정',
  // 실제 부스 자체의 상태는 아니고, Admin 화면에서 "심사중인 신청이 있는 부스"를 표시하려고
  // 클라이언트에서만 임시로 덧씌우는 값 (백엔드 Booth.status에는 없음)
  PENDING_REVIEW: '심사중',
  // 같은 부스에 심사중인 신청이 2건 이상 걸려있는 경우 (경쟁)
  PENDING_CONFLICT: '심사중(중복)',
};

// 부스 칸 아래에 상태 뱃지 텍스트를 보여줄지 여부 - 심사중/중복은 항상 표시,
// 결제대기/참가확정은 showStatusLabel(관리자 화면 전용)이 true일 때만 표시
function BoothCell({ booth, selected, onSelect, showStatusLabel = false, selectedKind = null }) {
  const id = booth.boothId ?? booth.id;
  const isPending = booth.status === 'PENDING_REVIEW';
  const isConflict = booth.status === 'PENDING_CONFLICT';
  const isReserved = booth.status === 'RESERVED';
  const isAssigned = booth.status === 'ASSIGNED';
  const isTaken = isReserved || isAssigned;
  const isFood = isFoodBooth(booth.type);
  const showBadge = isPending || isConflict || (showStatusLabel && isTaken);
  // 이미 고른 부스와 종류(먹거리/조립)가 다르면 선택 못 하게 막음
  const isBlocked = selectedKind !== null && selectedKind !== (isFood ? 'food' : 'main');

  return (
    <button
      type="button"
      disabled={isTaken || isPending || isConflict || isBlocked}
      title={
        isBlocked
          ? '먹거리 부스와 조립 부스는 따로 신청해주세요.'
          : `${booth.boothNo} · ${STATUS_LABEL[booth.status] ?? booth.status}`
      }
      className={cn(
        'flex h-[72px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-semibold transition-colors',
        'border-blue-100 bg-blue-50 text-slate-800 enabled:cursor-pointer enabled:hover:border-primary',
        isFood && 'border-orange-200 bg-orange-50',
        isBlocked && 'border-slate-200 bg-slate-100 text-slate-400 opacity-60',
        isPending && 'border-yellow-300 bg-yellow-100 text-amber-900',
        isConflict && 'border-red-600 bg-yellow-100 text-amber-900',
        isReserved && 'border-slate-200 bg-slate-100 text-slate-400',
        isAssigned && 'border-slate-900 bg-slate-900 text-white',
        selected && 'border-primary bg-primary text-primary-foreground'
      )}
      onClick={() => onSelect(id)}
    >
      {isFood && <span aria-hidden="true">🍴</span>}
      <span>{booth.boothNo}</span>
      {showBadge && <span className="text-[10px] font-medium opacity-90">{STATUS_LABEL[booth.status]}</span>}
    </button>
  );
}

// 박람회 부스 배치도의 한 홀(A홀/B홀 등)을 렌더링. boothNo("A-101")의 "-" 앞부분으로 홀을 묶는다.
// 먹거리 부스는 홀 바깥쪽 열에, 나머지 부스는 가운데 격자에 배치하고, 휴게공간/안내데스크/출입구는
// 실제 데이터가 없는 장식용 요소라 고정 라벨로만 표시한다.
function HallMap({
  hallName,
  booths,
  selectedBoothIds = [],
  onSelect,
  reverseFood = false,
  showStatusLabel = false,
  selectedKind = null,
}) {
  const foodBooths = booths.filter((b) => isFoodBooth(b.type));
  const mainBooths = booths.filter((b) => !isFoodBooth(b.type));

  const foodCol = foodBooths.length > 0 && (
    <div className="flex w-14 shrink-0 flex-col gap-1.5">
      {foodBooths.map((b) => (
        <BoothCell
          key={b.boothId ?? b.id}
          booth={b}
          selected={selectedBoothIds.includes(b.boothId ?? b.id)}
          onSelect={onSelect}
          showStatusLabel={showStatusLabel}
          selectedKind={selectedKind}
        />
      ))}
    </div>
  );

  return (
    <div className="min-w-[260px] max-w-[340px] rounded-xl border bg-card p-3">
      <div className="mb-3 w-fit rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{hallName}홀</div>
      <div className={cn('flex gap-1.5', reverseFood && 'flex-row-reverse')}>
        {foodCol}
        <div className="grid flex-1 grid-cols-4 gap-1.5 max-[480px]:grid-cols-3">
          {mainBooths.map((b) => (
            <BoothCell
              key={b.boothId ?? b.id}
              booth={b}
              selected={selectedBoothIds.includes(b.boothId ?? b.id)}
              onSelect={onSelect}
              showStatusLabel={showStatusLabel}
              selectedKind={selectedKind}
            />
          ))}
        </div>
      </div>
      <div className={cn('mt-3 flex flex-wrap gap-1.5 text-[11px]', reverseFood && 'flex-row-reverse')}>
        <span className="rounded bg-green-100 px-2 py-1 text-green-700">🛋️ 휴게 공간</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-500">↑ 출입구</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-500">ⓘ 안내데스크</span>
      </div>
    </div>
  );
}

// 두 홀 사이의 중앙광장 장식 요소(실제 데이터 없음, 고정 라벨).
export function HallPlaza() {
  return (
    <div className="flex min-w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-green-300 bg-green-50 px-3 py-6 text-green-700">
      <span aria-hidden="true">🌳🪑</span>
      <span className="text-xs font-semibold">중앙광장</span>
    </div>
  );
}

export default HallMap;
