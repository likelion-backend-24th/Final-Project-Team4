import { useEffect, useState } from 'react';
import { getMyBoothApplications } from '@/api/expo';

// STATUS_LABEL(한글 라벨)은 화면 표시 전용이라 페이지 쪽에서 매핑하고,
// 이 훅은 API 응답을 신청 단위(myApplications)로 펼치는 가공까지만
const STATUS_LABEL = {
  DRAFT: '임시저장',
  SUBMITTED: '심사중',
  PAYMENT_PENDING: '신청 승인',
  CONFIRMED: '참가 확정',
  REJECTED: '반려',
  REFUND_REQUIRED: '환불 대기',
  CANCELLED: '취소됨',
};

// 마이페이지 "부스 참가 신청 현황" - 내 부스 참가 신청 목록 조회.
// applicationGroups: 원본 신청 그룹 (부스 참가 이력 산출용), myApplications: 신청 단위로 펼친 행.
export function useMyBoothApplications() {
  const [myApplications, setMyApplications] = useState([]);
  const [applicationGroups, setApplicationGroups] = useState([]);
  const [error, setError] = useState(null);

  const reload = () =>
    getMyBoothApplications()
      .then((res) => {
        const rows = res.content.flatMap((group) => {
          // 결제 대상(승인, 결제대기) 부스 참가비 합계 - payment-context 합계와 맞아야 결제 통과
          const payableTotal = group.applications
            .filter((a) => a.status === 'PAYMENT_PENDING')
            .reduce((sum, a) => sum + a.fee, 0);
          return group.applications.map((app) => ({
            id: app.applicationId,
            groupId: group.groupId,
            boothId: app.boothId,
            payableTotal,
            expoTitle: group.expoTitle,
            boothNo: `${app.boothNo} (${app.boothType})`,
            fee: app.fee,
            appliedAt: app.submittedAt ? app.submittedAt.slice(0, 10) : group.createdAt.slice(0, 10),
            status: STATUS_LABEL[app.status] ?? app.status,
            rejectReason: app.rejectReason,
            exhibitionItem: group.exhibitionItem,
            conceptDescription: group.conceptDescription,
            powerRequested: group.powerRequested,
            waterSupplyRequested: group.waterSupplyRequested,
            internetRequested: group.internetRequested,
            additionalRequest: group.additionalRequest,
          }));
        });
        setMyApplications(rows);
        setApplicationGroups(res.content);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? '신청 내역을 불러오지 못했습니다.'));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { myApplications, applicationGroups, error, reload };
}

export { STATUS_LABEL };
