// 실제 QR 발급 API가 없는 화면(당일 입장권 구매, 기존 티켓 인증)에서 쓰는 시각적 QR 목업.
// 파인더 패턴(모서리 3개) + 무작위 모듈로 실제 QR처럼 보이게만 구성 — 스캔은 안 됨.
const MODULES = (() => {
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const grid = [];
  for (let r = 0; r < 21; r += 1) {
    const row = [];
    for (let c = 0; c < 21; c += 1) {
      row.push(rand() > 0.55);
    }
    grid.push(row);
  }
  return grid;
})();

function isFinder(r, c) {
  const zones = [
    [0, 0],
    [0, 14],
    [14, 0],
  ];
  return zones.some(([zr, zc]) => r >= zr && r < zr + 7 && c >= zc && c < zc + 7);
}

function finderPattern(zr, zc) {
  const cells = [];
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      if (isBorder || isCore) {
        cells.push({ r: zr + r, c: zc + c });
      }
    }
  }
  return cells;
}

const FINDER_CELLS = [...finderPattern(0, 0), ...finderPattern(0, 14), ...finderPattern(14, 0)];

function QrPlaceholder({ size = 160 }) {
  const cell = size / 21;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="QR 코드(목업)"
    >
      <rect x="0" y="0" width={size} height={size} fill="#fff" />
      {MODULES.map((row, r) =>
        row.map((on, c) =>
          on && !isFinder(r, c) ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#0f172a"
            />
          ) : null
        )
      )}
      {FINDER_CELLS.map(({ r, c }) => (
        <rect
          key={`f-${r}-${c}`}
          x={c * cell}
          y={r * cell}
          width={cell}
          height={cell}
          fill="#0f172a"
        />
      ))}
    </svg>
  );
}

export default QrPlaceholder;
