import { useEffect, useRef, useState } from 'react';

// 막대그래프(BarChart, 150px 고정)와 카드 높이를 맞추기 위한 고정 높이. 폭은 아래 ResizeObserver로 실측함
const H = 160;
const PAD = { left: 40, right: 16, top: 12, bottom: 28 };
const GRID = 4; // 가로 눈금선 개수

// 눈금 간격을 1, 2, 5, 10 배수 중 가장 가까운 값으로 맞춰 축 숫자가 깔끔하게 나오게 함
function niceStep(max) {
  const raw = max / GRID;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

// 단순 선 그래프. labels: x축 글자, series: [{ name, color, values }] (values 길이 = labels 길이)
// SVG를 viewBox 비율로 늘리면(width:100%, height:auto) 폭이 넓어질수록 높이도 커져서 옆 카드와
// 높이가 어긋난다. 그래서 실제 컨테이너 폭을 재서 좌표를 그 폭 기준으로 그리고, 높이(H)는 고정한다.
function LineChart({ labels, series }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600); // 실측 전 초기값

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const step = niceStep(Math.max(GRID, ...series.flatMap((s) => s.values)));
  const max = step * GRID;
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (labels.length === 1 ? plotW / 2 : (i * plotW) / (labels.length - 1));
  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  return (
    <div ref={wrapRef}>
      <ul className="m-0 mb-1 flex list-none justify-end gap-3 p-0 text-xs text-slate-500">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1">
            <i className="size-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <svg width={width} height={H} role="img" className="block">
        {Array.from({ length: GRID + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stroke-[#f1f5f9]" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="text-[11px] fill-slate-500">{v}</text>
          </g>
        ))}
        {labels.map((label, i) => (
          <text key={label} x={x(i)} y={H - 8} textAnchor="middle" className="text-[11px] fill-slate-500">{label}</text>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default LineChart;
