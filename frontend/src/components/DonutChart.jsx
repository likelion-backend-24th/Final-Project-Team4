import './DonutChart.css';

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
    <div className="donut">
      <div className="donut__ring" style={{ background: ring }}>
        <div className="donut__center">
          <strong>{total.toLocaleString()}{unit}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="donut__legend">
        {items.map((i) => (
          <li key={i.label}>
            <i style={{ background: i.color }} />
            <span>{i.label}</span>
            <b>{i.value.toLocaleString()}{unit} ({percent(i.value)}%)</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
