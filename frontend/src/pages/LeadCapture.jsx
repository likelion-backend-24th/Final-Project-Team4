import jsQR from 'jsqr';
import { ArrowLeft, Camera, Check, ChevronDown, ChevronUp, Maximize2, QrCode, ScanLine, Search, Send, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  confirmLeadConsent,
  getLeads,
  getMyBooths,
  scanLeadQr,
  sendLeadInfo,
  summarizeLeadEmail,
  updateLeadEmail,
} from '../api/leads';
import { boothNoValue } from '../utils/exhibitorGroups';
import { EmptyState, PageContainer, PageHero } from '@/components/layout/Page';
import { AppDialog, InfoList } from '@/components/layout/AppDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STATUS_LABEL = {
  SCANNED: '연락처 확보',
  DRAFTED: '이메일 초안 생성됨',
  SENT: '발송 완료',
};

const LEAD_STATUS_TONE = {
  SCANNED: 'bg-amber-100 text-amber-700',
  DRAFTED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-emerald-100 text-emerald-700',
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
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // 'YYYY-MM-DD' | ''
  const [dateType, setDateType] = useState('visit'); // 'visit' 방문일 | 'scan' 스캔일
  const [kindFilter, setKindFilter] = useState(''); // '' | 'consultation' | 'walkin'
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

  // 박람회 선택 목록 - 같은 박람회에 부스가 여러 개면 하나로 묶고, 대표 부스(번호가 가장 낮은 부스) 기준으로 리드를 확보한다.
  // 상담 신청이 참가업체(부스 여러 개 전부) 단위로 들어오기 때문에 어느 부스로 스캔해도 상담 매칭이 되고,
  // 대표 부스 하나로 고정해야 리드/통계가 부스마다 쪼개지지 않는다.
  const boothsByExpo = useMemo(() => {
    const groups = [];
    const indexByExpo = new Map();
    myBooths.forEach((booth) => {
      let group = indexByExpo.get(booth.expoId);
      if (!group) {
        group = { expoId: booth.expoId, expoTitle: booth.expoTitle, booths: [] };
        indexByExpo.set(booth.expoId, group);
        groups.push(group);
      }
      group.booths.push(booth);
    });
    groups.forEach((g) => g.booths.sort((a, b) => boothNoValue(a.boothNo) - boothNoValue(b.boothNo)));
    return groups;
  }, [myBooths]);


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

  // 리드는 전량 내려받아 화면에서 거름 - 부스당 수천 건까지는 충분. ponytail: 그 이상이면 서버 페이징+쿼리 파라미터로.
  const q = searchText.trim().toLowerCase();
  const filteredLeads = leads.filter(
    (l) =>
      (!q || l.customerName?.toLowerCase().includes(q) || l.customerEmail?.toLowerCase().includes(q)) &&
      (!dateFilter || (dateType === 'visit' ? l.visitDate : l.createdAt?.slice(0, 10)) === dateFilter) &&
      (!kindFilter || (kindFilter === 'consultation') === !!l.consultationId),
  );
  const hasFilter = searchText || dateFilter || kindFilter;

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

  const selectedBooth = myBooths.find((b) => b.boothId === boothId) ?? null;
  // 화면 상단에는 대표 부스 번호 하나가 아니라, 선택한 박람회의 부스 전부를 보여준다.
  const selectedGroup = selectedBooth ? boothsByExpo.find((g) => g.expoId === selectedBooth.expoId) : null;
  const selectedBoothNoLabel = selectedGroup ? selectedGroup.booths.map((b) => b.boothNo).join(', ') : '';

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITOR LEAD CAPTURE"
        title="QR 리드 확보"
        description="고객 QR을 스캔해 연락처를 확보하고, 상담 내용을 AI로 정리해 이메일로 보낼 수 있습니다."
      />

      <PageContainer size="md">
        {boothsLoading && <EmptyState>내 부스 목록을 불러오는 중...</EmptyState>}
        {!boothsLoading && boothsError && <EmptyState tone="error">{boothsError}</EmptyState>}
        {!boothsLoading && !boothsError && myBooths.length === 0 && (
          <EmptyState>참가 확정된 부스가 없어 QR 리드 기능을 사용할 수 없습니다.</EmptyState>
        )}

        {!boothsLoading && !boothsError && myBooths.length > 0 && boothId == null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">박람회 선택</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {boothsByExpo.map((group) => (
                <Button
                  key={group.expoId}
                  type="button"
                  variant="outline"
                  className="h-auto justify-between px-4 py-3"
                  onClick={() => setBoothId(group.booths[0].boothId)}
                >
                  <span>{group.expoTitle}</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {group.booths.map((booth) => (
                      <Badge key={booth.boothId} variant="secondary">
                        {booth.boothNo}
                      </Badge>
                    ))}
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {!boothsLoading && !boothsError && selectedBooth && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={backToBoothList}>
                <ArrowLeft /> 부스 다시 선택
              </Button>
              <p className="m-0 text-sm font-medium text-muted-foreground">
                {selectedBooth.expoTitle} · {selectedBoothNoLabel}
              </p>
            </div>

            <Button type="button" size="lg" className="h-14 text-base" onClick={openScanModal}>
              <ScanLine /> QR 스캔
            </Button>

            <Card>
              <CardHeader>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-left"
                  onClick={() => setLeadListOpen((v) => !v)}
                >
                  <CardTitle className="text-base">
                    리드 목록 <span className="text-primary">{filteredLeads.length}</span>
                    {filteredLeads.length !== leads.length && ` / ${leads.length}`}건
                  </CardTitle>
                  {leadListOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
              </CardHeader>

              {leadListOpen && (
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="relative w-full">
                      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        className="h-10 pl-8"
                        placeholder="고객 이름 또는 이메일 검색"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                    <Select value={dateType} onValueChange={setDateType}>
                      <SelectTrigger className="h-10 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visit">방문일</SelectItem>
                        <SelectItem value="scan">스캔일</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" className="h-10 w-44" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    <Select value={kindFilter || 'all'} onValueChange={(v) => setKindFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-10 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 구분</SelectItem>
                        <SelectItem value="consultation">상담 신청 고객</SelectItem>
                        <SelectItem value="walkin">워크인</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasFilter && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10"
                        onClick={() => {
                          setSearchText('');
                          setDateFilter('');
                          setKindFilter('');
                        }}
                      >
                        <X /> 초기화
                      </Button>
                    )}
                  </div>

                  {leads.length === 0 && <EmptyState className="my-2">아직 스캔한 리드가 없습니다.</EmptyState>}
                  {leads.length > 0 && filteredLeads.length === 0 && <EmptyState className="my-2">조건에 맞는 리드가 없습니다.</EmptyState>}

                  <div className="divide-y">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.leadId}
                        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-1 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_170px_auto]"
                        onClick={() => openLead(lead)}
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{lead.customerName}</span>
                          <span className="block truncate text-xs text-muted-foreground">{lead.customerEmail}</span>
                        </div>
                        <div className="hidden grid-cols-[44px_auto] gap-x-1.5 text-xs text-muted-foreground sm:grid">
                          <span>방문일:</span>
                          <span>{fmtDate(lead.visitDate)}</span>
                          <span>스캔일:</span>
                          <span>{fmtDateTime(lead.createdAt)}</span>
                        </div>
                        <Badge variant="secondary" className={LEAD_STATUS_TONE[lead.status]}>
                          {STATUS_LABEL[lead.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </PageContainer>

      {scanModalOpen && (
        <AppDialog
          onClose={closeScanModal}
          size="md"
          title="방문 등록 QR 코드를 스캔해주세요"
          description="사전 발급받으신 모바일 출입증 QR 코드를 카메라에 비추거나, 캡처된 QR 이미지 파일을 직접 업로드하세요."
        >
          <div
            className={cn(
              'relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition-colors',
              dragOver && 'border-primary bg-primary/5'
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <video ref={videoRef} className="size-full object-cover" hidden={!cameraOn} muted playsInline />
            {!cameraOn && (
              <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
                <QrCode className="size-10" />
                <p className="m-0 text-sm font-medium">QR 코드를 가이드 영역 안에 맞춰주세요</p>
                <p className="m-0 text-xs">자동으로 초점을 조절하여 인식합니다</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} hidden />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-auto flex-col gap-1 py-3" onClick={cameraOn ? stopCamera : startCamera}>
              <Camera className="size-5" />
              <span className="font-semibold">{cameraOn ? '카메라 끄기' : '카메라로 스캔'}</span>
              <span className="text-xs font-normal text-muted-foreground">실시간 웹캠/키오스크 카메라 사용</span>
            </Button>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border bg-background px-3 py-3 text-center shadow-xs transition-colors hover:bg-muted">
              <Upload className="size-5" />
              <span className="text-sm font-semibold">QR 이미지 업로드</span>
              <span className="text-xs text-muted-foreground">저장된 캡처본, 이미지 파일 (PNG, JPG)</span>
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </label>
          </div>
          <p className="m-0 text-center text-xs text-muted-foreground">
            또는 이미지를 화면으로 직접 드래그앤드롭하여 즉시 인식할 수 있습니다
          </p>

          {scanning && <p className="m-0 text-center text-sm text-muted-foreground">확인 중...</p>}
          {cameraError && <p className="m-0 text-sm text-destructive">{cameraError}</p>}
          {scanError && <p className="m-0 text-sm text-destructive">{scanError}</p>}
        </AppDialog>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && closeLead()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader className="border-b p-5">
                <SheetTitle className="text-lg">{selected.customerName}</SheetTitle>
                <SheetDescription>{selected.customerEmail || '이메일 없음'}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                {actionError && <p className="m-0 text-sm text-destructive">{actionError}</p>}

                <section>
                  <h3 className="m-0 mb-2 text-sm font-semibold">상담 예약 정보</h3>
                  <dl className="m-0 divide-y rounded-lg border bg-muted/30 text-sm">
                    {[
                      ['고객', selected.customerName],
                      ['방문일', fmtDate(selected.visitDate)],
                      ['QR 스캔 일시', fmtDateTime(selected.createdAt)],
                      ['진행 상태', STATUS_LABEL[selected.status]],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 px-3 py-2">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="m-0 font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <h3 className="m-0 mb-2 text-sm font-semibold">고객 이메일 {selected.customerEmail ? '수정' : '입력'}</h3>
                  {!selected.customerEmail && (
                    <p className="m-0 mb-2 text-xs text-muted-foreground">등록된 이메일이 없습니다. 현장에서 확인해 직접 입력해주세요.</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      className="h-10"
                      placeholder="customer@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      className="h-10"
                      disabled={!emailInput.trim() || emailInput.trim() === selected.customerEmail || savingEmail}
                      onClick={handleSaveEmail}
                    >
                      {savingEmail ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </section>

                {!selected.leadConsent && (
                  <Alert variant="destructive">
                    <AlertDescription>고객이 연락처 제공에 동의하지 않아 이메일 작성·발송을 할 수 없습니다.</AlertDescription>
                  </Alert>
                )}

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 text-sm font-semibold">상담 메모</h3>
                    <Button type="button" variant="ghost" size="xs" className="text-primary" onClick={() => setExpandField('note')}>
                      <Maximize2 /> 크게 보기
                    </Button>
                  </div>
                  <Textarea
                    rows={8}
                    placeholder="현장에서 나눈 상담 내용을 자유롭게 적어주세요"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={selected.status === 'SENT' || !selected.leadConsent}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit border-primary text-primary"
                    disabled={!note.trim() || summarizing || selected.status === 'SENT' || !selected.leadConsent}
                    onClick={handleSummarize}
                  >
                    <Sparkles /> {summarizing ? 'AI 요약 생성 중...' : 'AI 요약 생성'}
                  </Button>
                </section>

                {draft && (
                  <section className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="m-0 text-sm font-semibold">고객 발송용 이메일 초안 (수정 가능)</h3>
                      <Button type="button" variant="ghost" size="xs" className="text-primary" onClick={() => setExpandField('draft')}>
                        <Maximize2 /> 크게 보기
                      </Button>
                    </div>
                    <Textarea
                      rows={10}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={selected.status === 'SENT' || !selected.leadConsent}
                    />
                  </section>
                )}
              </div>

              <SheetFooter className="border-t p-5">
                {selected.status === 'SENT' ? (
                  <p className="m-0 text-center text-sm text-muted-foreground">이미 발송된 리드입니다.</p>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    disabled={!draft.trim() || sending || !selected.leadConsent || !selected.customerEmail}
                    onClick={handleSend}
                  >
                    <Send /> {sending ? '발송 중...' : '고객에게 발송'}
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {expandField && (
        <AppDialog
          onClose={() => setExpandField(null)}
          size="lg"
          title={expandField === 'note' ? '상담 메모 (크게 보기)' : '이메일 초안 (크게 보기)'}
          className="sm:h-[80vh]"
        >
          <Textarea
            autoFocus
            className="min-h-64 flex-1 resize-none"
            value={expandField === 'note' ? note : draft}
            onChange={(e) => (expandField === 'note' ? setNote(e.target.value) : setDraft(e.target.value))}
            disabled={selected?.status === 'SENT'}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={() => setExpandField(null)}>
              완료
            </Button>
          </div>
        </AppDialog>
      )}

      {scanResult && (
        <AppDialog
          onClose={() => {
            setScanResult(null);
            setConsentChecked(false);
            openScanModal();
          }}
          icon={<Check />}
          title="방문 확인 완료"
          centered
        >
          <InfoList
            items={[
              { label: '고객', value: scanResult.customerName },
              { label: '구분', value: scanResult.isConsultation ? '상담 신청 고객' : '방문자(워크인)' },
              { label: '방문일', value: fmtDate(scanResult.visitDate) },
              { label: '스캔 일시', value: fmtDateTime(scanResult.scannedAt) },
            ]}
          />
          {!scanResult.isConsultation && (
            <>
              <Label className="cursor-pointer font-normal">
                <Checkbox checked={consentChecked} disabled={confirmingVisit} onCheckedChange={(v) => setConsentChecked(v === true)} />
                부스 방문 시 연락처 제공에 동의함
              </Label>
              {scanError && <p className="m-0 text-sm text-destructive">{scanError}</p>}
              <Button type="button" size="lg" disabled={confirmingVisit} onClick={handleConfirmVisit}>
                {confirmingVisit ? '처리 중...' : '방문 확인'}
              </Button>
            </>
          )}
        </AppDialog>
      )}
    </div>
  );
}

export default LeadCapture;
