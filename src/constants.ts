export const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : `http://localhost:3000/api/trpc`;

export const url = `${baseUrl}/api/trpc`;
