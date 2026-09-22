import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { requestPasswordReset } from "../api/identity";
import { AuthCard, BackToLogin } from "../components/layout/AuthCard";
import { TextField } from "../components/form/fields";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

const schema = z.object({
  email: z.string().trim().min(1, "이메일을 입력해주세요.").email("올바른 이메일 형식이 아닙니다."),
});

// 비밀번호 찾기 - 이메일 입력 후 재설정 링크 발송 요청.
function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const handleSubmit = async ({ email }) => {
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // 가입 여부를 알리지 않기 위해 실패해도 같은 안내를 보여준다.
    } finally {
      setSent(true);
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="비밀번호 찾기"
        description="입력하신 이메일로 재설정 링크를 보냈습니다. 메일함을 확인해주세요. 링크는 30분간 유효합니다."
      >
        <BackToLogin />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="비밀번호 찾기"
      description="가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다."
    >
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <TextField control={form.control} name="email" label="이메일" type="email" placeholder="name@company.com" />
          <Button type="submit" size="lg" className="h-10" disabled={submitting}>
            {submitting ? "전송 중..." : "재설정 링크 받기"}
          </Button>
        </form>
      </Form>
      <BackToLogin />
    </AuthCard>
  );
}

export default ForgotPassword;
