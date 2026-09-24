This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:4020](http://localhost:4020) with your browser to see the result.

## 카메라관리

`/cameras`에서 `device-lover-api`의 `GET /api/v1/admin/cameras`를 호출해 카메라 목록과 주요 사양을 조회합니다. 모델 검색, 시리즈 필터, 페이지당 개수와 페이지 이동을 지원합니다. API는 `API_BASE_URL` 환경변수로 지정하며 기본값은 `http://127.0.0.1:4040`입니다.

API의 `0005_create_cameras.sql`, `0006_seed_canon_cameras.sql` migration을 적용하면 캐논 EOS 5D 계열 6종(5DS·5DS R 포함), 6D 계열 2종, 10D~90D 9종이 표시됩니다. 각 행에서 Canon 공식 사양 출처를 열 수 있습니다. 출시월은 일본 출시 기준이고, 무게는 배터리와 메모리 카드를 제외한 본체 기준입니다.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
