import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { confirmPasswordReset } from "@/api/identity";
import { AuthCard, BackToLogin } from "@/components/layout/AuthCard";
import { PasswordField } from "@/components/form/fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

const schema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirm: z.string().min(1, "비밀번호를 한번 더 입력해주세요."),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });

// 재설정 링크 진입 화면. ?token=... 을 받아 새 비밀번호를 설정하고 로그인으로 보냄
function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const handleSubmit = async ({ password }) => {
    setError("");
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      alert("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ??
          "링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="잘못된 링크" description="재설정 토큰이 없습니다. 링크를 다시 확인해주세요.">
        <BackToLogin to="/forgot-password">비밀번호 다시 찾기</BackToLogin>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="새 비밀번호 설정" description="8자 이상으로 새 비밀번호를 입력해주세요.">
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <PasswordField control={form.control} name="password" label="새 비밀번호" />
          <PasswordField control={form.control} name="confirm" label="새 비밀번호 확인" />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" size="lg" className="h-10" disabled={submitting}>
            {submitting ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

export default ResetPassword;
