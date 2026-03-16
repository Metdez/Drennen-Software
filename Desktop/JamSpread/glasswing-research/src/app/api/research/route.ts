import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runResearchWorkflow } from '@/lib/workflow';
import type { ResearchResponse } from '@/lib/types';

const RequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export async function POST(req: NextRequest): Promise<NextResponse<ResearchResponse>> {
  let url: string;
  try {
    const body = await req.json();
    ({ url } = RequestSchema.parse(body));
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid URL provided. Please enter a valid URL.' },
      { status: 400 }
    );
  }

  const result = await runResearchWorkflow(url);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Research workflow failed.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, brief: result.brief });
}
