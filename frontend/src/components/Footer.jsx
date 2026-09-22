import { Link } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import { getRole, useIsLoggedIn } from '../api/auth';
import { SITE_NAME } from '../utils/siteInfo';

// 역할별로 헤더에서 자주 쓰는 경로를 바로가기로 보여줌 (비로그인은 참관객 둘러보기 기준)
const QUICK_LINKS = {
  EXHIBITOR: [
    { to: '/', label: '박람회 목록' },
    { to: '/mypage', label: '마이페이지' },
    { to: '/consultations', label: '상담 관리' },
    { to: '/leads', label: '리드 관리' },
  ],
  ADMIN: [
    { to: '/admin', label: '대시보드' },
    { to: '/admin/applications', label: '참가신청 관리' },
    { to: '/admin/expos/new', label: '박람회 등록' },
    { to: '/admin/stats', label: '매출 통계' },
  ],
  USER: [
    { to: '/customer', label: '박람회 둘러보기' },
    { to: '/customer/mypage', label: '마이페이지' },
  ],
  GUEST: [
    { to: '/customer', label: '박람회 둘러보기' },
    { to: '/login', label: '로그인' },
    { to: '/signup', label: '회원가입' },
  ],
};

const linkClass = 'text-muted-foreground no-underline transition-colors hover:text-foreground';
const headingClass = 'mb-1 text-[13px] font-semibold text-foreground';

// 참관객, 참가업체, 관리자 화면 공통 하단 푸터
// 환불 안내는 별도 페이지가 생기면 그쪽으로 링크 교체할 예정 (현재는 이용약관 제10조)
function Footer() {
  const loggedIn = useIsLoggedIn();
  const quickLinks = QUICK_LINKS[loggedIn ? getRole() : 'GUEST'] ?? QUICK_LINKS.GUEST;

  return (
    <footer className="border-t border-border bg-background px-4 pt-10 pb-7 text-[13px] leading-relaxed text-muted-foreground md:px-8">
      <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-3.5">
          <div className="flex items-center gap-2.5 font-semibold text-foreground">
            <img src={logoIcon} alt="" className="size-7 rounded-md object-cover" />
            <span>{SITE_NAME}</span>
          </div>
          <p className="m-0">자동차 박람회 참관객과 참가업체를 잇는 통합 플랫폼</p>
        </div>

        <nav className="flex flex-col items-start gap-1.5" aria-label="바로가기">
          <h3 className={headingClass}>바로가기</h3>
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-col items-start gap-1.5" aria-label="약관 및 정책">
          <h3 className={headingClass}>약관 및 정책</h3>
          <Link to="/terms" className={linkClass}>이용약관</Link>
          <Link to="/privacy" className={linkClass}>개인정보처리방침</Link>
          <Link to="/terms#article-10" className={linkClass}>환불 안내</Link>
        </nav>
      </div>

      <div className="mt-8 border-t border-border pt-5 text-xs">
        <p className="m-0">
          {SITE_NAME}는 참관객과 참가업체를 연결하는 플랫폼이며, 참관객과 참가업체 간 상담, 시승, 차량
          거래의 당사자가 아니고 해당 거래에 대한 책임을 지지 않습니다. 결제 서비스는 포트원을 통해
          제공됩니다.
        </p>
        <p className="mt-2 mb-0">
          &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
