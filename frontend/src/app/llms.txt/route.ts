import { buildLlmsTxt, llmsResponse } from '@/utils/llms';

// Soatiga bir marta qayta generatsiya — kurslar ro'yxati API'dan keladi.
export const revalidate = 3600;

export async function GET() {
  return llmsResponse(await buildLlmsTxt());
}
