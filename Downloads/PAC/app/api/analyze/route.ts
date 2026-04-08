import { NextRequest, NextResponse } from 'next/server';
import { scoreAllPapers, scoreEntityPapers } from '@/lib/analysis/alignment-scorer';
import { generateAllVerdicts, generateVerdict } from '@/lib/analysis/verdict-generator';
import { analyzeAllMediaFigures, analyzeMediaFigure } from '@/lib/analysis/media-analyzer';
import { getSessionCost, resetSessionCost } from '@/lib/analysis/openrouter-client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { rateLimit } from '@/lib/utils/api-rate-limiter';

let isRunning = false;

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown';
  const rl = rateLimit(ip, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.resetAt },
      { status: 429 }
    );
  }

  // Auth check
  const apiKey = process.env.ANALYSIS_API_KEY;
  if (apiKey) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Concurrency lock
  if (isRunning) {
    return NextResponse.json(
      { error: 'Analysis already running' },
      { status: 409 }
    );
  }

  isRunning = true;
  const startTime = Date.now();
  resetSessionCost();

  try {
    const body = await request.json().catch(() => ({})) as {
      entitySlug?: string;
      type?: 'papers' | 'verdict' | 'media' | 'full';
    };

    const analysisType = body.type ?? 'full';
    const supabase = createServiceRoleClient();

    // Single entity mode
    if (body.entitySlug) {
      const { data: entity } = await supabase
        .from('entities')
        .select('id, name, type')
        .eq('slug', body.entitySlug)
        .single();

      if (!entity) {
        isRunning = false;
        return NextResponse.json({ error: `Entity not found: ${body.entitySlug}` }, { status: 404 });
      }

      const result: Record<string, unknown> = { entityId: entity.id, entityName: entity.name };

      if (entity.type === 'media_amplifier') {
        result.mediaAnalysis = await analyzeMediaFigure(entity.id);
      } else {
        if (analysisType === 'full' || analysisType === 'papers') {
          result.papers = await scoreEntityPapers(entity.id);
        }
        if (analysisType === 'full' || analysisType === 'verdict') {
          result.verdict = await generateVerdict(entity.id);
        }
      }

      const { totalUsd } = getSessionCost();
      const duration = Date.now() - startTime;

      isRunning = false;
      return NextResponse.json({
        success: true,
        results: [result],
        totalCost: totalUsd,
        duration: `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`,
      });
    }

    // Full analysis mode
    let paperResults = { totalScored: 0, totalErrors: 0, costUsd: 0 };
    let verdictResults = { generated: 0, errors: 0, costUsd: 0 };
    let mediaResults = { analyzed: 0, errors: 0, costUsd: 0 };

    if (analysisType === 'full' || analysisType === 'papers') {
      paperResults = await scoreAllPapers();
    }
    if (analysisType === 'full' || analysisType === 'verdict') {
      verdictResults = await generateAllVerdicts();
    }
    if (analysisType === 'full' || analysisType === 'media') {
      mediaResults = await analyzeAllMediaFigures();
    }

    const { totalUsd } = getSessionCost();
    const duration = Date.now() - startTime;

    isRunning = false;
    return NextResponse.json({
      success: true,
      results: {
        papers: paperResults,
        verdicts: verdictResults,
        media: mediaResults,
      },
      totalCost: totalUsd,
      duration: `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`,
    });
  } catch (error) {
    isRunning = false;
    logger.error('Analysis API failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Analysis failed', code: 'ANALYSIS_ERROR' },
      { status: 500 }
    );
  }
}
