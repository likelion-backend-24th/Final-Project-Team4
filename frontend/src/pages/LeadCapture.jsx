import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import {
  confirmLeadConsent,
  getLeads,
  getMyBooths,
  scanLeadQr,
  sendLeadInfo,
  summarizeLeadEmail,
  updateLeadEmail,
} from '../api/leads';
import './LeadCapture.css';

const STATUS_LABEL = {
  SCANNED: '연락처 확보',
  DRAFTED: '이메일 초안 생성됨',
  SENT: '발송 완료',
};

// ISO → 화면 표시용(2026.09.14 10:16)
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '-');
// 'YYYY-MM-DD' → 화면 표시용(2026.09.14)
const fmtDate = (dateStr) => (dateStr ? dateStr.slice(0, 10).replace(/-/g, '.') : '-');

// QR 스캔 → 리드 확보 → 상담 메모 → Gemini 이메일 초안 → 발송 (STORY 11, TASK 11-2~4 실제 API 연동)
function LeadCapture() {
  const [myBooths, setMyBooths] = useState([]);
  const [boothsLoading, setBoothsLoading] = useState(true);
  const [boothsError, setBoothsError] = useState(null);
  const [boothId, setBoothId] = useState(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanResult, setScanResult] = useState(null); // { customerName, isConsultation } | null

  const [leads, setLeads] = useState([]);
  const [leadListOpen, setLeadListOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [expandField, setExpandField] = useState(null); // null | 'note' | 'draft'
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    getMyBooths()
      .then(setMyBooths)
      .catch((err) => setBoothsError(err.response?.data?.error?.message ?? err.message))
      .finally(() => setBoothsLoading(false));
  }, []);

  const selectedBooth = myBooths.find((b) => b.boothId === boothId) ?? null;

  const backToBoothList = () => {
    setBoothId(null);
    setLeads([]);
    setLeadListOpen(false);
    setScanResult(null);
    closeLead();
  };

  const refreshLeads = () => getLeads(boothId).then(setLeads);

  useEffect(() => {
    if (boothId != null) refreshLeads();
  }, [boothId]);

  const submitToken = (token) => {
    setScanning(true);
    setScanError(null);
    scanLeadQr(boothId, token)
      .then((lead) => {
        closeScanModal();
        setConsentChecked(false);
        setScanResult({
          leadId: lead.leadId,
          customerName: lead.customerName,
          visitDate: lead.visitDate,
          scannedAt: lead.createdAt,
          isConsultation: !!lead.consultationId,
        });
        return refreshLeads();
      })
      .catch((err) => setScanError(err.response?.data?.error?.message ?? err.message))
      .finally(() => setScanning(false));
  };

  const openScanModal = () => {
    setScanError(null);
    setScanResult(null);
    setScanModalOpen(true);
  };

  const closeScanModal = () => {
    stopCamera();
    setScanModalOpen(false);
    setScanError(null);
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
      tickCameraScan();
    } catch (err) {
      setCameraError('카메라를 사용할 수 없습니다: ' + err.message);
    }
  };

  const tickCameraScan = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tickCameraScan);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      stopCamera();
      submitToken(code.data.trim());
      return;
    }
    rafRef.current = requestAnimationFrame(tickCameraScan);
  };

  const decodeImageFile = (file) => {
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      URL.revokeObjectURL(img.src);
      if (code?.data) {
        submitToken(code.data.trim());
      } else {
        setScanError('이미지에서 QR 코드를 찾지 못했습니다.');
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    decodeImageFile(file);
  };

  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    decodeImageFile(e.dataTransfer.files?.[0]);
  };

  useEffect(() => stopCamera, []);

  const selected = leads.find((l) => l.leadId === selectedId) ?? null;

  const openLead = (lead) => {
    setSelectedId(lead.leadId);
    setNote(lead.interestNote || '');
    setDraft(lead.emailSummary || '');
    setEmailInput(lead.customerEmail || '');
    setActionError(null);
  };

  const closeLead = () => {
    setSelectedId(null);
    setNote('');
    setDraft('');
    setEmailInput('');
    setExpandField(null);
  };

  // 워크인 리드는 Identity에 이메일이 없을 수 있어 참가업체가 현장에서 직접 입력(상담 신청 건은 대상 아님).
  const handleSaveEmail = () => {
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    setActionError(null);
    updateLeadEmail(selected.leadId, emailInput.trim())
      .then(() => refreshLeads())
      .catch((err) => setActionError(err.message ?? '이메일 저장 중 오류가 발생했습니다.'))
      .finally(() => setSavingEmail(false));
  };

  const handleSummarize = () => {
    if (!note.trim()) return;
    setSummarizing(true);
    setActionError(null);
    summarizeLeadEmail(selected.leadId, note)
      .then((lead) => {
        setDraft(lead.emailSummary);
        return refreshLeads();
      })
      .catch((err) => setActionError(err.message ?? 'AI 요약 생성 중 오류가 발생했습니다.'))
      .finally(() => setSummarizing(false));
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    setSending(true);
    setActionError(null);
    sendLeadInfo(selected.leadId, draft)
      .then(() => refreshLeads())
      .then(closeLead)
      .catch((err) => setActionError(err.message ?? '발송 중 오류가 발생했습니다.'))
      .finally(() => setSending(false));
  };

  // 워크인 리드는 스캔 시점엔 동의가 없는 상태 - 체크박스는 화면에서만 선택해두고,
  // "방문 확인" 버튼을 눌러야 실제로 저장하며 스캔 결과 카드를 닫는다.
  const [consentChecked, setConsentChecked] = useState(false);
  const [confirmingVisit, setConfirmingVisit] = useState(false);
  const handleConfirmVisit = () => {
    if (!scanResult) return;
    if (!consentChecked || !scanResult.leadId) {
      setScanResult(null);
      setConsentChecked(false);
      return;
    }
    setConfirmingVisit(true);
    confirmLeadConsent(scanResult.leadId)
      .then(() => refreshLeads())
      .then(() => {
        setScanResult(null);
        setConsentChecked(false);
      })
      .catch((err) => setScanError(err.response?.data?.error?.message ?? err.message))
      .finally(() => setConfirmingVisit(false));
  };

  return (
    <div className="lead">
      <section className="lead-hero">
        <div className="lead-hero__eyebrow">EXHIBITOR LEAD CAPTURE</div>
        <h1>QR 리드 확보</h1>
        <p>고객 QR을 스캔해 연락처를 확보하고, 상담 내용을 AI로 정리해 이메일로 보낼 수 있습니다.</p>
      </section>

      {boothsLoading && <p className="lead-empty">내 부스 목록을 불러오는 중...</p>}
      {!boothsLoading && boothsError && <p className="lead-error">{boothsError}</p>}
      {!boothsLoading && !boothsError && myBooths.length === 0 && (
        <p className="lead-empty">참가 확정된 부스가 없어 QR 리드 기능을 사용할 수 없습니다.</p>
      )}

      {!boothsLoading && !boothsError && myBooths.length > 0 && boothId == null && (
        <main className="lead-container">
          <section className="lead-booth-list">
            <div className="lead-list__head">부스 선택</div>
            {myBooths.map((booth) => (
              <button
                key={booth.boothId}
                type="button"
                className="lead-booth-row"
                onClick={() => setBoothId(booth.boothId)}
              >
                <span className="lead-booth-row__expo">{booth.expoTitle}</span>
                <span className="lead-booth-row__no">{booth.boothNo}</span>
              </button>
            ))}
          </section>
        </main>
      )}

      {!boothsLoading && !boothsError && selectedBooth && (
        <main className="lead-container">
          <button type="button" className="lead-back" onClick={backToBoothList}>
            ← 부스 다시 선택
          </button>
          <div className="lead-current-booth">{selectedBooth.expoTitle} · {selectedBooth.boothNo}</div>

          <section className="lead-scan">
            <button type="button" className="lead-scan__button" onClick={openScanModal}>
              QR 스캔
            </button>
          </section>

          <section className="lead-list">
            <button type="button" className="lead-list__toggle" onClick={() => setLeadListOpen((v) => !v)}>
              <span className="lead-list__head">리드 목록 <span>{leads.length}</span>건</span>
              <span className="lead-list__chevron">{leadListOpen ? '▲' : '▼'}</span>
            </button>
            {leadListOpen && (
              <>
                {leads.length === 0 && <p className="lead-empty">아직 스캔한 리드가 없습니다.</p>}
                {leads.map((lead) => (
                <div key={lead.leadId} className="lead-row" onClick={() => openLead(lead)}>
                  <div>
                    <span className="lead-row__name">{lead.customerName}</span>
                    <span className="lead-row__email">{lead.customerEmail}</span>
                  </div>
                  <span className="lead-row__date">{fmtDateTime(lead.createdAt)}</span>
                  <span className={`lead-badge lead-badge--${lead.status.toLowerCase()}`}>
                    {STATUS_LABEL[lead.status]}
                  </span>
                </div>
              ))}
              </>
            )}
          </section>
        </main>
      )}

      {scanModalOpen && (
        <div className="lead-drawer-backdrop" onClick={closeScanModal}>
          <div className="lead-scan-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lead-drawer__close lead-scan-modal__close" onClick={closeScanModal} aria-label="닫기">×</button>

            <h2 className="lead-scan-modal__title">방문 등록 QR 코드를 스캔해주세요</h2>
            <p className="lead-scan-modal__sub">
              사전 발급받으신 모바일 출입증 QR 코드를 카메라에 비추거나, 캡처된 QR 이미지 파일을 직접 업로드하세요.
            </p>

            <div
              className={`lead-viewfinder ${dragOver ? 'is-dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <span className="lead-viewfinder__corner lead-viewfinder__corner--tl" />
              <span className="lead-viewfinder__corner lead-viewfinder__corner--tr" />
              <span className="lead-viewfinder__corner lead-viewfinder__corner--bl" />
              <span className="lead-viewfinder__corner lead-viewfinder__corner--br" />

              <video ref={videoRef} className="lead-camera__video" hidden={!cameraOn} muted playsInline />

              {!cameraOn && (
                <div className="lead-viewfinder__hint">
                  <div className="lead-viewfinder__hint-icon">▦</div>
                  <p>QR 코드를 가이드 영역 안에 맞춰주세요</p>
                  <p className="lead-viewfinder__hint-sub">자동으로 초점을 조절하여 인식합니다</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} hidden />

            <div className="lead-scan-options">
              <button type="button" className="lead-scan-option" onClick={cameraOn ? stopCamera : startCamera}>
                <span className="lead-scan-option__icon">🎥</span>
                <span className="lead-scan-option__title">{cameraOn ? '카메라 끄기' : '카메라로 스캔 →'}</span>
                <span className="lead-scan-option__desc">실시간 웹캠/키오스크 카메라 사용</span>
                <span className="lead-scan-option__badge">{cameraOn ? '스캔 중' : '카메라 렌즈 준비됨'}</span>
              </button>

              <label className="lead-scan-option">
                <span className="lead-scan-option__icon">⬆️</span>
                <span className="lead-scan-option__title">QR 이미지 업로드 📎</span>
                <span className="lead-scan-option__desc">저장된 캡처본, 이미지 파일 (PNG, JPG)</span>
                <span className="lead-scan-option__badge">드래그 앤 드롭 지원</span>
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
            </div>

            <div className="lead-scan-modal__drop-hint">
              ⤢ 또는 이미지를 화면으로 직접 드래그앤드롭하여 즉시 인식할 수 있습니다
            </div>

            {scanning && <p className="lead-scan-status">확인 중...</p>}
            {cameraError && <p className="lead-error">{cameraError}</p>}
            {scanError && <p className="lead-error">{scanError}</p>}
          </div>
        </div>
      )}

      {selected && (
        <div className="lead-drawer-backdrop" onClick={closeLead}>
          <div className="lead-drawer-group" onClick={(e) => e.stopPropagation()}>
          <aside className="lead-drawer">
            <div className="lead-drawer__head">
              <div>
                <h2>{selected.customerName}</h2>
                <p>{selected.customerEmail || '이메일 없음'}</p>
              </div>
              <button type="button" className="lead-drawer__close" onClick={closeLead} aria-label="닫기">×</button>
            </div>

            {actionError && <p className="lead-error">{actionError}</p>}

            <div className="lead-drawer__body">
              <section className="lead-detail-section">
                <div className="lead-detail-title">상담 예약 정보</div>
                <div className="lead-detail-box">
                  <div className="lead-detail-row"><span className="lead-label">고객</span><span className="lead-value">{selected.customerName}</span></div>
                  <div className="lead-detail-row"><span className="lead-label">방문일</span><span className="lead-value">{fmtDate(selected.visitDate)}</span></div>
                  <div className="lead-detail-row"><span className="lead-label">QR 스캔 일시</span><span className="lead-value">{fmtDateTime(selected.createdAt)}</span></div>
                  <div className="lead-detail-row"><span className="lead-label">진행 상태</span><span className="lead-value">{STATUS_LABEL[selected.status]}</span></div>
                </div>
              </section>

              <section className="lead-detail-section">
                <div className="lead-detail-title">고객 이메일 {selected.customerEmail ? '수정' : '입력'}</div>
                {!selected.customerEmail && (
                  <p className="lead-empty">등록된 이메일이 없습니다. 현장에서 확인해 직접 입력해주세요.</p>
                )}
                <div className="lead-email-input-row">
                  <input
                    type="email"
                    className="lead-email-input"
                    placeholder="customer@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lead-btn lead-btn--ai"
                    disabled={!emailInput.trim() || emailInput.trim() === selected.customerEmail || savingEmail}
                    onClick={handleSaveEmail}
                  >
                    {savingEmail ? '저장 중...' : '저장'}
                  </button>
                </div>
              </section>

              {!selected.leadConsent && (
                <p className="lead-error">고객이 연락처 제공에 동의하지 않아 이메일 작성·발송을 할 수 없습니다.</p>
              )}

              <section className="lead-detail-section">
                <div className="lead-detail-title lead-detail-title--row">
                  상담 메모
                  <button type="button" className="lead-expand-btn" onClick={() => setExpandField('note')}>
                    크게 보기
                  </button>
                </div>
                <textarea
                  className="lead-textarea lead-textarea--memo"
                  rows={10}
                  placeholder="현장에서 나눈 상담 내용을 자유롭게 적어주세요"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={selected.status === 'SENT' || !selected.leadConsent}
                />
                <button
                  type="button"
                  className="lead-btn lead-btn--ai"
                  disabled={!note.trim() || summarizing || selected.status === 'SENT' || !selected.leadConsent}
                  onClick={handleSummarize}
                >
                  {summarizing ? 'AI 요약 생성 중...' : 'AI 요약 생성'}
                </button>
              </section>

              {draft && (
                <section className="lead-detail-section">
                  <div className="lead-detail-title lead-detail-title--row">
                    고객 발송용 이메일 초안 (수정 가능)
                    <button type="button" className="lead-expand-btn" onClick={() => setExpandField('draft')}>
                      크게 보기
                    </button>
                  </div>
                  <textarea
                    className="lead-textarea"
                    rows={8}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={selected.status === 'SENT' || !selected.leadConsent}
                  />
                </section>
              )}
            </div>

            <div className="lead-drawer__actions">
              {selected.status === 'SENT' ? (
                <p className="lead-drawer__done-note">이미 발송된 리드입니다.</p>
              ) : (
                <button
                  type="button"
                  className="lead-btn lead-btn--send"
                  disabled={!draft.trim() || sending || !selected.leadConsent || !selected.customerEmail}
                  onClick={handleSend}
                >
                  {sending ? '발송 중...' : '고객에게 발송'}
                </button>
              )}
            </div>
          </aside>

          {expandField && (
            <aside className="lead-expand-panel">
              <div className="lead-expand-panel__head">
                <h3>{expandField === 'note' ? '상담 메모 (크게 보기)' : '이메일 초안 (크게 보기)'}</h3>
                <button type="button" className="lead-drawer__close" onClick={() => setExpandField(null)} aria-label="닫기">×</button>
              </div>
              <textarea
                className="lead-textarea lead-textarea--expanded"
                value={expandField === 'note' ? note : draft}
                onChange={(e) => (expandField === 'note' ? setNote(e.target.value) : setDraft(e.target.value))}
                disabled={selected.status === 'SENT'}
                autoFocus
              />
            </aside>
          )}
          </div>
        </div>
      )}

      {scanResult && (
        <div className="lead-drawer-backdrop" onClick={() => { setScanResult(null); setConsentChecked(false); openScanModal(); }}>
          <div className="lead-scan-result-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lead-drawer__close lead-scan-result-card__close"
              onClick={() => { setScanResult(null); setConsentChecked(false); openScanModal(); }}
              aria-label="닫기"
            >
              ×
            </button>
            <div className="lead-scan-result-card__icon">✓</div>
            <h2 className="lead-scan-result-card__title">방문 확인 완료</h2>
            <div className="lead-detail-box">
              <div className="lead-detail-row"><span className="lead-label">고객</span><span className="lead-value">{scanResult.customerName}</span></div>
              <div className="lead-detail-row"><span className="lead-label">구분</span><span className="lead-value">{scanResult.isConsultation ? '상담 신청 고객' : '방문자(워크인)'}</span></div>
              <div className="lead-detail-row"><span className="lead-label">방문일</span><span className="lead-value">{fmtDate(scanResult.visitDate)}</span></div>
              <div className="lead-detail-row"><span className="lead-label">스캔 일시</span><span className="lead-value">{fmtDateTime(scanResult.scannedAt)}</span></div>
            </div>

            {!scanResult.isConsultation && (
              <>
                <label className="lead-scan-result-card__consent">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    disabled={confirmingVisit}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                  />
                  <span>부스 방문 시 연락처 제공에 동의함</span>
                </label>
                {scanError && <p className="lead-error">{scanError}</p>}
                <button
                  type="button"
                  className="lead-scan-result-card__confirm-btn"
                  disabled={confirmingVisit}
                  onClick={handleConfirmVisit}
                >
                  {confirmingVisit ? '처리 중...' : '방문 확인'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadCapture;
