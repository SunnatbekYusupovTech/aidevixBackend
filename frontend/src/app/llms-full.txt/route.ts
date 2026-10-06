import { buildLlmsFullTxt, llmsResponse } from '@/utils/llms';

export const revalidate = 3600;

export async function GET() {
  return llmsResponse(await buildLlmsFullTxt());
}
