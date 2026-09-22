import { PageContainer } from '@/components/layout/Page';
import { EFFECTIVE_DATE } from '@/utils/siteInfo';

// 이용약관, 개인정보처리방침 공통 문서 레이아웃. 본문의 h2/p/ul/section 기본 모양은 여기서 한 번에 잡는다.
export function LegalPage({ title, children }) {
  return (
    <PageContainer size="sm" className="pb-16">
      <main
        className={[
          'text-sm leading-7 text-slate-700',
          '[&_section]:mb-7 [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
          '[&_p]:m-0 [&_p]:mb-1.5 [&_ul]:m-0 [&_ul]:mb-1.5 [&_ul]:pl-5',
        ].join(' ')}
      >
        <h1 className="m-0 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="!mt-2 !mb-8 text-[13px] text-muted-foreground">시행일 {EFFECTIVE_DATE}</p>
        {children}
      </main>
    </PageContainer>
  );
}
