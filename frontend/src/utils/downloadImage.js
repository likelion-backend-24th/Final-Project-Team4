// QR 원본만 저장하면 어느 박람회/날짜 QR인지 이미지만 봐서는 알 수 없어서,
// 캔버스에 QR + 세부 정보(박람회명/방문일/장소/예매자/예매번호)를 같이 그려 한 장의 PNG로 저장한다.
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ticket: { expoTitle, venue, visitDate, holderName, ticketType, bookingNo, purchasedAt, qrImageBase64 }
export function downloadTicketImage(ticket, filename = 'ticket') {
  if (!ticket?.qrImageBase64) return;

  const qr = new Image();
  qr.onload = () => {
    const width = 420;
    const padding = 28;
    const qrSize = 220;
    const lineGap = 26;

    const lines = [
      { text: ticket.expoTitle || '박람회 입장권', bold: true },
      { text: `방문일 ${fmtDate(ticket.visitDate)}` },
      { text: ticket.venue || '' },
      { text: [ticket.holderName, ticket.ticketType].filter(Boolean).join(' · ') },
      { text: `예매번호 ${ticket.bookingNo || ''}` },
      ...(ticket.purchasedAt ? [{ text: `발급일 ${ticket.purchasedAt}` }] : []),
    ].filter((l) => l.text);

    const height = padding * 2 + qrSize + 32 + lines.length * lineGap;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    ctx.drawImage(qr, (width - qrSize) / 2, padding, qrSize, qrSize);

    let y = padding + qrSize + 40;
    ctx.textAlign = 'center';
    lines.forEach(({ text, bold }) => {
      ctx.fillStyle = bold ? '#0f172a' : '#475569';
      ctx.font = bold ? 'bold 19px "Segoe UI", sans-serif' : '14px "Segoe UI", sans-serif';
      ctx.fillText(text, width / 2, y);
      y += lineGap;
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  qr.src = `data:image/png;base64,${ticket.qrImageBase64}`;
}
