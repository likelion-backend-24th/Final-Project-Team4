import { useEffect, useState } from 'react';
import { exportAdminUsers, getAdminUsers } from '../../api/identity';
import { ALL, periodToRange, toDateParam } from '../../utils/adminMemberList';

// 관리자 회원 관리(참관객/참가업체) 목록 - 검색/상태/기간 필터, 페이징, 엑셀 다운로드.
export function useAdminMemberList({ role, filenamePrefix, notFoundMessage }) {
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(ALL);
  const [period, setPeriod] = useState(ALL);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState({ content: [], totalPages: 1, totalElements: 0 });
  const [loadError, setLoadError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const { signupFrom, signupTo } = periodToRange(period);
    getAdminUsers({
      role,
      keyword: keyword || undefined,
      status: status === ALL ? undefined : status,
      signupFrom,
      signupTo,
      page,
      size: pageSize,
    })
      .then((res) => {
        setResult(res);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? notFoundMessage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, keyword, status, period, page, pageSize]);

  const submitSearch = () => {
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { signupFrom, signupTo } = periodToRange(period);
      const { blob, headers } = await exportAdminUsers({
        role,
        keyword: keyword || undefined,
        status: status === ALL ? undefined : status,
        signupFrom,
        signupTo,
      });

      const disposition = headers?.['content-disposition'] ?? '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : `${filenamePrefix}_${toDateParam(new Date())}.csv`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '엑셀 다운로드에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const from = result.totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(page * pageSize + result.content.length, result.totalElements);

  return {
    keywordInput, setKeywordInput,
    status, setStatus,
    period, setPeriod,
    page, setPage,
    pageSize, setPageSize,
    result, loadError, exporting,
    submitSearch, handleExport,
    from, to,
  };
}
