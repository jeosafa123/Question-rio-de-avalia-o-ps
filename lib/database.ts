import fs from 'fs';
import path from 'path';

export interface Submission {
  id: string;
  nome: string;
  estadoCivil: string;
  filhos: string;
  religiao: string;
  praticante: string;
  reside: string;
  q1: string;
  q1_quais: string;
  answers: { [key: number]: string };
  submittedAt: string;
}

export interface Survey {
  id: string;
  title: string;
  createdAt: string;
  targetEmail: string;
  submissions: Submission[];
}

export interface EmailLog {
  id: string;
  surveyId: string;
  surveyTitle: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  sentAt: string;
}

interface DatabaseSchema {
  surveys: { [id: string]: Survey };
  emailLogs: EmailLog[];
}

const DB_PATH = path.join(process.cwd(), 'survey_db.json');

// Helper to guarantee the DB is initialized
function getDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial: DatabaseSchema = {
        surveys: {},
        emailLogs: [],
      };
      
      // Seed with an initial sample questionnaire to avoid blank state
      const sampleId = 'pesquisa-geral';
      initial.surveys[sampleId] = {
        id: sampleId,
        title: 'Pesquisa Geral de Bem-estar Emocional',
        createdAt: new Date('2026-05-25T12:00:00Z').toISOString(),
        targetEmail: 'jeosafa2017@gmail.com',
        submissions: [
          {
            id: 'sub-1',
            nome: 'Maria de Souza Antunes',
            estadoCivil: 'Casada',
            filhos: '2',
            religiao: 'Católica',
            praticante: 'Sim',
            reside: 'Família',
            q1: 'Raramente',
            q1_quais: 'Impaciência ao comprar doce',
            submittedAt: new Date('2026-05-25T14:30:00Z').toISOString(),
            answers: {
              2: 'Frequente', // tristeza
              3: 'Nunca', // choro
              4: 'Raramente', // abandoono
              5: 'Sempre', // sono
              6: 'Frequente', // capacidade
              7: 'Nunca', // apetite
              8: 'Raramente', // isolamento
              9: 'Frequente', // mau humor
              10: 'Sempre', // cansado
              11: 'Nunca', // agride
              12: 'Nunca', // morte
              13: 'Frequente', // agitado
              14: 'Raramente', // concentração
              15: 'Nunca', // vozes
              16: 'Nunca', // vultos
              17: 'Nunca', // perseguido
              18: 'Nunca', // agir contra vontade
              19: 'Raramente' // brigas
            }
          },
          {
            id: 'sub-2',
            nome: 'João Ricardo Mendes',
            estadoCivil: 'Solteiro',
            filhos: '0',
            religiao: 'Nenhuma',
            praticante: 'Não',
            reside: 'Sozinho',
            q1: 'Nunca',
            q1_quais: '',
            submittedAt: new Date('2026-05-26T10:15:00Z').toISOString(),
            answers: {
              2: 'Nunca',
              3: 'Nunca',
              4: 'Nunca',
              5: 'Raramente',
              6: 'Nunca',
              7: 'Nunca',
              8: 'Nunca',
              9: 'Raramente',
              10: 'Frequente',
              11: 'Nunca',
              12: 'Nunca',
              13: 'Nunca',
              14: 'Nunca',
              15: 'Nunca',
              16: 'Nunca',
              17: 'Nunca',
              18: 'Nunca',
              19: 'Nunca'
            }
          }
        ]
      };
      
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading/initializing survey DB:', err);
    return { surveys: {}, emailLogs: [] };
  }
}

function saveDB(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing survey DB:', err);
  }
}

export function getSurveys(): Survey[] {
  const db = getDB();
  return Object.values(db.surveys).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getSurveyById(id: string): Survey | null {
  const db = getDB();
  return db.surveys[id] || null;
}

export function createSurvey(title: string, targetEmail: string): Survey {
  const db = getDB();
  const id = 'pesquisa-' + Math.random().toString(36).substring(2, 8);
  const newSurvey: Survey = {
    id,
    title: title.trim() || 'Nova Pesquisa',
    createdAt: new Date().toISOString(),
    targetEmail: targetEmail.trim() || 'jeosafa2017@gmail.com',
    submissions: [],
  };
  
  db.surveys[id] = newSurvey;
  saveDB(db);
  return newSurvey;
}

export function deleteSurvey(id: string): boolean {
  const db = getDB();
  if (db.surveys[id]) {
    delete db.surveys[id];
    saveDB(db);
    return true;
  }
  return false;
}

export function addSubmission(surveyId: string, submissionData: Omit<Submission, 'id' | 'submittedAt'>): Submission | null {
  const db = getDB();
  const survey = db.surveys[surveyId];
  if (!survey) return null;
  
  const id = 'sub-' + Math.random().toString(36).substring(2, 8);
  const newSubmission: Submission = {
    ...submissionData,
    id,
    submittedAt: new Date().toISOString(),
  };
  
  survey.submissions.push(newSubmission);
  
  // Format HTML email report
  const emailContent = generateEmailHtml(survey, newSubmission);
  
  // Create simulated email log
  const emailLog: EmailLog = {
    id: 'msg-' + Math.random().toString(36).substring(2, 8),
    surveyId,
    surveyTitle: survey.title,
    recipient: survey.targetEmail,
    subject: `📋 Relatório de Resposta - ${newSubmission.nome} [${survey.title}]`,
    htmlBody: emailContent,
    sentAt: new Date().toISOString(),
  };
  
  db.emailLogs.unshift(emailLog); // add to top of logs
  saveDB(db);
  
  return newSubmission;
}

export function getEmailLogs(): EmailLog[] {
  const db = getDB();
  return db.emailLogs || [];
}

// Generates beautiful HTML Email template matching current palette styling
function generateEmailHtml(survey: Survey, sub: Submission): string {
  const styleHeader = 'background-color: #3d6b74; padding: 24px; text-align: center; color: white; border-top-left-radius: 8px; border-top-right-radius: 8px;';
  const styleBody = 'font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e2c2f; padding: 20px;';
  const styleTable = 'width: 100%; border-collapse: collapse; margin-top: 15px;';
  const styleTdLabel = 'padding: 8px 12px; border: 1px solid #dde8ea; font-weight: bold; background-color: #f5f3ef; width: 35%;';
  const styleTdVal = 'padding: 8px 12px; border: 1px solid #dde8ea;';
  
  const questionsMap: { [key: number]: string } = {
    1: "Tem comportamento sem controle (compulsivos)?"
  };
  const questionsList = [
    "Você tem sentimento de tristeza e/ou desânimo?",
    "Crises de choro?",
    "Tem sentimentos de abandono?",
    "Dificuldades para dormir?",
    "Duvida da sua própria capacidade?",
    "Falta de apetite ou apetite excessivo?",
    "Tem vontade de ficar isolado sem contato com pessoas?",
    "Apresenta mau humor ou irritação?",
    "Sente-se cansado?",
    "Agride as pessoas com facilidade?",
    "Tem pensamentos de morte?",
    "Sente-se agitado?",
    "Tem falta de concentração?",
    "Costuma ouvir vozes de pessoas que não estão presentes?",
    "Enxerga vultos ou tem visões estranhas?",
    "Sente-se perseguido?",
    "Sente-se obrigado a agir contra a sua vontade?",
    "Costuma ter brigas com familiares ou colegas de trabalho?"
  ];
  questionsList.forEach((q, i) => {
    questionsMap[i + 2] = q;
  });

  let questionsRows = '';
  // Question 1 row
  const q1PillStyle = sub.q1 === 'Sempre' || sub.q1 === 'Frequente' ? 'color: #c0392b; font-weight: bold;' : 'color: #7a9198;';
  questionsRows += `
    <tr>
      <td style="padding: 10px; border: 1px solid #dde8ea; font-size: 13px;"><strong>1.</strong> ${questionsMap[1]}</td>
      <td style="padding: 10px; border: 1px solid #dde8ea; text-align: center; font-size: 13px; ${q1PillStyle}">${sub.q1}</td>
    </tr>
  `;
  if (sub.q1_quais) {
    questionsRows += `
      <tr>
        <td colspan="2" style="padding: 8px 15px; border: 1px solid #dde8ea; background-color: #e8f1f3; font-size: 12px; font-style: italic;">
          <strong>Descrição compulsiva:</strong> ${sub.q1_quais}
        </td>
      </tr>
    `;
  }

  // Row for other questions
  for (let idx = 2; idx <= 19; idx++) {
    const val = sub.answers[idx] || 'Não respondida';
    const cellStyle = val === 'Sempre' || val === 'Frequente' ? 'color: #c0392b; font-weight: bold;' : 'color: #7a9198;';
    questionsRows += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dde8ea; font-size: 13px;"><strong>${idx}.</strong> ${questionsMap[idx]}</td>
        <td style="padding: 10px; border: 1px solid #dde8ea; text-align: center; font-size: 13px; ${cellStyle}">${val}</td>
      </tr>
    `;
  }

  return `
    <div style="max-width: 650px; margin: 0 auto; border: 1px solid #dde8ea; border-radius: 8px; background-color: #ffffff;">
      <div style="${styleHeader}">
        <h2 style="margin: 0; font-size: 20px; font-weight: normal; letter-spacing: 1px;">Relatório de Resposta Individual</h2>
        <p style="margin: 5px 0 0; opacity: 0.8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">${survey.title}</p>
      </div>
      <div style="${styleBody}">
        <p style="margin-top: 0;">Olá,</p>
        <p>Uma nova resposta para o questionário <strong>"${survey.title}"</strong> foi recebida e processada em <strong>${new Date().toLocaleDateString('pt-BR')}</strong> às <strong>${new Date().toLocaleTimeString('pt-BR')}</strong>.</p>
        
        <h3 style="color: #3d6b74; border-bottom: 2px solid #a8c8ce; padding-bottom: 4px; margin-top: 25px; font-size: 15px;">1. Perfil de Identificação</h3>
        <table style="${styleTable}">
          <tr>
            <td style="${styleTdLabel}">Nome Completo:</td>
            <td style="${styleTdVal}"><strong>${sub.nome}</strong></td>
          </tr>
          <tr>
            <td style="${styleTdLabel}">Estado Civil:</td>
            <td style="${styleTdVal}">${sub.estadoCivil}</td>
          </tr>
          <tr>
            <td style="${styleTdLabel}">Filhos:</td>
            <td style="${styleTdVal}">${sub.filhos || 'Não especificado'}</td>
          </tr>
          <tr>
            <td style="${styleTdLabel}">Religião:</td>
            <td style="${styleTdVal}">${sub.religiao || 'Não especificada'} (Praticante: ${sub.praticante})</td>
          </tr>
          <tr>
            <td style="${styleTdLabel}">Residência:</td>
            <td style="${styleTdVal}">${sub.reside}</td>
          </tr>
        </table>

        <h3 style="color: #3d6b74; border-bottom: 2px solid #a8c8ce; padding-bottom: 4px; margin-top: 30px; font-size: 15px;">2. Avaliação das Situações Clínicas</h3>
        <table style="${styleTable}">
          <thead>
            <tr style="background-color: #3d6b74; color: white;">
              <th style="padding: 10px; text-align: left; font-size: 13px;">Marcador Clínico</th>
              <th style="padding: 10px; width: 25%; font-size: 13px;">Frequência</th>
            </tr>
          </thead>
          <tbody>
            ${questionsRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding: 15px; background-color: #e8f1f3; border-radius: 6px; border: 1px solid #a8c8ce;">
          <p style="margin: 0; font-size: 12px; color: #3d6b74; font-weight: bold;">Declaração do Respondente:</p>
          <p style="margin: 5px 0 0; font-size: 12px; font-style: italic; color: #1e2c2f;">
            "Declaro serem verdadeiras as informações relatadas acima, assumindo total responsabilidade pelas respostas fornecidas neste questionário." 
            <br/><strong>- Status: Aceito e Confirmado via Checkbox digital em ${new Date().toLocaleDateString('pt-BR')}.</strong>
          </p>
        </div>

        <p style="margin-top: 30px; font-size: 11px; color: #7a9198; text-align: center; border-top: 1px dashed #dde8ea; padding-top: 15px;">
          Este é um envio automatizado e seguro. Todos os dados coletados respeitam total confidencialidade clínica.
        </p>
      </div>
    </div>
  `;
}
