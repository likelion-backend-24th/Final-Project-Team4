import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminExpo, updateExpo, deleteExpo, closeExpo, openExpo, uploadExpoBannerImage, toAssetUrl } from '../../api/expo';
import './AdminExpoCreate.css';

// 서버가 내려주는 "YYYY-MM-DDTHH:mm:ss" 를 datetime-local 입력이 요구하는 "YYYY-MM-DDTHH:mm"로 자름
const toInputValue = (iso) => (iso ? iso.slice(0, 16) : '');

// 박람회 정보 수정 - 부스 목록은 대상이 아님(등록 이후엔 별도 관리). 등록 화면(AdminExpoCreate)과
// 같은 "기본 정보" 필드만 다루므로 스타일을 그대로 재사용한다.
function AdminExpoEdit() {
  const { expoId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(null);
  const [hasApplications, setHasApplications] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [bannerImageUrl, setBannerImageUrl] = useState(null);
  const bannerInputRef = useRef(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const loadExpo = () =>
    getAdminExpo(expoId)
      .then((res) => {
        setStatus(res.status);
        setHasApplications(res.hasApplications);
        setBannerImageUrl(res.bannerImageUrl);
        setForm({
          title: res.title,
          venue: res.venue,
          applyStartsAt: toInputValue(res.applyStartsAt),
          applyEndsAt: toInputValue(res.applyEndsAt),
          startsAt: toInputValue(res.startsAt),
          endsAt: toInputValue(res.endsAt),
          admissionFee: res.admissionFee,
        });
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message ?? '박람회 정보를 불러오지 못했습니다.'));

  useEffect(() => {
    loadExpo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expoId]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.admissionFee === '' || Number(form.admissionFee) < 0) {
      setError('당일 입장료를 0 이상으로 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await updateExpo(expoId, { ...form, admissionFee: Number(form.admissionFee) });
      if (bannerFile) {
        await uploadExpoBannerImage(expoId, bannerFile);
      }
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

  if (loadError) {
    return <p className="admin-expo-create__error" style={{ margin: '40px' }}>{loadError}</p>;
  }
  if (!form) {
    return <p style={{ margin: '40px' }}>불러오는 중...</p>;
  }

  return (
    <div className="admin-expo-create">
      <section className="admin-expo-create__hero">
        <p className="admin-expo-create__eyebrow">EXHIBITOR MANAGEMENT PORTAL</p>
        <h1>박람회 수정</h1>
        <p>박람회 기본 정보를 수정합니다. 부스 신청이 있는 박람회는 일정을 바꿀 수 없습니다.</p>
      </section>

      <form className="admin-expo-create__form" onSubmit={handleSubmit}>
        <section className="admin-expo-create__panel">
          <h2>기본 정보</h2>
          <div className="admin-expo-create__grid">
            <label>
              박람회명
              <input value={form.title} onChange={setField('title')} required />
            </label>
            <label>
              장소
              <input value={form.venue} onChange={setField('venue')} required />
            </label>
            <label>
              신청 시작
              <input
                type="datetime-local"
                value={form.applyStartsAt}
                onChange={setField('applyStartsAt')}
                disabled={hasApplications}
                required
              />
            </label>
            <label>
              신청 마감
              <input
                type="datetime-local"
                value={form.applyEndsAt}
                onChange={setField('applyEndsAt')}
                disabled={hasApplications}
                required
              />
            </label>
            <label>
              개최 시작
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={setField('startsAt')}
                disabled={hasApplications}
                required
              />
            </label>
            <label>
              개최 종료
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={setField('endsAt')}
                disabled={hasApplications}
                required
              />
            </label>
            <label>
              당일 입장료(원)
              <input type="number" min={0} value={form.admissionFee} onChange={setField('admissionFee')} required />
            </label>
          </div>
          <p className="admin-expo-create__hint">규칙: 신청 시작 &lt; 신청 마감 ≤ 개최 시작 &lt; 개최 종료</p>
          {hasApplications && (
            <p className="admin-expo-create__hint">부스 신청이 있어 일정 필드는 수정할 수 없습니다.</p>
          )}

          <div className="admin-expo-create__banner-field">
            <label>
              배너 이미지 (PNG/JPEG/WEBP, 5MB 이하)
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleBannerFileChange}
              />
            </label>
            {(bannerPreview ?? toAssetUrl(bannerImageUrl)) && (
              <img
                src={bannerPreview ?? toAssetUrl(bannerImageUrl)}
                alt="배너 미리보기"
                className="admin-expo-create__banner-preview"
              />
            )}
          </div>
        </section>

        {error && <p className="admin-expo-create__error">{error}</p>}

        <div className="admin-expo-create__actions">
          <div className="admin-expo-create__buttons">
            <button type="button" className="admin-expo-create__row-del" onClick={handleDelete}>
              박람회 삭제
            </button>
            {status === 'OPEN' && (
              <button type="button" className="admin-expo-create__row-del" onClick={handleClose}>
                비공개로 전환
              </button>
            )}
            {status === 'DRAFT' && (
              <button type="button" className="admin-expo-create__gen-btn" onClick={handleOpen}>
                공개하기
              </button>
            )}
          </div>
          <div className="admin-expo-create__buttons">
            <button type="button" className="admin-expo-create__cancel" onClick={() => navigate('/admin/applications')}>
              취소
            </button>
            <button type="submit" className="admin-expo-create__submit" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AdminExpoEdit;
