import { Link, NavLink } from 'react-router-dom';
import logoIcon from '@/assets/logo-icon.png';
import { cn } from '@/lib/utils';

// 세 역할(참가업체/고객/관리자) 헤더가 공유하는 상단 바.
// brandTo: 로고 클릭 시 이동 경로, navItems: [{ to, label, end? }], children: 우측 계정 영역
export function AppHeader({ brandTo, navItems = [], children }) {
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-background/90 px-4 py-3 text-foreground backdrop-blur md:px-8 md:py-3.5">
      <Link to={brandTo} className="flex items-center gap-2.5 text-foreground no-underline">
        <img src={logoIcon} alt="" className="size-8 rounded-md object-cover" />
        <span className="font-heading text-sm font-bold tracking-wide">MOBILITY EXPO</span>
      </Link>

      {navItems.length > 0 && (
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-1.5">{children}</div>
    </header>
  );
}
