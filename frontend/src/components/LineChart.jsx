import './LineChart.css';

const W = 600;
const H = 220;
const PAD = { left: 40, right: 16, top: 12, bottom: 28 };
const GRID = 4; // 가로 눈금선 개수

// 눈금 간격을 1, 2, 5, 10 배수 중 가장 가까운 값으로 맞춰 축 숫자가 깔끔하게 나오게 함
function niceStep(max) {
  const raw = max / GRID;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

// 단순 선 그래프. labels: x축 글자, series: [{ name, color, values }] (values 길이 = labels 길이)
function LineChart({ labels, series }) {
  const step = niceStep(Math.max(GRID, ...series.flatMap((s) => s.values)));
  const max = step * GRID;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (labels.length === 1 ? plotW / 2 : (i * plotW) / (labels.length - 1));
  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  return (
    <div className="line-chart">
      <ul className="line-chart__legend">
        {series.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {Array.from({ length: GRID + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="line-chart__grid" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {labels.map((label, i) => (
          <text key={label} x={x(i)} y={H - 8} textAnchor="middle">{label}</text>
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
