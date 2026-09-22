// 도넛 그래프 + 범례. items: [{ label, value, color }], centerLabel: 가운데 글자 아래 줄, unit: 값 단위
// 차트 라이브러리가 없어 CSS conic-gradient로 그림
function DonutChart({ items, centerLabel, unit = '명' }) {
  const total = items.reduce((acc, i) => acc + i.value, 0);
  const percent = (v) => (total === 0 ? 0 : Math.round((v / total) * 100));

  // 각 항목의 시작~끝 퍼센트 구간을 색으로 이어 붙임. 합계가 0이면 회색 링
  let acc = 0;
  const stops = items.map((i) => {
    const start = acc;
    acc += (i.value / total) * 100;
    return `${i.color} ${start}% ${acc}%`;
  });
  const ring = total === 0 ? '#e2e8f0' : `conic-gradient(${stops.join(', ')})`;

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative size-[140px] shrink-0 rounded-full before:absolute before:inset-[26px] before:rounded-full before:bg-white before:content-['']"
        style={{ background: ring }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-[20px]">{total.toLocaleString()}{unit}</strong>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="m-0 flex flex-1 flex-col gap-[10px] p-0 text-[13px] list-none">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <i className="size-2.5 rounded-full" style={{ background: i.color }} />
            <span>{i.label}</span>
            <b className="ml-auto font-medium text-slate-600">{i.value.toLocaleString()}{unit} ({percent(i.value)}%)</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
