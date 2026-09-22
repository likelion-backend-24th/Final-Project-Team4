import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// react-hook-form + shadcn Form 조합을 매번 풀어 쓰지 않도록 자주 쓰는 입력 형태만 묶은 헬퍼.
// 공통 props: control, name, label, required, description, className(FormItem)

function FieldShell({ control, name, label, required, description, className, children }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-1.5', className)}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive">*</span>}
            </FormLabel>
          )}
          {children(field)}
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// transform: 입력값을 저장 전에 가공(예: 전화번호 하이픈). suffix: 입력창 오른쪽 안쪽에 얹을 요소
export function TextField({ transform, suffix, inputClassName, ...rest }) {
  const { control, name, label, required, description, className, ...inputProps } = rest;
  return (
    <FieldShell {...{ control, name, label, required, description, className }}>
      {(field) => (
        <div className="relative">
          <FormControl>
            <Input
              {...inputProps}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(transform ? transform(e.target.value) : e.target.value)}
              className={cn('h-10', suffix && 'pr-12', inputClassName)}
            />
          </FormControl>
          {suffix && <div className="absolute top-1/2 right-2 -translate-y-1/2">{suffix}</div>}
        </div>
      )}
    </FieldShell>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      suffix={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          onClick={() => setShow((v) => !v)}
          aria-label="비밀번호 표시 전환"
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      }
    />
  );
}

export function TextareaField({ rows = 4, textareaClassName, onValueChange, ...rest }) {
  const { control, name, label, required, description, className, ...taProps } = rest;
  return (
    <FieldShell {...{ control, name, label, required, description, className }}>
      {(field) => (
        <FormControl>
          <Textarea
            rows={rows}
            {...taProps}
            {...field}
            value={field.value ?? ''}
            onChange={(e) => {
              field.onChange(e);
              onValueChange?.(e.target.value);
            }}
            className={textareaClassName}
          />
        </FormControl>
      )}
    </FieldShell>
  );
}

// options: [{ value, label }]
export function SelectField({ options, placeholder = '선택해주세요', ...rest }) {
  const { control, name, label, required, description, className } = rest;
  return (
    <FieldShell {...{ control, name, label, required, description, className }}>
      {(field) => (
        <Select value={field.value ?? ''} onValueChange={field.onChange}>
          <FormControl>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FieldShell>
  );
}

export function CheckboxField({ control, name, label, description, className }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex-row items-start gap-2', className)}>
          <FormControl>
            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} className="mt-0.5" />
          </FormControl>
          <div className="grid gap-1">
            <FormLabel className="cursor-pointer font-normal leading-snug">{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
