import { NextRequest, NextResponse } from 'next/server';
import { getSurveyById, addSubmission, deleteSurvey } from '@/lib/database';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const survey = getSurveyById(id);
    
    if (!survey) {
      return NextResponse.json(
        { success: false, error: 'Pesquisa não encontrada.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      survey,
    });
  } catch (error) {
    console.error('API Error in /api/surveys/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar pesquisa.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;
    const body = await req.json();
    
    const survey = getSurveyById(surveyId);
    if (!survey) {
      return NextResponse.json(
        { success: false, error: 'Pesquisa não encontrada.' },
        { status: 404 }
      );
    }
    
    const { nome, estadoCivil, filhos, religiao, praticante, reside, q1, q1_quais, answers } = body;
    
    // Server-side validation
    if (!nome?.trim() || !estadoCivil?.trim() || !praticante || !reside?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios de identificação não foram preenchidos.' },
        { status: 400 }
      );
    }
    
    const newSubmission = addSubmission(surveyId, {
      nome: nome.trim(),
      estadoCivil: estadoCivil.trim(),
      filhos: filhos?.trim() || '',
      religiao: religiao?.trim() || '',
      praticante,
      reside: reside.trim(),
      q1: q1 || '',
      q1_quais: q1_quais || '',
      answers: answers || {},
    });
    
    if (!newSubmission) {
      return NextResponse.json(
        { success: false, error: 'Erro ao cadastrar resposta.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      submission: newSubmission,
    });
  } catch (error) {
    console.error('API Error in posting submission:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar resposta do questionário.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteSurvey(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Pesquisa não encontrada para exclusão.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pesquisa excluída com sucesso.',
    });
  } catch (error) {
    console.error('API Error in deleting survey:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir pesquisa.' },
      { status: 500 }
    );
  }
}
