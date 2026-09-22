import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 헤더 우측 계정 드롭다운
// label: 트리거/요약에 보여줄 이름, mypageTo: 마이페이지 경로, onLogout: 로그아웃 핸들러
function AccountMenu({ label, mypageTo, onLogout }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <UserRound />
          <span className="max-w-40 truncate">{label}</span>
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mypageTo && (
          <DropdownMenuItem asChild>
            <Link to={mypageTo}>마이페이지</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountMenu;
