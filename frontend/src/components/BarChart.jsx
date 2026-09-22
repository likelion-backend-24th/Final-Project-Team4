import './BarChart.css';

// 단순 막대 그래프. items: [{ label, value, active }], format: 막대 위에 찍을 값의 표시 함수
function BarChart({ items, format = String }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bar-chart">
      {items.map((i) => (
        <div key={i.label} className={`bar-chart__col${i.active ? ' is-active' : ''}`}>
          <span>{format(i.value)}</span>
          <div style={{ height: (Math.max(i.value, 0) / max) * 100 }} />
          <em>{i.label}</em>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
