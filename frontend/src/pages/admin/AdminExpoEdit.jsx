import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminExpo, updateExpo, deleteExpo, closeExpo, openExpo, uploadExpoBannerImage, toAssetUrl } from '../../api/expo';
import { BannerUpload, ExpoBasicFields, expoSchema } from '@/components/admin/ExpoBasicFields';
import { EmptyState, PageContainer, PageHero } from '@/components/layout/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';

// 서버가 내려주는 "YYYY-MM-DDTHH:mm:ss" 를 datetime-local 입력이 요구하는 "YYYY-MM-DDTHH:mm"로 자름
const toInputValue = (iso) => (iso ? iso.slice(0, 16) : '');

// 박람회 정보 수정 - 부스 목록은 대상이 아님(등록 이후엔 별도 관리). 등록 화면(AdminExpoCreate)과
// 같은 "기본 정보" 필드 컴포넌트를 재사용한다.
function AdminExpoEdit() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const form = useForm({ resolver: zodResolver(expoSchema) });
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState(null);
  const [hasApplications, setHasApplications] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [bannerImageUrl, setBannerImageUrl] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  useEffect(() => {
    getAdminExpo(expoId)
      .then((res) => {
        setStatus(res.status);
        setHasApplications(res.hasApplications);
        setBannerImageUrl(res.bannerImageUrl);
        form.reset({
          title: res.title,
          venue: res.venue,
          description: res.description ?? '',
          applyStartsAt: toInputValue(res.applyStartsAt),
          applyEndsAt: toInputValue(res.applyEndsAt),
          startsAt: toInputValue(res.startsAt),
          endsAt: toInputValue(res.endsAt),
          admissionFee: String(res.admissionFee),
        });
        setLoaded(true);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.'));
  }, [expoId, form]);

  const onSubmit = async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      await updateExpo(expoId, {
        ...values,
        admissionFee: Number(values.admissionFee),
        description: values.description.trim() || null,
      });
      if (bannerFile) await uploadExpoBannerImage(expoId, bannerFile);
      alert('박람회 정보를 수정했습니다.');
      navigate('/admin/applications');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '박람회 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('박람회를 삭제할까요? 되돌릴 수 없습니다.')) return;
    try {
      await deleteExpo(expoId);
      alert('박람회를 삭제했습니다.');
      navigate('/admin/applications');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '박람회 삭제에 실패했습니다.');
    }
  };

  const handleClose = async () => {
    if (!window.confirm('박람회를 비공개로 전환할까요? 참가업체가 신청할 수 없게 됩니다.')) return;
    try {
      await closeExpo(expoId);
      setStatus('DRAFT');
      alert('박람회를 비공개로 전환했습니다.');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '비공개 전환에 실패했습니다.');
    }
  };

  const handleOpen = async () => {
    if (!window.confirm('박람회를 공개할까요? 참가업체가 부스 신청을 할 수 있게 됩니다.')) return;
    try {
      await openExpo(expoId);
      setStatus('OPEN');
      alert('박람회를 공개했습니다.');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '공개 전환에 실패했습니다.');
    }
  };

  if (loadError) return <EmptyState tone="error">{loadError}</EmptyState>;
  if (!loaded) return <EmptyState>불러오는 중...</EmptyState>;

  return (
    <div>
      <PageHero
        eyebrow="EXHIBITOR MANAGEMENT PORTAL"
        title="박람회 수정"
        description="박람회 기본 정보를 수정합니다. 부스 신청이 있는 박람회는 일정을 바꿀 수 없습니다."
      />

      <PageContainer size="lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpoBasicFields control={form.control} lockSchedule={hasApplications}>
                  <BannerUpload existingUrl={toAssetUrl(bannerImageUrl)} onFileChange={setBannerFile} />
                </ExpoBasicFields>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="text-destructive" onClick={handleDelete}>
                  박람회 삭제
                </Button>
                {status === 'OPEN' && (
                  <Button type="button" variant="outline" onClick={handleClose}>비공개로 전환</Button>
                )}
                {status === 'DRAFT' && (
                  <Button type="button" variant="secondary" onClick={handleOpen}>공개하기</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/applications')}>취소</Button>
                <Button type="submit" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</Button>
              </div>
            </div>
          </form>
        </Form>
      </PageContainer>
    </div>
  );
}

export default AdminExpoEdit;
