import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import apiClient from '@/api/client';
import { confirmVerificationCode, sendVerificationCode } from '@/api/identity';
import logoIcon from '@/assets/M-Logo.png';
import TermsAgreement from '@/components/TermsAgreement';
import { PasswordField, TextField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPhoneNumber } from '@/utils/phone';

const required = (msg) => z.string().trim().min(1, msg);
const emailRule = z.string().trim().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식이 아닙니다.');
const passwordRule = z.string().min(8, '비밀번호는 8자 이상이어야 합니다.');

const matchPassword = (schema) =>
  schema.refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않습니다.',
  });

const userSchema = matchPassword(
  z.object({
    name: required('이름을 입력해주세요.'),
    phone: required('전화번호를 입력해주세요.'),
    email: emailRule,
    password: passwordRule,
    passwordConfirm: required('비밀번호를 한번 더 입력해주세요.'),
  }),
);

const exhibitorSchema = matchPassword(
  z.object({
    managerName: required('이름을 입력해주세요.'),
    email: emailRule,
    password: passwordRule,
    passwordConfirm: required('비밀번호를 한번 더 입력해주세요.'),
    contact: required('연락처를 입력해주세요.'),
    companyName: required('업체명을 입력해주세요.'),
    businessNo: required('사업자등록번호를 입력해주세요.'),
    representativeName: required('대표자명을 입력해주세요.'),
    industry: required('업종을 입력해주세요.'),
    companyAddress: required('업체 주소를 입력해주세요.'),
    companyContact: required('업체 대표 연락처를 입력해주세요.'),
  }),
);

const USER_DEFAULTS = { name: '', phone: '', email: '', password: '', passwordConfirm: '' };
const EXHIBITOR_DEFAULTS = {
  managerName: '', email: '', password: '', passwordConfirm: '', contact: '',
  companyName: '', businessNo: '', representativeName: '', industry: '', companyAddress: '', companyContact: '',
};

// 이메일 입력 + 인증 코드 발송/확인. 이메일을 바꾸면 이전 인증은 무효가 된다(부모가 verifiedEmail로 판단).
function EmailVerifyField({ form, placeholder, verifiedEmail, onVerified }) {
  const email = useWatch({ control: form.control, name: 'email' });
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const isVerified = verifiedEmail !== null && verifiedEmail === email;

  const handleEmailChange = (value) => {
    onVerified(null);
    setCodeSent(false);
    setCode('');
    setVerifyError('');
    return value;
  };

  const handleSendCode = async () => {
    const ok = await form.trigger('email');
    if (!ok) return;
    setSendingCode(true);
    setVerifyError('');
    try {
      await sendVerificationCode(email);
      setCodeSent(true);
    } catch (err) {
      setVerifyError(err.response?.data?.error?.message ?? '인증 코드 발송에 실패했습니다.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    setConfirmingCode(true);
    setVerifyError('');
    try {
      await confirmVerificationCode(email, code);
      onVerified(email);
    } catch (err) {
      setVerifyError(err.response?.data?.error?.message ?? '인증 코드가 올바르지 않습니다.');
    } finally {
      setConfirmingCode(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TextField
        control={form.control}
        name="email"
        label="이메일 주소"
        required
        type="email"
        placeholder={placeholder}
        transform={handleEmailChange}
        suffix={
          isVerified ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-4" />
              인증 완료
            </span>
          ) : null
        }
        inputClassName={isVerified ? 'pr-28' : ''}
      />
      {!isVerified && (
        <div className="flex flex-wrap items-center gap-2">
          {!codeSent ? (
            <Button type="button" variant="outline" size="sm" onClick={handleSendCode} disabled={!email || sendingCode}>
              {sendingCode ? '발송 중...' : '인증하기'}
            </Button>
          ) : (
            <>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="인증코드 6자리"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-9 w-40"
              />
              <Button type="button" size="sm" onClick={handleConfirmCode} disabled={code.length !== 6 || confirmingCode}>
                {confirmingCode ? '확인 중...' : '확인'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleSendCode} disabled={sendingCode}>
                재발송
              </Button>
            </>
          )}
        </div>
      )}
      {verifyError && <p className="m-0 text-sm text-destructive">{verifyError}</p>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      {title && <h2 className="m-0 mb-4 text-base font-semibold">{title}</h2>}
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('user'); // 'user' | 'exhibitor'
  const [submitting, setSubmitting] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const allAgreed = agreeTerms && agreePrivacy;

  const userForm = useForm({ resolver: zodResolver(userSchema), defaultValues: USER_DEFAULTS });
  const exhibitorForm = useForm({ resolver: zodResolver(exhibitorSchema), defaultValues: EXHIBITOR_DEFAULTS });
  const form = tab === 'user' ? userForm : exhibitorForm;
  const email = useWatch({ control: form.control, name: 'email' });
  const isEmailVerified = verifiedEmail !== null && verifiedEmail === email;

  const handleTabChange = (next) => {
    setTab(next);
    setVerifiedEmail(null);
    userForm.reset(USER_DEFAULTS);
    exhibitorForm.reset(EXHIBITOR_DEFAULTS);
  };

  const submit = (url, buildBody) => async (values) => {
    if (!isEmailVerified) {
      alert('이메일 인증을 먼저 완료해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(url, buildBody(values));
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserSubmit = submit('/api/auth/signup', (v) => ({
    email: v.email, password: v.password, name: v.name, phone: v.phone,
  }));
  const handleExhibitorSubmit = submit('/api/auth/exhibitors/signup', (v) => ({
    businessNo: v.businessNo, password: v.password, email: v.email, companyName: v.companyName,
    managerName: v.managerName, contact: v.contact, companyAddress: v.companyAddress, industry: v.industry,
    representativeName: v.representativeName, companyContact: v.companyContact,
  }));

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
        이전으로
      </Button>
      <Button type="submit" size="lg" disabled={submitting || !isEmailVerified || !allAgreed}>
        {submitting ? '처리 중...' : '회원가입 완료'}
      </Button>
    </div>
  );

  const terms = (
    <TermsAgreement
      agreeTerms={agreeTerms}
      agreePrivacy={agreePrivacy}
      onChangeTerms={setAgreeTerms}
      onChangePrivacy={setAgreePrivacy}
    />
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-foreground no-underline">
          <img src={logoIcon} alt="" className="size-10 rounded-md object-cover" />
          <span className="font-heading text-sm font-bold tracking-wide">MOBILITY EXPO</span>
        </Link>
        <p className="m-0 text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-semibold text-primary no-underline hover:underline">
            로그인
          </Link>
        </p>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="m-0 text-3xl font-bold tracking-tight">회원가입</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          {tab === 'user'
            ? '이메일과 비밀번호로 가입하고 박람회 정보 조회와 상담 신청을 이용하세요.'
            : '박람회 참가 신청을 위해 담당자 정보 및 업체 정보를 등록해주세요.'}
        </p>

        <Tabs value={tab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">일반 회원가입</TabsTrigger>
            <TabsTrigger value="exhibitor">참가업체 회원가입</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'user' ? (
          <Form {...userForm}>
            <form className="flex flex-col gap-5" onSubmit={userForm.handleSubmit(handleUserSubmit)} noValidate>
              <SectionCard>
                <TextField control={userForm.control} name="name" label="이름" required placeholder="홍길동" />
                <TextField
                  control={userForm.control}
                  name="phone"
                  label="전화번호"
                  required
                  placeholder="예: 010-1234-5678"
                  transform={formatPhoneNumber}
                />
                <div className="md:col-span-2">
                  <EmailVerifyField
                    form={userForm}
                    placeholder="name@example.com"
                    verifiedEmail={verifiedEmail}
                    onVerified={setVerifiedEmail}
                  />
                </div>
                <PasswordField
                  control={userForm.control}
                  name="password"
                  label="비밀번호"
                  required
                  placeholder="8자 이상"
                  className="md:col-span-2"
                />
                <PasswordField
                  control={userForm.control}
                  name="passwordConfirm"
                  label="비밀번호 확인"
                  required
                  placeholder="비밀번호를 한번 더 입력해주세요"
                  className="md:col-span-2"
                />
              </SectionCard>
              {terms}
              {actions}
            </form>
          </Form>
        ) : (
          <Form {...exhibitorForm}>
            <form
              className="flex flex-col gap-5"
              onSubmit={exhibitorForm.handleSubmit(handleExhibitorSubmit)}
              noValidate
            >
              <SectionCard title="1. 회원 정보 (담당자)">
                <TextField control={exhibitorForm.control} name="managerName" label="이름" required placeholder="홍길동" />
                <EmailVerifyField
                  form={exhibitorForm}
                  placeholder="name@company.com"
                  verifiedEmail={verifiedEmail}
                  onVerified={setVerifiedEmail}
                />
                <PasswordField
                  control={exhibitorForm.control}
                  name="password"
                  label="비밀번호"
                  required
                  placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                />
                <PasswordField
                  control={exhibitorForm.control}
                  name="passwordConfirm"
                  label="비밀번호 확인"
                  required
                  placeholder="비밀번호를 한번 더 입력해주세요"
                />
                <TextField
                  control={exhibitorForm.control}
                  name="contact"
                  label="연락처"
                  required
                  placeholder="예: 010-1234-5678"
                  transform={formatPhoneNumber}
                  className="md:col-span-2"
                />
              </SectionCard>

              <SectionCard title="2. 업체 정보">
                <TextField control={exhibitorForm.control} name="companyName" label="업체명" required placeholder="주식회사 모빌리티테크" />
                <TextField control={exhibitorForm.control} name="businessNo" label="사업자등록번호" required placeholder="1234567890" />
                <TextField control={exhibitorForm.control} name="representativeName" label="대표자명" required placeholder="이대표" />
                <TextField control={exhibitorForm.control} name="industry" label="업종" required placeholder="전기차 부품 제조 / S/W 솔루션" />
                <TextField
                  control={exhibitorForm.control}
                  name="companyAddress"
                  label="업체 주소"
                  required
                  placeholder="서울특별시 강남구 테헤란로 123, 4층"
                  className="md:col-span-2"
                />
                <TextField
                  control={exhibitorForm.control}
                  name="companyContact"
                  label="업체 대표 연락처"
                  required
                  placeholder="예: 02-1234-5678"
                  transform={formatPhoneNumber}
                  className="md:col-span-2"
                />
              </SectionCard>

              {terms}
              {actions}
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}

export default Signup;
