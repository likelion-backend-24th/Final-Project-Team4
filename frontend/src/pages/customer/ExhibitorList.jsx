import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BulkConsultPromo from '../../components/customer/BulkConsultPromo';
import ExpoUnavailableModal from '../../components/customer/ExpoUnavailableModal';
import { getCustomerExpo, getCustomerExpoVehicles, toAssetUrl } from '../../api/expo';
import { boothNoValue, mergeExhibitorGroups } from '../../utils/exhibitorGroups';
import { EmptyState, PageContainer, PageHero, Pagination } from '@/components/layout/Page';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: 'boothNo', label: '부스 번호 낮은순' },
  { value: 'boothNoDesc', label: '부스 번호 높은순' },
  { value: 'name', label: '업체명 가나다순' },
  { value: 'nameDesc', label: '업체명 가나다 역순' },
];

const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');

// 박람회 둘러보기 첫 화면 - 참가업체 목록. 카드를 누르면 그 업체의 전시 차량 목록으로 이동하고,
// "한 번에 상담 신청"으로 여러 업체를 골라 상담 신청 정보를 한 번만 입력해 동시에 신청할 수 있다.
function ExhibitorList() {
  const { expoId } = useParams();
  const navigate = useNavigate();
  const [expo, setExpo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [expoGone, setExpoGone] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('boothNo');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getCustomerExpo(expoId), getCustomerExpoVehicles(expoId)])
      .then(([expoRes, groupsRes]) => {
        setExpo(expoRes);
        setGroups(groupsRes);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setExpoGone(true);
        } else {
          setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.');
        }
      });
  }, [expoId]);

  // 같은 신청(applicationGroupId)으로 접수한 부스는 "A-101 ~ A-102"처럼 한 카드로 묶어서 보여준다.
  const exhibitors = useMemo(() => mergeExhibitorGroups(groups), [groups]);

  const filteredExhibitors = useMemo(
    () => exhibitors.filter((e) => e.title.toLowerCase().includes(keyword.toLowerCase())),
    [exhibitors, keyword]
  );

  const sortedExhibitors = useMemo(() => {
    const arr = [...filteredExhibitors];
    switch (sortBy) {
      case 'boothNoDesc':
        arr.sort((a, b) => boothNoValue(b.boothNos[0]) - boothNoValue(a.boothNos[0]));
        break;
      case 'name':
        arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
        break;
      case 'nameDesc':
        arr.sort((a, b) => b.title.localeCompare(a.title, 'ko'));
        break;
      case 'boothNo':
      default:
        arr.sort((a, b) => boothNoValue(a.boothNos[0]) - boothNoValue(b.boothNos[0]));
        break;
    }
    return arr;
  }, [filteredExhibitors, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [keyword, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedExhibitors.length / PAGE_SIZE));
  const pagedExhibitors = sortedExhibitors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (expoGone) {
    return <ExpoUnavailableModal onConfirm={() => navigate('/customer')} />;
  }
  if (loadError) {
    return <EmptyState tone="error">{loadError}</EmptyState>;
  }
  if (!expo) {
    return <EmptyState>불러오는 중...</EmptyState>;
  }

  return (
    <div>
      <PageHero eyebrow="EXHIBITION" title={expo.title} description={`${fmtDate(expo.startsAt)} ~ ${fmtDate(expo.endsAt)}`} />

      <PageContainer>
        <nav className="mb-2 text-xs text-muted-foreground" aria-label="breadcrumb">
          <Link to="/customer" className="text-muted-foreground no-underline hover:text-foreground">홈</Link>
          {' > '}
          <span className="text-foreground">참가 업체</span>
        </nav>
        <h2 className="m-0 mb-5 text-2xl font-bold tracking-tight">참가 업체</h2>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-8"
              placeholder="업체명으로 검색하세요."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            정렬
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <p className="mb-3 text-sm text-muted-foreground">총 {sortedExhibitors.length}개 업체</p>

            {pagedExhibitors.length === 0 && <EmptyState>조건에 맞는 참가업체가 없습니다.</EmptyState>}

            <div className="grid gap-3 sm:grid-cols-2">
              {pagedExhibitors.map((exhibitor) => {
                const boothLabel =
                  exhibitor.boothNos.length > 1
                    ? `${exhibitor.boothNos[0]} ~ ${exhibitor.boothNos[exhibitor.boothNos.length - 1]}`
                    : exhibitor.boothNos[0];
                return (
                  <Link
                    key={exhibitor.boothId}
                    to={`/customer/expos/${expoId}/booths/${exhibitor.boothId}`}
                    className="no-underline"
                  >
                    <Card className="flex-row items-center gap-4 p-4 transition-shadow hover:shadow-md">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-lg font-bold text-muted-foreground">
                        {exhibitor.bannerImageUrl ? (
                          <img src={toAssetUrl(exhibitor.bannerImageUrl)} alt={exhibitor.title} className="size-full object-cover" />
                        ) : (
                          <span>{exhibitor.title.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 truncate text-base font-semibold text-foreground">{exhibitor.title}</h3>
                        <span className="text-xs text-muted-foreground">{boothLabel}</span>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Card>
                  </Link>
                );
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>

          <BulkConsultPromo expoId={expoId} groups={groups} />
        </div>
      </PageContainer>
    </div>
  );
}

export default ExhibitorList;
