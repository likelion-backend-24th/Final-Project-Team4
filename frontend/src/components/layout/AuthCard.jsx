import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 비밀번호 찾기/재설정처럼 화면 가운데 작은 카드 하나만 두는 인증 계열 페이지 레이아웃
export function AuthCard({ title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && <CardDescription className="leading-relaxed">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}

export function BackToLogin({ to = '/login', children = '로그인으로 돌아가기' }) {
  return (
    <Link to={to} className="text-center text-sm text-muted-foreground no-underline hover:text-foreground hover:underline">
      {children}
    </Link>
  );
}
