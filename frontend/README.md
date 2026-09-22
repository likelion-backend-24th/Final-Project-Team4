# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## shadcn/ui

Tailwind CSS v4 + shadcn/ui(Radix, JS)가 설정되어 있다.

- 컴포넌트 추가: `npx shadcn@latest add dialog` → `src/components/ui/`에 복사된다. 설정은 `components.json`.
- import 경로: `@/components/ui/button`, `@/lib/utils` (`vite.config.js`의 alias + `jsconfig.json`의 paths).
- 진입 CSS는 `src/tailwind.css`. 기존 화면 CSS를 건드리지 않도록 Tailwind의 전역 리셋(preflight)은 뺐다. 새 컴포넌트에서만 Tailwind 클래스를 쓴다.
- 테마 색은 `src/tailwind.css`의 CSS 변수(`--primary` 등)에서 바꾼다.
