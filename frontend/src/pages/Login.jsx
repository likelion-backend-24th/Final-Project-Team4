import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import logoIcon from "@/assets/logo-icon.png";
import heroImage from "@/assets/login-hero.png";
import googleSymbol from "@/assets/google.png";
import kakaoSymbol from "@/assets/kakako.png";
import naverSymbol from "@/assets/naver-n.png";
import apiClient, { apiBaseUrl } from "@/api/client";
import { setAuth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// 소셜 로그인 버튼: 각 서비스 브랜드 색을 그대로 쓴다.
const SOCIAL_LOGINS = [
  {
    provider: "google",
    label: "Google 로그인",
    icon: googleSymbol,
    className: "bg-[#f2f2f2] text-slate-800 hover:bg-[#e8e8e8]",
  },
  {
    provider: "kakao",
    label: "카카오 로그인",
    icon: kakaoSymbol,
    className: "bg-[#fee500] text-black/85 hover:bg-[#f5dc00]",
  },
  {
    provider: "naver",
    label: "네이버 로그인",
    icon: naverSymbol,
    className: "bg-[#03a94d] text-white hover:bg-[#029a45]",
  },
];

const loginSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요.").email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
  rememberMe: z.boolean(),
});

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(
        "/api/auth/signin",
        {
          email: values.email,
          password: values.password,
          rememberMe: values.rememberMe,
        },
        { skipAuthRefresh: true }, // 로그인 실패(401)를 토큰 재발급으로 재시도하지 않음
      );
      const loginRole = data.data.role;
      setAuth(data.data.accessToken, loginRole, data.data.rememberMe);
      if (loginRole === "ADMIN") {
        navigate("/admin/applications");
      } else if (loginRole === "USER") {
        navigate("/customer");
      } else {
        navigate("/");
      }
    } catch (err) {
      alert(err.response?.data?.error?.message ?? "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full flex-col items-center justify-center px-6 py-14 md:w-[560px] md:shrink-0 md:px-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">환영합니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              모빌리티 엑스포 통합 파트너 포털 로그인
            </p>
          </div>

          <Form {...form}>
          <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력해주세요"
                        autoComplete="current-password"
                        className="h-10 pr-10"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="비밀번호 표시 전환"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                // FormItem 기본값(grid)이 "flex-row"만으론 안 깨져서 체크박스와 라벨이 줄바꿈됐음 - flex를 명시
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal text-muted-foreground">
                      로그인 상태 유지
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Link
                to="/forgot-password"
                className="text-sm text-primary no-underline hover:underline"
              >
                비밀번호 찾기
              </Link>
            </div>

            <Button type="submit" size="lg" className="h-10 w-full" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              또는
              <Separator className="flex-1" />
            </div>

            <div className="flex flex-col gap-2">
              {SOCIAL_LOGINS.map(({ provider, label, icon, className }) => (
                <Button
                  key={provider}
                  asChild
                  variant="ghost"
                  size="lg"
                  className={`h-10 w-full gap-2 font-semibold ${className}`}
                >
                  <a href={`${apiBaseUrl}/oauth2/authorization/${provider}`}>
                    <img src={icon} alt="" className="size-4 object-contain" />
                    {label}
                  </a>
                </Button>
              ))}
            </div>

            <Button asChild variant="outline" size="lg" className="h-10 w-full">
              <Link to="/customer">로그인 없이 박람회 둘러보기</Link>
            </Button>

            <p className="m-0 flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">아직 계정이 없으신가요?</span>
              <Link to="/signup" className="font-semibold text-primary no-underline hover:underline">
                회원가입
              </Link>
            </p>
          </form>
          </Form>
        </div>
      </div>

      <div
        className="hidden min-w-0 flex-1 flex-col justify-between p-20 text-white md:flex"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(11, 15, 25, 0.75), rgba(11, 15, 25, 0.75)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="" className="size-8 rounded-md object-cover" />
          <span className="text-lg font-bold tracking-wide">MOBILITY EXPO</span>
        </div>

        <div className="max-w-2xl">
          <p className="m-0 mb-4 text-xs font-semibold tracking-[0.2em] text-sky-300">
            MOBILITY EXPO EXHIBITOR PORTAL
          </p>
          <h2 className="m-0 text-4xl leading-tight font-bold 2xl:text-5xl">
            미래 모빌리티의 주인공,
            <br />
            지금 부스 참가를 신청하세요.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            국내외 최정상 모빌리티 기업들이 참여하는 비즈니스 플랫폼. 단 몇 번의
            클릭으로 박람회 참가 신청부터 부스 위치 신청까지 실시간으로
            관리해보세요.
          </p>
        </div>

        <p className="m-0 text-sm text-slate-400">
          © 2026 MOBILITY EXPO. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;
