import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// 회원가입, 소셜 로그인 최초 가입 화면 공통 필수 약관 동의 영역
// 약관 원문은 새 탭으로 열어 입력 중인 내용이 유지되게 함
function TermsAgreement({ agreeTerms, agreePrivacy, onChangeTerms, onChangePrivacy }) {
  const allAgreed = agreeTerms && agreePrivacy;

  const items = [
    { id: 'agree-terms', checked: agreeTerms, onChange: onChangeTerms, label: '[필수] 서비스 이용약관 동의', to: '/terms' },
    { id: 'agree-privacy', checked: agreePrivacy, onChange: onChangePrivacy, label: '[필수] 개인정보 수집 및 이용 동의', to: '/privacy' },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <Label htmlFor="agree-all" className="cursor-pointer font-semibold">
        <Checkbox
          id="agree-all"
          checked={allAgreed}
          onCheckedChange={(v) => {
            onChangeTerms(v === true);
            onChangePrivacy(v === true);
          }}
        />
        이용약관 및 개인정보 수집, 이용 동의 (전체 동의)
      </Label>
      <Separator className="my-3" />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <Label htmlFor={item.id} className="cursor-pointer font-normal">
              <Checkbox id={item.id} checked={item.checked} onCheckedChange={(v) => item.onChange(v === true)} />
              {item.label}
            </Label>
            <Link to={item.to} target="_blank" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              보기
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TermsAgreement;
