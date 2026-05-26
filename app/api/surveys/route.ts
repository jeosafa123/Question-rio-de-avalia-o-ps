import { NextRequest, NextResponse } from 'next/server';
import { getSurveys, createSurvey, getEmailLogs } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const surveys = getSurveys();
    const logs = getEmailLogs();
    
    return NextResponse.json({
      success: true,
      surveys,
      logsCount: logs.length,
    });
  } catch (error) {
    console.error('API Error in /api/surveys:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar pesquisas.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, targetEmail } = body;
    
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'O título da pesquisa é obrigatório.' },
        { status: 400 }
      );
    }
    
    const newSurvey = createSurvey(title, targetEmail || 'jeosafa2017@gmail.com');
    
    return NextResponse.json({
      success: true,
      survey: newSurvey,
    });
  } catch (error) {
    console.error('API Error creating survey:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar pesquisa.' },
      { status: 500 }
    );
  }
}
