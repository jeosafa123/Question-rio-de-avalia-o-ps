import { NextRequest, NextResponse } from 'next/server';
import { getEmailLogs } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const logs = getEmailLogs();
    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('API Error in /api/surveys/logs:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar logs de envio.' },
      { status: 500 }
    );
  }
}
