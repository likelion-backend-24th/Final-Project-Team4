import { CalendarDays, ChevronDown, ChevronUp, FileText, MapPin, QrCode, Ticket, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import QrPlaceholder from '../../components/customer/QrPlaceholder';
import ConsultationDetailModal from '../../components/customer/ConsultationDetailModal';
import TicketActionsMenu from '../../components/customer/TicketActionsMenu';
import PaymentDetailModal from '../../components/customer/PaymentDetailModal';
import RefundRequestModal from '../../components/customer/RefundRequestModal';
import VisitedBoothsModal from '../../components/customer/VisitedBoothsModal';
import ReviewWriteModal from '../../components/customer/ReviewWriteModal';
import WritableReviewsModal from '../../components/customer/WritableReviewsModal';
import { getTicketStatus, isReviewWindowOpen, isTicketCheckableToday, isTicketRefundable, toDisplayTicket } from '../../utils/customerData';
import { getMyReservations } from '../../api/reservation';
import { deleteBoothReview, getCustomerExpoList, getMyConsultations, getMyReviews, toAssetUrl } from '../../api/expo';
import { getMyProfile, withdrawAccount, updateMyProfile } from '../../api/identity';
import { clearAuth, notifyProfileUpdated } from '../../api/auth';
import { downloadTicketImage } from '../../utils/downloadImage';
import { formatPhoneNumber } from '../../utils/phone';
import { TextField } from '../../components/form/fields';
import { AppDialog } from '@/components/layout/AppDialog';
import { EmptyState, PageContainer, Pagination } from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: '내정보' },
  { key: 'tickets', label: '나의 입장권' },
  { key: 'consultations', label: '예약한 상담' },
];

const REVIEW_TYPE_LABEL = { CONSULT: '상담후기', BOOTH: '부스후기' };
const REVIEWS_PER_PAGE = 4;
const UPCOMING_PREVIEW = 3;

// 상태는 저장된 값이 아니라 매번 계산(getTicketStatus)
// 사용완료 = 입장 체크(체크인)를 마침, 환불 = 결제 취소로 QR이 무효화됨, 만료 = 체크인 없이 박람회 기간만 끝남
const TICKET_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '사용예정', label: '사용예정' },
  { key: '사용가능', label: '사용가능' },
  { key: '사용완료', label: '사용완료' },
  { key: '환불', label: '환불' },
  { key: '만료', label: '만료' },
];

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');
const fmtDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ').replace(/-/g, '.') : '');

const CONSULTATION_STATUS_LABEL = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소함',
  COMPLETED: '상담 완료',
  NO_SHOW: '미방문',
};
const CONSULTATION_STATUS_BADGE = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
};
const TICKET_STATUS_BADGE = {
  사용예정: 'bg-blue-100 text-blue-700',
  사용가능: 'bg-emerald-100 text-emerald-700',
  사용완료: 'bg-slate-100 text-slate-600',
  환불: 'bg-red-100 text-red-700',
  만료: 'bg-slate-100 text-slate-500',
};
const ACTIVE_CONSULTATION_STATUSES = new Set(['REQUESTED', 'APPROVED']);
const CONSULTATION_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '대기', label: '대기' },
  { key: '승인', label: '승인' },
  { key: '반려', label: '반려' },
  { key: '취소함', label: '취소함' },
  { key: '상담 완료', label: '상담 완료' },
  { key: '미방문', label: '미방문' },
];
const consultationTypeLabel = (c) => [c.wantsPurchase && '구매', c.wantsTestDrive && '시승'].filter(Boolean).join(' + ');

function CustomerMyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('전체');
  const [consultFilter, setConsultFilter] = useState('전체');
  const [zoomTicket, setZoomTicket] = useState(null);
  const [expandedExpoIds, setExpandedExpoIds] = useState(() => new Set()); // 사용예정 QR을 모두 펼친 박람회
  const [paymentDetailTicket, setPaymentDetailTicket] = useState(null);
  const [refundTicket, setRefundTicket] = useState(null);
  const [apiTickets, setApiTickets] = useState([]);
  const [expoMap, setExpoMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [consultLoading, setConsultLoading] = useState(true);
  const [consultError, setConsultError] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [reviewExpoId, setReviewExpoId] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [showWritableReviews, setShowWritableReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);

  // 실제 Reservation 서비스(GET /api/customer/reservations)에서 내 입장권 목록 조회.
  // 티켓 응답엔 expoId만 있어서, 이름/장소/기간 표시는 실제 Expo 서비스(GET /api/customer/expos)를
  // 같이 조회해 expoId로 매칭해야 함 — 안 그러면 QR이 발급된 실제 박람회와 화면에 뜨는 이름이 어긋난다.
  // 환불 처리 후에도 이 함수를 다시 불러 목록을 새로고침한다(RefundRequestModal의 onRefunded).
  const loadTickets = () =>
    Promise.all([getMyReservations(), getCustomerExpoList({ page: 0, size: 100 })])
      .then(([tickets, expoRes]) => {
        setApiTickets(tickets);
        setExpoMap(new Map(expoRes.content.map((e) => [e.expoId, e])));
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(
          err.response?.data?.error?.message ?? '입장권 목록을 불러오지 못했습니다.'
        );
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    loadTickets();
  }, []);

  // 티켓 표시용 홀더명은 로그인한 본인 이름(profile.name)을 써야 함 — QR/티켓 카드에
  // 실제 발급받은 사람이 아닌 고정값이 보이면 안 되므로 profile 로딩 완료 후에 채워 넣는다.
  const rawTickets = useMemo(
    () => apiTickets.map((t) => toDisplayTicket(t, expoMap, profile?.name)),
    [apiTickets, expoMap, profile]
  );

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setProfileError(null);
      })
      .catch((err) =>
        setProfileError(err.response?.data?.error?.message ?? '내 정보를 불러오지 못했습니다.')
      );
  }, []);

  const loadConsultations = () =>
    getMyConsultations()
      .then((data) => {
        setConsultations(data);
        setConsultError(null);
      })
      .catch((err) =>
        setConsultError(err.response?.data?.error?.message ?? '상담 신청 내역을 불러오지 못했습니다.')
      )
      .finally(() => setConsultLoading(false));

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadMyReviews = () =>
    getMyReviews()
      .then((data) => {
        setMyReviews(data);
        setReviewError(null);
      })
      .catch((err) => setReviewError(err.response?.data?.error?.message ?? '작성한 후기를 불러오지 못했습니다.'))
      .finally(() => setReviewLoading(false));

  useEffect(() => {
    loadMyReviews();
  }, []);

  // 후기는 상담이 완료된 부스에만 쓸 수 있으므로, 내 상담 내역(boothId)과 매칭하면 어느 업체에 쓴 후기인지 알 수 있다.
  const boothInfoById = useMemo(
    () => new Map(consultations.map((c) => [c.boothId, { companyName: c.companyName, expoTitle: c.expoTitle }])),
    [consultations]
  );

  const handleDeleteReview = async (review) => {
    if (!window.confirm('이 후기를 삭제하시겠습니까? 삭제한 후기는 복구할 수 없습니다.')) return;
    try {
      await deleteBoothReview(review.boothId, review.reviewId);
      loadMyReviews();
    } catch (err) {
      window.alert(err.response?.data?.error?.message ?? '후기 삭제 중 오류가 발생했습니다.');
    }
  };

  const allTickets = rawTickets.map((t) => ({ ...t, _status: getTicketStatus(t) }));
  // 회원 탈퇴 모달 "미사용 유료 입장권이 있습니다" 안내 노출 조건 - 환불 신청이 가능한 티켓과 같은 기준.
  const hasUnusedPaidTicket = allTickets.some((t) => isTicketRefundable(t));
  // 전체 탭엔 지금 쓸 수 있는 QR만 - 만료/환불은 숨기고, 사용완료는 체크인한 당일(=방문일)까지만 보여준다.
  // 체크인은 방문일 당일에만 되므로 "방문일이 오늘"이면 오늘 사용완료한 것. 다음날부턴 사용완료 탭에서만 보인다.
  const isActiveInAll = (t) =>
    t._status === '사용예정' || t._status === '사용가능' || (t._status === '사용완료' && isTicketCheckableToday(t));
  const tickets =
    ticketFilter === '전체' ? allTickets.filter(isActiveInAll) : allTickets.filter((t) => t._status === ticketFilter);
   const upcomingCount = allTickets.filter((t) => t._status === '사용예정').length;
  const availableCount = allTickets.filter((t) => t._status === '사용가능').length;
  const usedCount = allTickets.filter((t) => t._status === '사용완료').length;
  const refundedCount = allTickets.filter((t) => t._status === '환불').length;
  const expiredCount = allTickets.filter((t) => t._status === '만료').length;
  const filterCount = {
    사용예정: upcomingCount,
    사용가능: availableCount,
    사용완료: usedCount,
    환불: refundedCount,
    만료: expiredCount,
  };

  // 같은 박람회에 여러 날짜로 신청하면 박람회명/기간/장소가 카드마다 반복되던 걸 방지하기 위해
  // expoId 기준으로 묶는다. "오늘 체크인 가능한 QR"이 있는 박람회를 맨 위로 올려서
  // 현장에서 QR을 찾으러 스크롤하지 않아도 되게 함.
  const groupedTickets = useMemo(() => {
    const groups = new Map();
    tickets.forEach((t) => {
      if (!groups.has(t.expoId)) {
        groups.set(t.expoId, {
          expoId: t.expoId,
          expoTitle: t.expoTitle,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          venue: t.venue,
          items: [],
        });
      }
      groups.get(t.expoId).items.push(t);
    });

    return Array.from(groups.values())
      .map((g) => {
        const sorted = g.items.sort((a, b) => (a.visitDate ?? '').localeCompare(b.visitDate ?? ''));
        // 사용예정 QR은 박람회당 UPCOMING_PREVIEW개(방문일 빠른 순)까지만 보여주고 나머진 "펼치기"로.
        const upcomingIds = sorted.filter((t) => t._status === '사용예정').map((t) => t.id);
        const collapsed = !expandedExpoIds.has(g.expoId);
        const hiddenIds = new Set(collapsed ? upcomingIds.slice(UPCOMING_PREVIEW) : []);
        return {
          ...g,
          items: sorted.filter((t) => !hiddenIds.has(t.id)),
          hiddenUpcomingCount: hiddenIds.size,
          canCollapse: upcomingIds.length > UPCOMING_PREVIEW,
          hasToday: g.items.some((t) => t._status === '사용가능' && isTicketCheckableToday(t)),
        };
      })
      .sort((a, b) => {
        if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1;
        return (a.items[0]?.visitDate ?? '').localeCompare(b.items[0]?.visitDate ?? '');
      });
  }, [tickets, expandedExpoIds]);

  const toggleExpoExpanded = (expoId) =>
    setExpandedExpoIds((prev) => {
      const next = new Set(prev);
      if (next.has(expoId)) next.delete(expoId);
      else next.add(expoId);
      return next;
    });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawAgreed, setWithdrawAgreed] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const editForm = useForm({ defaultValues: { name: '', contact: '' } });

  const openEditModal = () => {
    editForm.reset({ name: profile.name ?? '', contact: profile.contact ?? '' });
    setSaveError(null);
    setShowEditModal(true);
  };

  const handleSaveProfile = async (values) => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateMyProfile(values);
      setProfile(updated);
      notifyProfileUpdated();
      setShowEditModal(false);
    } catch (err) {
      setSaveError(err.response?.data?.error?.message ?? '정보 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await withdrawAccount();
    } catch (err) {
      setWithdrawError(err.response?.data?.error?.message ?? '탈퇴 처리 중 오류가 발생했습니다.');
      setWithdrawing(false);
      return;
    }
    clearAuth();
    navigate('/login');
  };

  // 탈퇴 모달의 "입장권 확인하기" - 모달을 닫고 나의 입장권 탭으로 바로 이동.
  const goToTicketsFromWithdrawModal = () => {
    setShowWithdrawModal(false);
    setTab('tickets');
  };
  // 삭제로 마지막 페이지가 비어도 화면이 비지 않게 현재 페이지를 총 페이지 수로 제한한다.
  const reviewTotalPages = Math.max(1, Math.ceil(myReviews.length / REVIEWS_PER_PAGE));
  const currentReviewPage = Math.min(reviewPage, reviewTotalPages);
  const pagedReviews = myReviews.slice((currentReviewPage - 1) * REVIEWS_PER_PAGE, currentReviewPage * REVIEWS_PER_PAGE);

  const consultationsWithLabel = consultations.map((c) => ({ ...c, _statusLabel: CONSULTATION_STATUS_LABEL[c.status] ?? c.status }));
  // 전체 탭엔 앞으로 진행될 상담(대기/승인)만 - 반려·취소·완료·미방문은 숨기고, 대기/승인이라도 방문 희망 일시가 지나면 숨긴다.
  const isUpcomingConsultation = (c) =>
    ACTIVE_CONSULTATION_STATUSES.has(c.status) &&
    new Date(`${c.preferredDate}T${c.preferredTime ?? '23:59:59'}`).getTime() >= Date.now();
  const filteredConsultations =
    consultFilter === '전체'
      ? consultationsWithLabel.filter(isUpcomingConsultation)
      : consultationsWithLabel.filter((c) => c._statusLabel === consultFilter);
  const consultFilterCount = {
    대기: consultationsWithLabel.filter((c) => c._statusLabel === '대기').length,
    승인: consultationsWithLabel.filter((c) => c._statusLabel === '승인').length,
    반려: consultationsWithLabel.filter((c) => c._statusLabel === '반려').length,
    취소함: consultationsWithLabel.filter((c) => c._statusLabel === '취소함').length,
    '상담 완료': consultationsWithLabel.filter((c) => c._statusLabel === '상담 완료').length,
    미방문: consultationsWithLabel.filter((c) => c._statusLabel === '미방문').length,
  };

  return (
    <PageContainer size="lg">
      <p className="m-0 mb-1 text-xs text-muted-foreground">마이페이지</p>
      <h1 className="m-0 text-3xl font-bold tracking-tight">
        {tab === 'tickets' ? '나의 입장권' : TABS.find((t) => t.key === tab)?.label}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {tab === 'tickets'
          ? '구매한 입장권과 QR을 다시 확인할 수 있습니다.'
          : tab === 'profile'
          ? '회원가입 시 등록한 내 기본 정보입니다.'
          : '내 정보와 활동 내역을 확인할 수 있습니다.'}
      </p>

      <div className="grid items-start gap-6 md:grid-cols-[200px_1fr]">
        <aside className="flex gap-1 md:flex-col">
          {TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant={t.key === tab ? 'secondary' : 'ghost'}
              className={cn('justify-start', t.key === tab && 'font-semibold text-primary')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </aside>

        <main className="min-w-0">
          {tab === 'profile' ? (
            <>
              <Card>
                <CardContent className="flex flex-col gap-4">
                  {profileError ? (
                    <EmptyState tone="error">{profileError}</EmptyState>
                  ) : !profile ? (
                    <EmptyState>불러오는 중...</EmptyState>
                  ) : (
                    <dl className="m-0 divide-y">
                      {[
                        ['이름', profile.name ?? '-'],
                        ['이메일 주소', profile.email ?? '-'],
                        ['휴대폰 번호', profile.contact ? formatPhoneNumber(profile.contact) : '-'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-3 text-sm">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="m-0 font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="flex justify-end gap-2">
                    {profile && (
                      <Button type="button" variant="outline" onClick={openEditModal}>
                        정보 수정
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setWithdrawError(null);
                        setShowWithdrawModal(true);
                      }}
                    >
                      회원 탈퇴
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-8 mb-4 flex items-center justify-between">
                <h2 className="m-0 text-lg font-bold">내가 쓴 후기</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowWritableReviews(true)}>
                  후기 쓰러 가기
                </Button>
              </div>

              {reviewLoading ? (
                <EmptyState>불러오는 중...</EmptyState>
              ) : reviewError ? (
                <EmptyState tone="error">{reviewError}</EmptyState>
              ) : myReviews.length === 0 ? (
                <EmptyState>아직 작성한 후기가 없습니다.</EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pagedReviews.map((r) => {
                    // 작성 시점에 저장된 업체명/박람회명을 우선 쓰고, 이 기능 도입 전 후기는 내 상담 내역에서 찾아 보완한다.
                    const fallback = boothInfoById.get(r.boothId);
                    const booth = {
                      companyName: r.companyName || fallback?.companyName,
                      expoTitle: r.expoTitle || fallback?.expoTitle,
                    };
                    return (
                      <Card key={r.reviewId} className="gap-3">
                        <CardContent className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="m-0 truncate text-base font-semibold">{booth.companyName || `${r.boothNo} 부스`}</h3>
                              <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                                {booth.expoTitle && `${booth.expoTitle} · `}
                                {r.boothNo} 부스
                                {r.reviewType === 'CONSULT' && r.vehicleName && ` · ${r.vehicleName}`}
                              </p>
                            </div>
                            <Badge className="shrink-0 bg-emerald-100 text-emerald-700">{REVIEW_TYPE_LABEL[r.reviewType]}</Badge>
                          </div>
                          <p className="m-0 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                          {r.images?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.images.map((img) => (
                                <img
                                  key={img.imageId ?? img.imageUrl}
                                  src={toAssetUrl(img.imageUrl)}
                                  alt="후기 사진"
                                  className="size-16 rounded-md object-cover"
                                />
                              ))}
                            </div>
                          )}
                          <p className="m-0 text-xs text-muted-foreground">작성일 {fmtDateTime(r.createdAt)}</p>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setEditingReview(r)}>
                              수정
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => handleDeleteReview(r)}>
                              삭제
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              <Pagination page={currentReviewPage} totalPages={reviewTotalPages} onChange={setReviewPage} />
            </>
          ) : tab === 'tickets' ? (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {TICKET_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    type="button"
                    size="sm"
                    variant={f.key === ticketFilter ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setTicketFilter(f.key)}
                  >
                    {f.label}
                    {f.key !== '전체' && ` (${filterCount[f.key]})`}
                  </Button>
                ))}
              </div>
              {loading ? (
                <EmptyState>불러오는 중...</EmptyState>
              ) : loadError ? (
                <EmptyState tone="error">{loadError}</EmptyState>
              ) : tickets.length === 0 ? (
                <EmptyState>
                  {ticketFilter === '전체'
                    ? '사용할 수 있는 입장권이 없습니다. 사용완료·환불·만료된 입장권은 각 탭에서 확인하세요.'
                    : `${ticketFilter} 상태인 입장권이 없습니다.`}
                </EmptyState>
              ) : (
                <div className="flex flex-col gap-4">
                  {groupedTickets.map((g) => (
                    <Card key={g.expoId} className={cn('gap-0 py-0', g.hasToday && 'ring-2 ring-primary/40')}>
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b p-4">
                        <div>
                          <h3 className="m-0 text-base font-semibold">{g.expoTitle}</h3>
                          <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            박람회 전체 기간 {fmtDate(g.startsAt)} - {fmtDate(g.endsAt)}
                          </p>
                          <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {g.venue}
                          </p>
                        </div>
                        {g.hasToday && <Badge>오늘 체크인 가능한 QR 있음</Badge>}
                      </div>
                      <div className="divide-y">
                        {g.items.map((t) => {
                          const todayCheckable = t._status === '사용가능' && isTicketCheckableToday(t);
                          const disabledActions = t._status === '만료' || t._status === '환불';
                          return (
                            <div
                              key={t.id}
                              className={cn('flex flex-wrap items-center gap-4 p-4', todayCheckable && 'bg-primary/5')}
                            >
                              <button
                                type="button"
                                className={cn(
                                  'flex size-16 shrink-0 items-center justify-center rounded-lg border bg-white p-1',
                                  disabledActions ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                                )}
                                onClick={() => !disabledActions && setZoomTicket(t)}
                                aria-label="QR 크게 보기"
                              >
                                {t.qrImageBase64 ? (
                                  <img src={`data:image/png;base64,${t.qrImageBase64}`} alt="입장 QR 코드" width={56} height={56} />
                                ) : (
                                  <QrPlaceholder size={56} />
                                )}
                              </button>
                              <div className="min-w-0 flex-1 basis-56">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold">{fmtDate(t.visitDate)}</span>
                                  <Badge variant="secondary" className={TICKET_STATUS_BADGE[t._status]}>
                                    {t._status}
                                  </Badge>
                                  {todayCheckable && <span className="text-xs font-semibold text-primary">오늘 체크인 가능</span>}
                                </div>
                                <p className="m-0 text-xs text-muted-foreground">
                                  {t.holderName} · {t.ticketType}
                                </p>
                                <p className="m-0 text-xs text-muted-foreground">
                                  예매번호 {t.bookingNo} · 구매일 {t.purchasedAt}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button type="button" variant="outline" size="sm" onClick={() => setZoomTicket(t)} disabled={disabledActions}>
                                  QR 크게 보기
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadTicketImage(t, `QR_${t.bookingNo}`)}
                                  disabled={disabledActions}
                                >
                                  이미지 저장
                                </Button>
                                {isReviewWindowOpen(t) && (
                                  <Button type="button" size="sm" onClick={() => setReviewExpoId(t.expoId)}>
                                    후기 작성하러 가기
                                  </Button>
                                )}
                                {t.isPaid && (
                                  <TicketActionsMenu
                                    refundable={isTicketRefundable(t)}
                                    onViewPayment={() => setPaymentDetailTicket(t)}
                                    onRequestRefund={() => setRefundTicket(t)}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {g.canCollapse && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-t-none border-t text-primary"
                          onClick={() => toggleExpoExpanded(g.expoId)}
                        >
                          {g.hiddenUpcomingCount > 0 ? (
                            <>
                              사용예정 {g.hiddenUpcomingCount}개 더 보기 <ChevronDown />
                            </>
                          ) : (
                            <>
                              접기 <ChevronUp />
                            </>
                          )}
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : tab === 'consultations' ? (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {CONSULTATION_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    type="button"
                    size="sm"
                    variant={f.key === consultFilter ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setConsultFilter(f.key)}
                  >
                    {f.label}
                    {f.key !== '전체' && ` (${consultFilterCount[f.key]})`}
                  </Button>
                ))}
              </div>
              {consultLoading ? (
                <EmptyState>불러오는 중...</EmptyState>
              ) : consultError ? (
                <EmptyState tone="error">{consultError}</EmptyState>
              ) : filteredConsultations.length === 0 ? (
                <EmptyState>
                  {consultFilter === '전체'
                    ? '예정된 상담이 없습니다. 지난 상담이나 반려·취소·완료·미방문 건은 각 탭에서 확인하세요.'
                    : `${consultFilter} 상태인 상담이 없습니다.`}
                </EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredConsultations.map((c) => (
                    <button
                      type="button"
                      key={c.consultationId}
                      className="cursor-pointer border-0 bg-transparent p-0 text-left"
                      onClick={() => setSelectedConsultation(c)}
                    >
                      <Card className="h-full gap-2 transition-shadow hover:shadow-md">
                        <CardContent className="flex flex-col gap-1.5">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="m-0 truncate text-base font-semibold">{c.expoTitle}</h3>
                              <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                                {c.companyName || (c.boothNo ? `${c.boothNo} 부스` : '참가업체 정보 없음')}
                                {c.companyName && c.boothNo && ` · ${c.boothNo} 부스`}
                              </p>
                            </div>
                            <Badge variant="secondary" className={cn('shrink-0', CONSULTATION_STATUS_BADGE[c.status])}>
                              {CONSULTATION_STATUS_LABEL[c.status] ?? c.status}
                            </Badge>
                          </div>
                          <p className="m-0 text-sm font-medium">{consultationTypeLabel(c)} 상담</p>
                          <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            희망 일시 {c.preferredDate} {c.preferredTime?.slice(0, 5)}
                          </p>
                          <p className="m-0 text-xs text-muted-foreground">신청일 {fmtDateTime(c.createdAt)}</p>
                          <p className="m-0 text-xs text-muted-foreground">이름: {c.customerName ?? '-'}</p>
                          <p className="m-0 text-xs text-muted-foreground">연락처: {c.customerPhone ?? '-'}</p>
                          <p className="m-0 text-xs text-muted-foreground">이메일: {c.customerEmail ?? '-'}</p>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState>준비 중인 화면입니다.</EmptyState>
          )}
        </main>
      </div>

      {zoomTicket && (
        <AppDialog
          onClose={() => setZoomTicket(null)}
          title={zoomTicket.expoTitle}
          centered
          footer={
            <Button variant="outline" onClick={() => downloadTicketImage(zoomTicket, `QR_${zoomTicket.bookingNo}`)}>
              이미지 저장
            </Button>
          }
        >
          <div className="mx-auto flex size-56 items-center justify-center rounded-xl border bg-white p-2">
            {zoomTicket.qrImageBase64 ? (
              <img src={`data:image/png;base64,${zoomTicket.qrImageBase64}`} alt="입장 QR 코드" width={200} height={200} />
            ) : (
              <QrPlaceholder size={200} />
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p className="m-0">체크인 가능일 {fmtDate(zoomTicket.visitDate)}</p>
            <p className="m-0">예매번호 {zoomTicket.bookingNo}</p>
          </div>
        </AppDialog>
      )}

      {paymentDetailTicket && (
        <PaymentDetailModal ticket={paymentDetailTicket} onClose={() => setPaymentDetailTicket(null)} />
      )}
      {refundTicket && (
        <RefundRequestModal ticket={refundTicket} onClose={() => setRefundTicket(null)} onRefunded={loadTickets} />
      )}

      {showEditModal && (
        <AppDialog
          onClose={() => !saving && setShowEditModal(false)}
          dismissible={!saving}
          title="정보 수정"
        >
          <Form {...editForm}>
            <form className="flex flex-col gap-4" onSubmit={editForm.handleSubmit(handleSaveProfile)} noValidate>
              <TextField control={editForm.control} name="name" label="이름" />
              <TextField control={editForm.control} name="contact" label="휴대폰 번호" transform={formatPhoneNumber} />
              {saveError && <p className="m-0 text-sm text-destructive">{saveError}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>
                  취소
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </Form>
        </AppDialog>
      )}

      {showWithdrawModal && (
        <AppDialog
          onClose={() => !withdrawing && setShowWithdrawModal(false)}
          dismissible={!withdrawing}
          size="md"
          icon={<UserRound />}
          title="회원 탈퇴 안내"
          description="회원 탈퇴 전 아래 내용을 꼭 확인해주세요. 탈퇴 후에는 계정 복구가 불가능하며, 일부 정보는 법령에 따라 보관될 수 있습니다."
          footer={
            <>
              <Button variant="outline" onClick={() => setShowWithdrawModal(false)} disabled={withdrawing}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing || !withdrawAgreed}>
                {withdrawing ? '처리 중...' : '회원 탈퇴하기'}
              </Button>
            </>
          }
        >
          {hasUnusedPaidTicket && (
            <Alert>
              <Ticket />
              <AlertTitle>미사용 유료 입장권이 있습니다.</AlertTitle>
              <AlertDescription>
                <p className="m-0">
                  보유 중인 유료 입장권이 있어요. 탈퇴 시 해당 입장권은 자동으로 환불되지 않습니다. 입장권을 사용하거나, 환불 절차를 먼저 진행한 후 탈퇴해주세요.
                </p>
                <Button type="button" variant="link" className="mt-1 h-auto p-0" onClick={goToTicketsFromWithdrawModal}>
                  입장권 확인하기 ›
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <FileText />
            <AlertTitle>환불 및 사용 안내</AlertTitle>
            <AlertDescription>
              <ul className="m-0 list-disc pl-4">
                <li>유료 입장권은 탈퇴와 별도로 직접 환불 신청이 필요합니다.</li>
                <li>환불은 결제 수단 및 정책에 따라 처리되며, 자세한 내용은 고객센터를 통해 확인해주세요.</li>
                <li>탈퇴 후에는 입장권 사용이 불가능합니다.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <QrCode />
            <AlertTitle>보유한 QR의 효력이 즉시 만료됩니다.</AlertTitle>
            <AlertDescription>
              <ul className="m-0 list-disc pl-4">
                <li>탈퇴 시, 발급받은 모든 입장권 QR 코드가 즉시 비활성화됩니다.</li>
                <li>탈퇴 후에는 해당 QR로 행사장 입장이 불가능합니다.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Label className="cursor-pointer font-normal">
            <Checkbox checked={withdrawAgreed} onCheckedChange={(v) => setWithdrawAgreed(v === true)} disabled={withdrawing} />
            위 내용을 모두 확인하였으며, 이에 동의합니다.
          </Label>

          {withdrawError && <p className="m-0 text-sm text-destructive">{withdrawError}</p>}
        </AppDialog>
      )}

      {selectedConsultation && (
        <ConsultationDetailModal
          consultation={selectedConsultation}
          reviewed={myReviews.some((r) => r.consultationId === selectedConsultation.consultationId)}
          onClose={() => setSelectedConsultation(null)}
          onChanged={loadConsultations}
        />
      )}
      {reviewExpoId && (
        <VisitedBoothsModal
          expoId={reviewExpoId}
          reviewedBoothIds={myReviews.filter((r) => r.reviewType === 'BOOTH').map((r) => r.boothId)}
          onClose={() => setReviewExpoId(null)}
        />
      )}
      {showWritableReviews && (
        <WritableReviewsModal
          consultations={consultations}
          tickets={rawTickets}
          myReviews={myReviews}
          onClose={() => setShowWritableReviews(false)}
        />
      )}
      {editingReview && (
        <ReviewWriteModal
          boothId={editingReview.boothId}
          editing={editingReview}
          onClose={() => setEditingReview(null)}
          onCreated={loadMyReviews}
        />
      )}
    </PageContainer>
  );
}

export default CustomerMyPage;
