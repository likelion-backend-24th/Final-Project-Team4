// 단순 막대 그래프. items: [{ label, value, active }], format: 막대 위에 찍을 값의 표시 함수
function BarChart({ items, format = String }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex h-[150px] items-end gap-1.5">
      {items.map((i) => (
        <div key={i.label} className="flex flex-1 flex-col items-center justify-end gap-1 text-xs text-slate-500">
          <span>{format(i.value)}</span>
          <div
            className={`w-[60%] rounded-t ${i.active ? 'bg-[#2f6bff]' : 'bg-blue-200'}`}
            style={{ height: (Math.max(i.value, 0) / max) * 100 }}
          />
          <em className="text-[11px] not-italic whitespace-nowrap">{i.label}</em>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
