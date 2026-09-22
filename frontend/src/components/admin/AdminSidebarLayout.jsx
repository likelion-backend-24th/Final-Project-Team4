import { BarChart3, Bell, ClipboardList, FilePlus2, LayoutDashboard, Users } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '@/assets/logo-icon.png';
import apiClient from '../../api/client';
import { clearAuth } from '../../api/auth';
import AccountMenu from '../AccountMenu';
import Footer from '../Footer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 관리자 화면 좌측 사이드바 레이아웃. 모든 관리자 페이지가 이 레이아웃으로 자체 래핑한다.
const NAV_ITEMS = [
  { to: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
  {
    to: '/admin/applications',
    label: '참가 신청 관리',
    icon: ClipboardList,
    children: [{ to: '/admin/expos/new', label: '박람회 등록', icon: FilePlus2 }],
  },
  { to: '/admin/stats', label: '통계', icon: BarChart3 },
  { to: '/admin/members', label: '회원 관리', icon: Users },
];

const navLinkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );

const subNavLinkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2.5 rounded-md py-1.5 pr-3 pl-8 text-sm font-medium no-underline transition-colors',
    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );

// breadcrumb: 상단 바에 보여줄 현재 페이지 이름, children: 본문
export function AdminSidebarLayout({ breadcrumb, children }) {
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // 실패해도 로컬 토큰은 비움
    }
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-background">
        <Link to="/admin" className="flex items-center gap-2.5 px-5 py-5 text-foreground no-underline">
          <img src={logoIcon} alt="" className="size-8 rounded-md object-cover" />
          <span className="font-heading text-sm font-bold tracking-wide">MOBILITY EXPO</span>
        </Link>

        <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
            <div key={item.to} className="flex flex-col gap-1">
            <NavLink to={item.to} end={item.end} className={navLinkClass}>
                <item.icon className="size-4" />
                {item.label}
            </NavLink>
            {item.children?.map((child) => (
                <NavLink key={child.to} to={child.to} className={subNavLinkClass}>
                <child.icon className="size-4" />
                {child.label}
                </NavLink>
            ))}
            </div>
        ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/90 px-6 py-3 backdrop-blur">
          <p className="m-0 text-sm text-muted-foreground">
            관리자<span className="mx-1.5 text-border">/</span>
            <span className="font-medium text-foreground">{breadcrumb}</span>
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="알림">
              <Bell />
            </Button>
            <AccountMenu label="최고 관리자" onLogout={handleLogout} />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}