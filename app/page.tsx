'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Activity, 
  ShieldCheck, 
  FileText, 
  Heart,
  Info,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Mail,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  Inbox
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Cell,
  Legend,
  Pie
} from 'recharts';

// Types definition matching the database responses
interface Submission {
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

interface Survey {
  id: string;
  title: string;
  createdAt: string;
  targetEmail: string;
  submissions: Submission[];
}

interface EmailLog {
  id: string;
  surveyId: string;
  surveyTitle: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  sentAt: string;
}

const opts = ["Nunca", "Raramente", "Frequente", "Sempre"];

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

// Main export wrapping the page in a Suspense boundary for useSearchParams compatibility
export default function SafePage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen w-full flex-col items-center justify-center bg-brand-bg text-brand-text">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-4" />
        <p className="text-sm font-medium">Carregando questionário...</p>
      </div>
    }>
      <QuestionnaireApp />
    </React.Suspense>
  );
}

function QuestionnaireApp() {
  const searchParams = useSearchParams();
  const surveyIdParam = searchParams.get('id');

  const [isMounted, setIsMounted] = React.useState(false);
  const [appUrl, setAppUrl] = React.useState('');
  
  // States for Admin Dashboard
  const [surveys, setSurveys] = React.useState<Survey[]>([]);
  const [emailLogs, setEmailLogs] = React.useState<EmailLog[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = React.useState(true);
  const [newSurveyTitle, setNewSurveyTitle] = React.useState('');
  const [newSurveyEmail, setNewSurveyEmail] = React.useState('jeosafa2017@gmail.com');
  const [selectedSurvey, setSelectedSurvey] = React.useState<Survey | null>(null);
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null);
  
  // Copy to clipboard notifications
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = React.useState<'links' | 'logs'>('links');

  // States for Questionnaire Completer
  const [surveyConfig, setSurveyConfig] = React.useState<Survey | null>(null);
  const [isLoadingSurvey, setIsLoadingSurvey] = React.useState(false);
  const [surveyError, setSurveyError] = React.useState<string | null>(null);
  const [formValues, setFormValues] = React.useState({
    nome: '',
    estadoCivil: '',
    filhos: '',
    religiao: '',
    praticante: '',
    reside: '',
    q1: '',
    q1_quais: '',
    answers: {} as { [key: number]: string },
    declaracao: false,
  });
  const [currentStep, setCurrentStep] = React.useState(0);
  const [errors, setErrors] = React.useState<{ [key: string]: boolean }>({});
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = React.useState(false);
  const [submittingAnswersStatus, setSubmittingAnswersStatus] = React.useState(false);

  // Load mount and base host url safely
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const host = window.location.origin;
      setAppUrl(host);
    }
  }, []);

  // Sync dashboard data
  const fetchDashboardData = React.useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const res = await fetch('/api/surveys');
      const data = await res.json();
      if (data.success) {
        setSurveys(data.surveys);
        
        // Pick the first survey as default selected if none is active, or keep the existing selected one up-to-date
        setSelectedSurvey(prevSelected => {
          if (!prevSelected) {
            return data.surveys.length > 0 ? data.surveys[0] : null;
          }
          const updated = data.surveys.find((s: Survey) => s.id === prevSelected.id);
          return updated || prevSelected;
        });
      }
      
      const logsRes = await fetch('/api/surveys/logs');
      const logsData = await logsRes.json();
      if (logsData.success) {
        setEmailLogs(logsData.logs);
      }
    } catch (err) {
      console.error('Error fetching dashboard datasets:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  // Sync specific survey config for respondents
  React.useEffect(() => {
    if (surveyIdParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingSurvey(true);
      setSurveyError(null);
      fetch(`/api/surveys/${surveyIdParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSurveyConfig(data.survey);
          } else {
            setSurveyError(data.error || 'Link ou questionário inválido.');
          }
        })
        .catch(err => {
          console.error('Failed loading survey:', err);
          setSurveyError('Erro de conexão ao carregar o questionário.');
        })
        .finally(() => {
          setIsLoadingSurvey(false);
        });
    } else {
      // We are on Admin Dashboard, let's load dashboard details
      fetchDashboardData();
    }
  }, [surveyIdParam, fetchDashboardData]);

  // Handle survey generation
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurveyTitle.trim()) return;
    
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSurveyTitle,
          targetEmail: newSurveyEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSurveyTitle('');
        await fetchDashboardData();
        // Automatically select the newly created survey
        setSelectedSurvey(data.survey);
      }
    } catch (err) {
      console.error('Error creating new survey instance:', err);
    }
  };

  // Handle survey deletions
  const handleDeleteSurvey = async (id: string) => {
    if (!confirm('Deseja realmente apagar esta pesquisa e todas as suas respostas relacionadas?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (selectedSurvey?.id === id) {
          setSelectedSurvey(null);
          setSelectedSubmission(null);
        }
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed deleting survey:', err);
    }
  };

  // Copy helper
  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Handlers for respondent filling of the questionnaire
  const handleInputChange = (field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleRadioChange = (field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAnswerChange = (qNum: number, value: string) => {
    setFormValues(prev => ({
      ...prev,
      answers: { ...prev.answers, [qNum]: value }
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: boolean } = {};
    let isValid = true;

    if (step === 0) {
      if (!formValues.nome.trim()) {
        newErrors.nome = true;
        isValid = false;
      }
      if (!formValues.estadoCivil.trim()) {
        newErrors.estadoCivil = true;
        isValid = false;
      }
      if (!formValues.praticante) {
        newErrors.praticante = true;
        isValid = false;
      }
      if (!formValues.reside.trim()) {
        newErrors.reside = true;
        isValid = false;
      }
    } else if (step === 1) {
      // Dynamic questions have fallback fallback default state or permit blanks (client soft-validation)
      // Original script has optional fill-out so no blocking page here.
    } else if (step === 2) {
      if (!formValues.declaracao) {
        newErrors.declaracao = true;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitRespondentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2)) return;
    
    setSubmittingAnswersStatus(true);
    try {
      const res = await fetch(`/api/surveys/${surveyIdParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (data.success) {
        setIsSubmittedSuccessfully(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(data.error || 'Erro ao enviar respostas.');
      }
    } catch (err) {
      console.error('Failed submitting answers:', err);
      alert('Erro de rede ao enviar respostas. Verifique a conexão.');
    } finally {
      setSubmittingAnswersStatus(false);
    }
  };

  const handleResetSurveyCompleter = () => {
    setFormValues({
      nome: '',
      estadoCivil: '',
      filhos: '',
      religiao: '',
      praticante: '',
      reside: '',
      q1: '',
      q1_quais: '',
      answers: {},
      declaracao: false,
    });
    setIsSubmittedSuccessfully(false);
    setCurrentStep(0);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  /* -------------------------------------------------------------
     CHART DATA PROCESSING FOR THE ACTIVE SELECTED SURVEY
  ---------------------------------------------------------------- */
  const getSymptomChartData = () => {
    if (!selectedSurvey || selectedSurvey.submissions.length === 0) return [];

    const stats = [
      { name: '1. Comport. Compulsivo', key: 1, count: 0 },
      { name: '2. Sentim. Tristeza', key: 2, count: 0 },
      { name: '3. Crises Choro', key: 3, count: 0 },
      { name: '4. Abandono', key: 4, count: 0 },
      { name: '5. Distúrbios Sono', key: 5, count: 0 },
      { name: '6. Autodúvida', key: 6, count: 0 },
      { name: '10. Cansaço Físico', key: 10, count: 0 },
      { name: '12. Ideia Morte', key: 12, count: 0 },
    ];

    selectedSurvey.submissions.forEach(sub => {
      // Question 1
      if (sub.q1 === 'Frequente' || sub.q1 === 'Sempre') {
        stats[0].count += 1;
      }
      
      // Other questions
      stats.slice(1).forEach(item => {
        const val = sub.answers[item.key];
        if (val === 'Frequente' || val === 'Sempre') {
          item.count += 1;
        }
      });
    });

    return stats;
  };

  const getResidenceChartData = () => {
    if (!selectedSurvey || selectedSurvey.submissions.length === 0) return [];
    
    const countMap: { [key: string]: number } = {};
    selectedSurvey.submissions.forEach(sub => {
      const res = (sub.reside || 'Outros').trim().toLowerCase();
      let label = 'Outros';
      if (res.includes('família') || res.includes('familia')) label = 'Família';
      else if (res.includes('só') || res.includes('sozinho') || res.includes('sózinha')) label = 'Sozinho(a)';
      else if (res.includes('cônjuge') || res.includes('conjuge') || res.includes('marido') || res.includes('esposa')) label = 'Cônjuge';
      else if (res.includes('amigo') || res.includes('colegas')) label = 'Colegas';
      
      countMap[label] = (countMap[label] || 0) + 1;
    });

    return Object.keys(countMap).map((name, idx) => ({
      name,
      value: countMap[name],
      color: ['#3d6b74', '#a8c8ce', '#2d7a5e', '#7a9198', '#c0392b'][idx % 5],
    }));
  };

  const totalRespondents = selectedSurvey?.submissions.length || 0;
  const symptomDataForBar = getSymptomChartData();
  const residenceDataForPie = getResidenceChartData();


  /* -------------------------------------------------------------
     RENDER LOGIC A - RESPONDENT SURVEY SCREEN (?id=xyz)
  ---------------------------------------------------------------- */
  if (surveyIdParam) {
    if (isLoadingSurvey) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg text-brand-text">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-accent mb-4" />
          <p className="text-sm font-medium">Carregando questionário clínico...</p>
        </div>
      );
    }

    if (surveyError || !surveyConfig) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg text-brand-text px-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-brand-danger rounded-full flex items-center justify-center mb-6">
            <Info className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-light text-brand-text mb-2">Questionário Indisponível</h2>
          <p className="text-brand-muted text-sm max-w-md mb-8">
            {surveyError || 'O link acessado é inválido ou foi removido pelo criador da pesquisa.'}
          </p>
          <Link 
            href="/"
            className="px-6 py-2.5 bg-brand-accent text-white rounded-lg text-xs font-semibold hover:bg-brand-accent-hover transition-colors"
          >
            Ir para a Área Administrativa
          </Link>
        </div>
      );
    }

    return (
      <main className="w-full min-h-screen flex flex-col items-center pb-20 justify-start bg-brand-bg" id="questionnaire-respondent-app">
        {/* HEADER BAR FOR CUSTOMIZED SURVEY */}
        <header className="w-full bg-brand-accent py-9 px-6 text-center relative overflow-hidden" id="app-header-respondent">
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-2.5 p-1.5 bg-brand-accent-light/10 border border-brand-accent-mid/20 rounded-full"
            >
              <Heart className="w-5 h-5 text-brand-accent-light" />
            </motion.div>
            <motion.h1 
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-serif text-2xl md:text-3xl font-light text-white tracking-wide leading-tight max-w-md"
            >
              {surveyConfig.title}
            </motion.h1>
            <motion.p 
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-white/70 text-[9px] md:text-xs font-medium tracking-widest uppercase mt-3"
            >
              Saúde &amp; Bem-estar Emocional
            </motion.p>
          </div>
        </header>

        {/* COMPRESSION PROGRESS bar */}
        {!isSubmittedSuccessfully && (
          <section className="w-full max-w-2xl px-6 pt-8 pb-2" id="steps-progress-respondent">
            <div className="flex items-center justify-between relative">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full border-2 transition-all duration-400 flex items-center justify-center text-xs font-semibold
                  ${currentStep === 0 
                    ? 'bg-brand-accent border-brand-accent text-white shadow-[0_0_0_4px_rgba(61,107,116,0.15)] scale-105' 
                    : currentStep > 0
                      ? 'bg-brand-accent border-brand-accent text-white' 
                      : 'bg-white border-brand-border text-brand-muted'}`}
                >
                  {currentStep > 0 ? <Check className="w-4 h-4" /> : 1}
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-semibold mt-2 transition-colors duration-300
                  ${currentStep === 0 ? 'text-brand-accent' : 'text-brand-muted'}`}
                >
                  Identificação
                </span>
              </div>

              {/* Line 1-2 */}
              <div className="flex-1 h-[2px] -mt-5 bg-brand-border relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-brand-accent transition-all duration-500 ease-out" 
                  style={{ width: currentStep > 0 ? '100%' : '0%' }}
                />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full border-2 transition-all duration-400 flex items-center justify-center text-xs font-semibold
                  ${currentStep === 1 
                    ? 'bg-brand-accent border-brand-accent text-white shadow-[0_0_0_4px_rgba(61,107,116,0.15)] scale-105' 
                    : currentStep > 1
                      ? 'bg-brand-accent border-brand-accent text-white' 
                      : 'bg-white border-brand-border text-brand-muted'}`}
                >
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : 2}
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-semibold mt-2 transition-colors duration-300
                  ${currentStep === 1 ? 'text-brand-accent' : 'text-brand-muted'}`}
                >
                  Avaliação
                </span>
              </div>

              {/* Line 2-3 */}
              <div className="flex-1 h-[2px] -mt-5 bg-brand-border relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-brand-accent transition-all duration-500 ease-out" 
                  style={{ width: currentStep > 1 ? '100%' : '0%' }}
                />
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-8.5 h-8.5 rounded-full border-2 transition-all duration-400 flex items-center justify-center text-xs font-semibold
                  ${currentStep === 2 
                    ? 'bg-brand-accent border-brand-accent text-white shadow-[0_0_0_4px_rgba(61,107,116,0.15)] scale-105' 
                    : 'bg-white border-brand-border text-brand-muted'}`}
                >
                  3
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-semibold mt-2 transition-colors duration-300
                  ${currentStep === 2 ? 'text-brand-accent' : 'text-brand-muted'}`}
                >
                  Finalização
                </span>
              </div>

            </div>
          </section>
        )}

        {/* CONTAINER CARD FOR QUESTIONS */}
        <div className="w-full max-w-2xl px-4 mt-4">
          <AnimatePresence mode="wait">
            {isSubmittedSuccessfully ? (
              /* RESPONDENT SUCCESS SCREEN */
              <motion.div
                key="respondent-success"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-brand-surface rounded-2xl shadow-xl p-8 md:p-12 border border-brand-border text-center overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-success" />
                <div className="w-20 h-20 bg-brand-accent-light rounded-full border-2 border-brand-accent-mid/30 flex items-center justify-center text-3xl mx-auto mb-6">
                  🌿
                </div>
                
                <h2 className="font-serif text-3xl font-normal text-brand-text mb-3">
                  Respostas Enviadas!
                </h2>
                <p className="text-brand-muted text-[14px] leading-relaxed max-w-md mx-auto mb-6">
                  Seu questionário foi processado e entregue com sucesso para a caixa de e-mail do avaliador (<span className="text-brand-accent font-medium">{surveyConfig.targetEmail}</span>).
                </p>

                <div className="bg-brand-bg rounded-xl p-5 text-left mb-8 border border-brand-border max-w-md mx-auto">
                  <div className="flex gap-2.5 items-start text-xs text-brand-text">
                    <CheckCircle2 className="w-5 h-5 text-brand-success shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">O que acontece agora?</span>
                      <span className="text-brand-muted leading-relaxed">
                        Seu profissional de saúde irá avaliar suas respostas e gerará um relatório clínico detalhado. Suas respostas são guardadas sob total confidencialidade ética.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-white border border-brand-border hover:border-brand-accent text-brand-text hover:text-brand-accent rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Imprimir Comprovante 🖨️
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSurveyCompleter}
                    className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Responder Novamente
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={submitRespondentForm} noValidate>
                {/* STEP 1: IDENTIFICAÇÃO */}
                {currentStep === 0 && (
                  <motion.div
                    key="step-0-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-brand-surface rounded-2xl shadow-md p-6 md:p-10 border border-brand-border"
                  >
                    <div className="text-[10px] md:text-xs text-brand-accent font-semibold tracking-widest uppercase mb-1">
                      Seção 1 de 3
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl font-light text-brand-text pb-4 border-b border-brand-border mb-8">
                      Identificação do Respondente
                    </h2>

                    {/* NOME COMPLETO */}
                    <div className="mb-6">
                      <label htmlFor="nome" className="block text-[13px] font-semibold text-brand-text mb-2">
                        Nome Completo <span className="text-brand-accent ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        id="nome"
                        value={formValues.nome}
                        onChange={e => handleInputChange('nome', e.target.value)}
                        placeholder="Digite seu nome completo"
                        className={`w-full border rounded-lg px-4 py-3 text-[14px] bg-brand-bg md:bg-brand-bg/50 focus:bg-white outline-none transition-all duration-200
                          ${errors.nome ? 'border-brand-danger bg-brand-danger/5 ring-1 ring-brand-danger/40' : 'border-brand-border focus:border-brand-accent focus:ring-2 focus:ring-brand-accent-light'}`}
                      />
                      {errors.nome && (
                        <span className="text-[11px] text-brand-danger block mt-1.5 font-medium">Este campo é obrigatório.</span>
                      )}
                    </div>

                    {/* ESTADO CIVIL */}
                    <div className="mb-6">
                      <label htmlFor="estadoCivil" className="block text-[13px] font-semibold text-brand-text mb-2">
                        Estado Civil <span className="text-brand-accent ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        id="estadoCivil"
                        value={formValues.estadoCivil}
                        onChange={e => handleInputChange('estadoCivil', e.target.value)}
                        placeholder="Ex: Solteiro(a), Casado(a), Divorciado(a)..."
                        className={`w-full border rounded-lg px-4 py-3 text-[14px] bg-brand-bg md:bg-brand-bg/50 focus:bg-white outline-none transition-all duration-200
                          ${errors.estadoCivil ? 'border-brand-danger bg-brand-danger/5 ring-1 ring-brand-danger/40' : 'border-brand-border focus:border-brand-accent focus:ring-2 focus:ring-brand-accent-light'}`}
                      />
                      {errors.estadoCivil && (
                        <span className="text-[11px] text-brand-danger block mt-1.5 font-medium">Este campo é obrigatório.</span>
                      )}
                    </div>

                    {/* FILHOS & RELIGIAO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6 mb-6">
                      <div>
                        <label htmlFor="filhos" className="block text-[13px] font-semibold text-brand-text mb-2">
                          Número de Filhos
                        </label>
                        <input
                          type="text"
                          id="filhos"
                          value={formValues.filhos}
                          onChange={e => handleInputChange('filhos', e.target.value)}
                          placeholder="Ex: 2"
                          className="w-full border border-brand-border rounded-lg px-4 py-3 text-[14px] bg-brand-bg md:bg-brand-bg/50 focus:bg-white focus:border-brand-accent outline-none focus:ring-2 focus:ring-brand-accent-light transition-all duration-250"
                        />
                      </div>

                      <div>
                        <label htmlFor="religiao" className="block text-[13px] font-semibold text-brand-text mb-2">
                          Religião
                        </label>
                        <input
                          type="text"
                          id="religiao"
                          value={formValues.religiao}
                          onChange={e => handleInputChange('religiao', e.target.value)}
                          placeholder="Ex: Católica, Evangélica, Espírita..."
                          className="w-full border border-brand-border rounded-lg px-4 py-3 text-[14px] bg-brand-bg md:bg-brand-bg/50 focus:bg-white focus:border-brand-accent outline-none focus:ring-2 focus:ring-brand-accent-light transition-all duration-250"
                        />
                      </div>
                    </div>

                    {/* PRATICANTE */}
                    <div className="mb-6">
                      <label className="block text-[13px] font-semibold text-brand-text mb-2.5">
                        Praticante de alguma religião? <span className="text-brand-accent ml-0.5">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['Sim', 'Não'].map(option => (
                          <label key={option} className="cursor-pointer select-none">
                            <input
                              type="radio"
                              name="praticante"
                              value={option}
                              checked={formValues.praticante === option}
                              onChange={() => handleRadioChange('praticante', option)}
                              className="sr-only"
                            />
                            <div className={`px-5 py-2.5 rounded-full border text-[13px] transition-all duration-200
                              ${formValues.praticante === option 
                                ? 'bg-brand-accent border-brand-accent text-white font-medium shadow-md' 
                                : 'bg-brand-bg text-brand-muted border-brand-border hover:border-brand-accent-mid'}`}
                            >
                              {option}
                            </div>
                          </label>
                        ))}
                      </div>
                      {errors.praticante && (
                        <span className="text-[11px] text-brand-danger block mt-2 font-medium">Por favor, selecione uma opção.</span>
                      )}
                    </div>

                    {/* RESIDE */}
                    <div className="mb-8">
                      <label htmlFor="reside" className="block text-[13px] font-semibold text-brand-text mb-2">
                        Com quem reside atualmente? <span className="text-brand-accent ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        id="reside"
                        value={formValues.reside}
                        onChange={e => handleInputChange('reside', e.target.value)}
                        placeholder="Ex: Família, Cônjuge, Sozinho(a)..."
                        className={`w-full border rounded-lg px-4 py-3 text-[14px] bg-brand-bg md:bg-brand-bg/50 focus:bg-white outline-none transition-all duration-200
                          ${errors.reside ? 'border-brand-danger bg-brand-danger/5 ring-1 ring-brand-danger/40' : 'border-brand-border focus:border-brand-accent focus:ring-2 focus:ring-brand-accent-light'}`}
                      />
                      {errors.reside && (
                        <span className="text-[11px] text-brand-danger block mt-1.5 font-medium">Este campo é obrigatório.</span>
                      )}
                    </div>

                    {/* NAV ROW */}
                    <div className="flex justify-between items-center pt-6 border-t border-brand-border mt-8">
                      <div />
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center gap-1"
                      >
                        Próximo <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: AVALIAÇÃO DE BEM-ESTAR */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-brand-surface rounded-2xl shadow-md p-6 md:p-10 border border-brand-border"
                  >
                    <div className="text-[10px] md:text-xs text-brand-accent font-semibold tracking-widest uppercase mb-1">
                      Seção 2 de 3
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl font-light text-brand-text pb-4 border-b border-brand-border mb-4">
                      Avaliação de Bem-estar
                    </h2>

                    <p className="text-[12px] text-brand-muted leading-relaxed mb-8 bg-brand-accent-light/30 p-4 border-l-2 border-brand-accent rounded-r-lg">
                      Responda com que frequência você experimenta as situações descritas abaixo. Suas respostas são inteiramente confidenciais.
                    </p>

                    <div className="space-y-8">
                      
                      {/* Question 1 (Special Conditionals) */}
                      <div className="border-b border-brand-border pb-6">
                        <div className="text-[14px] text-brand-text leading-relaxed mb-3.5 flex items-start gap-1">
                          <span className="font-semibold text-brand-accent mr-1">1.</span>
                          <span>Tem comportamento sem controle (compulsivos)?</span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {opts.map(o => (
                            <label key={o} className="cursor-pointer select-none">
                              <input
                                type="radio"
                                name="q1"
                                value={o}
                                checked={formValues.q1 === o}
                                onChange={() => handleRadioChange('q1', o)}
                                className="sr-only"
                              />
                              <div className={`w-full py-2.5 px-2 rounded-lg border text-center text-xs transition-all duration-200
                                ${formValues.q1 === o 
                                  ? 'bg-brand-accent border-brand-accent text-white font-medium shadow-sm' 
                                  : 'bg-brand-bg text-brand-muted border-brand-border hover:border-brand-accent-mid'}`}
                              >
                                {o}
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Special Quais text */}
                        {formValues.q1 && formValues.q1 !== 'Nunca' && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 14 }}
                            className="overflow-hidden"
                          >
                            <label htmlFor="q1-quais" className="block text-[11px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">
                              Se sim, quais compulsões?
                            </label>
                            <input
                              type="text"
                              id="q1-quais"
                              value={formValues.q1_quais}
                              onChange={e => handleInputChange('q1_quais', e.target.value)}
                              placeholder="Descreva se desejar..."
                              className="w-full border border-brand-border rounded-lg px-3 py-2 text-[13px] bg-brand-bg focus:bg-white focus:border-brand-accent outline-none transition-all duration-200"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Loop for questions 2 to 19 */}
                      {questionsList.map((qText, index) => {
                        const qNum = index + 2;
                        return (
                          <div key={qNum} className="border-b border-brand-border pb-6 last:border-b-0 last:pb-2">
                            <div className="text-[14px] text-brand-text leading-relaxed mb-3.5 flex items-start gap-1">
                              <span className="font-semibold text-brand-accent mr-1">{qNum}.</span>
                              <span>{qText}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {opts.map(o => (
                                <label key={o} className="cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`q${qNum}`}
                                    value={o}
                                    checked={formValues.answers[qNum] === o}
                                    onChange={() => handleAnswerChange(qNum, o)}
                                    className="sr-only"
                                  />
                                  <div className={`w-full py-2.5 px-2 rounded-lg border text-center text-xs transition-all duration-200
                                    ${formValues.answers[qNum] === o 
                                      ? 'bg-brand-accent border-brand-accent text-white font-medium shadow-sm' 
                                      : 'bg-brand-bg text-brand-muted border-brand-border hover:border-brand-accent-mid'}`}
                                  >
                                    {o}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                    </div>

                    {/* NAV ROWS */}
                    <div className="flex justify-between items-center pt-6 border-t border-brand-border mt-10">
                      <button
                        type="button"
                        onClick={handleBackStep}
                        className="px-5 py-3 border border-brand-border text-brand-muted hover:text-brand-accent rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center gap-1"
                      >
                        Próximo <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: FINALIZAÇÃO */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-brand-surface rounded-2xl shadow-md p-6 md:p-10 border border-brand-border"
                  >
                    <div className="text-[10px] md:text-xs text-brand-accent font-semibold tracking-widest uppercase mb-1">
                      Seção 3 de 3
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl font-light text-brand-text pb-4 border-b border-brand-border mb-8">
                      Finalização
                    </h2>

                    {/* DECLARATION BOX */}
                    <div className="bg-brand-accent-light/60 border border-brand-accent-mid/30 rounded-xl p-6 mb-8">
                      <p className="text-[13px] text-brand-text leading-relaxed font-serif italic mb-6">
                        &ldquo;Declaro serem verdadeiras as informações relatadas acima, assumindo total responsabilidade pelas respostas fornecidas neste questionário.&rdquo;
                      </p>

                      <label className="flex items-start gap-3.5 cursor-pointer select-none" htmlFor="declaracao-checkbox">
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            id="declaracao-checkbox"
                            checked={formValues.declaracao}
                            onChange={e => setFormValues(prev => ({ ...prev, declaracao: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                            ${formValues.declaracao 
                              ? 'bg-brand-accent border-brand-accent text-white scale-100' 
                              : 'bg-white border-brand-accent text-transparent'}`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                        </div>
                        <span className="text-[13px] font-semibold text-brand-accent leading-relaxed">
                          Concordo com a declaração acima
                        </span>
                      </label>

                      {errors.declaracao && (
                        <span className="text-[11px] text-brand-danger block mt-3 font-semibold flex items-center gap-1 animate-pulse">
                          <Info className="w-3.5 h-3.5" />
                          Você precisa aceitar a declaração de responsabilidade para enviar.
                        </span>
                      )}
                    </div>

                    {/* ADVISORY INFO */}
                    <div className="flex gap-3 text-xs text-brand-muted leading-relaxed bg-brand-bg rounded-lg p-4 border border-brand-border">
                      <ShieldCheck className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                      <p>
                        Seu questionário será enviado e gerará relatórios automáticos. Os dados digitados são analisados de forma sigilosa pelo profissional avaliador.
                      </p>
                    </div>

                    {/* NAV ACTIONS */}
                    <div className="flex justify-between items-center pt-6 border-t border-brand-border mt-10">
                      <button
                        type="button"
                        onClick={handleBackStep}
                        className="px-5 py-3 border border-brand-border text-brand-muted hover:text-brand-accent rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAnswersStatus}
                        className="px-7 py-3 bg-brand-success hover:bg-[#236249] disabled:bg-brand-muted text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center gap-1.5"
                      >
                        {submittingAnswersStatus ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            Enviar Questionário <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            )}
          </AnimatePresence>
        </div>
      </main>
    );
  }

  /* -------------------------------------------------------------
     RENDER LOGIC B - ADMINISTRATIVE / CREATOR DASHBOARD (/)
  ---------------------------------------------------------------- */
  return (
    <main className="w-full bg-brand-bg min-h-screen text-brand-text flex flex-col" id="dashboard-admin-app">
      
      {/* GLAMOROUS MASTER BAR */}
      <nav className="w-full bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-accent flex items-center justify-center text-white font-serif font-black text-lg">
            Ψ
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold tracking-tight text-brand-text">Painel Diagnóstico</h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">Gestão de Questionários Clínicos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs bg-brand-accent-light text-brand-accent px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 border border-brand-accent-mid/20">
            <User className="w-3 h-3 text-brand-accent" />
            Profissional de Saúde
          </span>
        </div>
      </nav>

      <div className="max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* LEFT COLUMN: SURVEY LIST AND CREATION (SPAN 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* SURVEY CREATION PANEL */}
          <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-sm">
            <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-accent" />
              Gerador de Pesquisas
            </h2>
            
            <form onSubmit={handleCreateSurvey} className="space-y-4">
              <div>
                <label htmlFor="survey-title-input" className="block text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1.5">
                  Identificador / Título da Pesquisa
                </label>
                <input
                  type="text"
                  id="survey-title-input"
                  required
                  placeholder="Ex: Turma Psicologia 2026-A"
                  value={newSurveyTitle}
                  onChange={e => setNewSurveyTitle(e.target.value)}
                  className="w-full border border-brand-border rounded-lg px-3.5 py-2.5 text-xs bg-brand-bg focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent-light outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="survey-email-input" className="block text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1.5">
                  E-mail de Destino Fixo (Script)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3">
                    <Mail className="w-3.5 h-3.5 text-brand-muted" />
                  </span>
                  <input
                    type="email"
                    id="survey-email-input"
                    required
                    placeholder="email@clinica.com"
                    value={newSurveyEmail}
                    onChange={e => setNewSurveyEmail(e.target.value)}
                    className="w-full border border-brand-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs bg-brand-bg focus:bg-white focus:border-brand-accent focus:ring-2 focus:ring-brand-accent-light outline-none transition-all duration-200"
                  />
                </div>
                <span className="text-[10px] text-brand-muted block mt-1 leading-relaxed">
                  Os relatórios desta pesquisa serão despachados a esta caixa postal fixa.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                Gerar Link Único <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* TAB SYSTEM LINKS VS SENT LOGS */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="flex border-b border-brand-border bg-brand-bg/50">
              <button
                type="button"
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 
                  ${dashboardTab === 'links' 
                    ? 'border-brand-accent text-brand-accent bg-white' 
                    : 'border-transparent text-brand-muted hover:text-brand-text'}`}
                onClick={() => setDashboardTab('links')}
              >
                Pesquisas Geradas ({surveys.length})
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 
                  ${dashboardTab === 'logs' 
                    ? 'border-brand-accent text-brand-accent bg-white' 
                    : 'border-transparent text-brand-muted hover:text-brand-text'}`}
                onClick={() => setDashboardTab('logs')}
              >
                Correio Envia ({emailLogs.length})
              </button>
            </div>

            {dashboardTab === 'links' ? (
              /* SURVEYS LIST */
              <div className="divide-y divide-brand-border overflow-y-auto max-h-[450px] flex-1">
                {surveys.length === 0 ? (
                  <div className="p-8 text-center text-brand-muted text-xs">
                    Nenhuma pesquisa ativa cadastrada. Utilize o gerador acima!
                  </div>
                ) : (
                  surveys.map(s => {
                    const isSelected = selectedSurvey?.id === s.id;
                    const fullSurveyUrl = appUrl ? `${appUrl}/?id=${s.id}` : `/?id=${s.id}`;
                    return (
                      <div 
                        key={s.id} 
                        className={`p-4 transition-colors cursor-pointer flex flex-col gap-2 
                          ${isSelected ? 'bg-brand-accent-light/45 border-l-3 border-brand-accent' : 'hover:bg-brand-bg/40'}`}
                        onClick={() => {
                          setSelectedSurvey(s);
                          setSelectedSubmission(null);
                        }}
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div>
                            <span className="text-[10px] font-bold tracking-wider text-brand-muted block uppercase">
                              ID: {s.id}
                            </span>
                            <strong className="text-xs text-brand-text font-semibold block leading-snug">
                              {s.title}
                            </strong>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSurvey(s.id);
                            }}
                            className="p-1 text-brand-muted hover:text-brand-danger rounded hover:bg-red-50 transition-colors"
                            title="Deletar Pesquisa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[10x] text-brand-muted flex items-center gap-1 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-brand-accent shrink-0" />
                          <span className="truncate" title={s.targetEmail}>{s.targetEmail}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] bg-brand-accent/10 text-brand-accent font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ready-badge">
                            <Users className="w-2.5 h-2.5" /> {s.submissions.length} resposta(s)
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {/* Copy share link button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(fullSurveyUrl, s.id);
                              }}
                              className="px-2 py-1 bg-brand-accent text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors hover:bg-brand-accent-hover select-none shrink-0"
                            >
                              <Copy className="w-2.5 h-2.5" /> 
                              {copiedId === s.id ? 'Copiado!' : 'Copiar Link'}
                            </button>
                            <a
                              href={`/?id=${s.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 border border-brand-border hover:border-brand-accent text-brand-text hover:text-brand-accent rounded transition-colors"
                              title="Testar Questionário"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* EMAIL DESPATCH LOGS */
              <div className="divide-y divide-brand-border overflow-y-auto max-h-[450px] flex-1">
                {emailLogs.length === 0 ? (
                  <div className="p-8 text-center text-brand-muted text-xs">
                    Nenhum e-mail enviado ainda. Responda um questionário para ver os e-mails sendo enviados!
                  </div>
                ) : (
                  emailLogs.map(log => (
                    <div 
                      key={log.id} 
                      className="p-4 hover:bg-brand-bg/30 cursor-pointer text-xs"
                      onClick={() => {
                        // Open a custom window or modal with the email content
                        const popup = window.open('', '_blank');
                        if (popup) {
                          popup.document.write(`
                            <html>
                              <head><title>${log.subject}</title></head>
                              <body style="background:#f5f3ef; padding:40px; margin:0;">
                                ${log.htmlBody}
                              </body>
                            </html>
                          `);
                        } else {
                          alert('Alerta: desbloqueie pop-ups para ver o relatório de e-mail formatado, ou visualize na coluna de relatórios!');
                        }
                      }}
                    >
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="font-bold text-brand-accent uppercase">ENVIADO ✓</span>
                        <span className="text-brand-muted font-mono">{new Date(log.sentAt).toLocaleTimeString('pt-BR')}</span>
                      </div>
                      <strong className="text-brand-text font-semibold block mb-0.5 truncate">{log.subject}</strong>
                      <div className="text-[11px] text-brand-muted flex items-center gap-1">
                        <Mail className="w-3 h-3 text-brand-accent shrink-0" />
                        <span>Para: <strong className="font-medium text-brand-text">{log.recipient}</strong></span>
                      </div>
                      <span className="mt-2 block bg-brand-accent-light/35 border border-brand-accent-mid/10 p-1.5 rounded text-[10px] text-brand-accent font-medium text-center">
                        Clique para Visualizar E-mail HTML ✉️
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: REPORT & ANALYTICS VIEWER (SPAN 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="dashboard-report-panel">
          
          {selectedSurvey ? (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden p-6 md:p-8 flex flex-col gap-8 min-h-[600px]">
              
              {/* SURVEY SUB-HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-brand-accent uppercase flex items-center gap-1 mb-1">
                    <Activity className="w-3.5 h-3.5" /> Relatório Consolidado
                  </span>
                  <h2 className="font-serif text-2xl font-light text-brand-text leading-tight">
                    {selectedSurvey.title}
                  </h2>
                  <p className="text-xs text-brand-muted mt-1 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-accent/70" /> 
                    Criado em {new Date(selectedSurvey.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedSurvey.createdAt).toLocaleTimeString('pt-BR')}
                    <span className="text-brand-border">|</span>
                    Envios para: <strong className="text-brand-text">{selectedSurvey.targetEmail}</strong>
                  </p>
                </div>
                
                <div className="bg-brand-accent-light text-brand-accent px-4 py-2 rounded-xl text-center border border-brand-accent-mid/20 shrink-0">
                  <div className="text-xl font-bold font-serif leading-none">{selectedSurvey.submissions.length}</div>
                  <div className="text-[9px] uppercase font-bold tracking-wider mt-1 text-brand-muted">Respostas</div>
                </div>
              </div>

              {selectedSurvey.submissions.length === 0 ? (
                /* EMPTY STATE FOR SELECTED SURVEY */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-brand-accent-light rounded-full flex items-center justify-center text-2xl mb-5">
                    📋
                  </div>
                  <strong className="text-sm font-semibold text-brand-text block mb-1">Nenhuma resposta recebida ainda</strong>
                  <p className="text-xs text-brand-muted leading-relaxed mb-6">
                    Envie o link desta pesquisa para seus pacientes ou alunos responderem. Assim que enviarem, os gráficos e relatórios detalhados aparecerão aqui em tempo real.
                  </p>
                  
                  <div className="w-full bg-brand-bg rounded-lg p-3 border border-brand-border flex flex-col gap-1.5 items-center select-all">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-brand-muted">Link de Acesso</span>
                    <strong className="text-[12px] font-mono text-brand-accent select-all break-all">
                      {appUrl ? `${appUrl}/?id=${selectedSurvey.id}` : `/?id=${selectedSurvey.id}`}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(appUrl ? `${appUrl}/?id=${selectedSurvey.id}` : `/?id=${selectedSurvey.id}`, selectedSurvey.id)}
                      className="px-3 py-1 bg-brand-accent text-white text-[10px] font-bold rounded mt-1 shadow-sm hover:bg-brand-accent-hover transition-colors"
                    >
                      {copiedId === selectedSurvey.id ? 'Link Copiado!' : 'Copiar Link'}
                    </button>
                  </div>
                </div>
              ) : (
                /* SURVEY DATA ANALYTICS */
                <div className="space-y-8 flex-1">
                  
                  {/* METRICS ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                      <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block mb-1">Sentimento Tristeza/Desânimo</span>
                      <strong className="text-lg font-serif">
                        {Math.round(
                          (selectedSurvey.submissions.filter(s => s.answers[2] === 'Frequente' || s.answers[2] === 'Sempre').length / totalRespondents) * 100
                        )}%
                      </strong>
                      <span className="text-[10px] text-brand-muted block mt-0.5">dos respondentes sentem frequente ou sempre</span>
                    </div>

                    <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                      <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block mb-1">Distúrbios de Sono frequentes</span>
                      <strong className="text-lg font-serif">
                        {Math.round(
                          (selectedSurvey.submissions.filter(s => s.answers[5] === 'Frequente' || s.answers[5] === 'Sempre').length / totalRespondents) * 100
                        )}%
                      </strong>
                      <span className="text-[10px] text-brand-muted block mt-0.5">relatam forte insônia ou sono interrompido</span>
                    </div>

                    <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                      <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider block mb-1">Cansaço Emocional/Físico</span>
                      <strong className="text-lg font-serif">
                        {Math.round(
                          (selectedSurvey.submissions.filter(s => s.answers[10] === 'Frequente' || s.answers[10] === 'Sempre').length / totalRespondents) * 100
                        )}%
                      </strong>
                      <span className="text-[10px] text-brand-muted block mt-0.5">mencionam cansaço constante</span>
                    </div>
                  </div>

                  {/* VISUAL CHARTS ROW */}
                  {isMounted && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* STATS BARCHART */}
                      <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm flex flex-col h-[320px]">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text mb-3 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-brand-accent" />
                          Sintomas Frequentes ou Constantes
                        </h3>
                        <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={symptomDataForBar}
                              margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#dde8ea" />
                              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 9 }}/>
                              <Tooltip contentStyle={{ fontSize: 11 }} />
                              <Bar dataKey="count" fill="#3d6b74" radius={[4, 4, 0, 0]} name="Respondentes" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="text-[9px] text-brand-muted uppercase text-center mt-2 font-semibold">
                          Contagem de respondentes qualificados como Frequente ou Sempre
                        </span>
                      </div>

                      {/* RESIDENCE PIE CHART */}
                      <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm flex flex-col h-[320px]">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text mb-3 flex items-center gap-1.5">
                          <PieChartIcon className="w-3.5 h-3.5 text-brand-accent" />
                          Perfil de Habitação / Coabitação
                        </h3>
                        <div className="flex-1 w-full" style={{ minHeight: '180px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={residenceDataForPie}
                                cx="50%"
                                cy="45%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {residenceDataForPie.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 11 }} />
                              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="text-[9px] text-brand-muted uppercase text-center mt-2 font-semibold">
                          Distribuição de coabitação voluntária dos pacientes
                        </span>
                      </div>

                    </div>
                  )}

                  {/* GRID: DETAILED RESPONDENTS LIST */}
                  <div className="border border-brand-border rounded-xl overflow-hidden shadow-sm" id="detailed-submissions-history">
                    <div className="bg-brand-bg px-4 py-3.5 border-b border-brand-border flex items-center justify-between">
                      <strong className="text-xs font-semibold text-brand-text uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-accent" />
                        Histórico de Respostas Recebidas
                      </strong>
                      <span className="text-[10px] text-brand-muted font-bold font-mono">
                        Clique em um prontuário para expandir detalhes
                      </span>
                    </div>

                    <div className="divide-y divide-brand-border">
                      {selectedSurvey.submissions.map(sub => {
                        const isExpanded = selectedSubmission?.id === sub.id;
                        
                        // Count critical issues
                        const frequentOrAlwaysInThis = [
                          ...(sub.q1 === 'Frequente' || sub.q1 === 'Sempre' ? [1] : []),
                          ...Object.keys(sub.answers)
                            .map(Number)
                            .filter(qNum => sub.answers[qNum] === 'Frequente' || sub.answers[qNum] === 'Sempre')
                        ].length;

                        return (
                          <div 
                            key={sub.id} 
                            className={`p-4 transition-colors ${isExpanded ? 'bg-brand-accent-light/15' : 'hover:bg-brand-bg/25'}`}
                          >
                            <div 
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                              onClick={() => setSelectedSubmission(isExpanded ? null : sub)}
                            >
                              <div>
                                <span className="text-[10px] text-brand-muted font-mono uppercase font-bold">
                                  ID: {sub.id} • {new Date(sub.submittedAt).toLocaleDateString('pt-BR')} às {new Date(sub.submittedAt).toLocaleTimeString('pt-BR')}
                                </span>
                                <strong className="text-sm text-brand-text font-medium block mt-0.5">
                                  {sub.nome}
                                </strong>
                                <span className="text-xs text-brand-muted font-light">
                                  Estado Civil: {sub.estadoCivil} • Reside com: {sub.reside}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {frequentOrAlwaysInThis > 4 ? (
                                  <span className="text-[9px] bg-red-100 text-brand-danger border border-red-200 uppercase font-black tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                                    Atenção: {frequentOrAlwaysInThis} Marcadores Frequentes
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-brand-accent-light text-brand-accent uppercase font-semibold px-2 py-1 rounded-full">
                                    {frequentOrAlwaysInThis} marcadores frequentes
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* COLLAPSIBLE INDIVIDUAL ANALYSIS */}
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-5 pt-4 border-t border-brand-border/80 overflow-hidden"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  
                                  {/* User details profiles summary */}
                                  <div className="md:col-span-4 bg-white border border-brand-border p-4 rounded-xl shadow-inner flex flex-col gap-3 text-xs">
                                    <strong className="text-[11px] font-bold uppercase tracking-wider text-brand-accent pb-2 border-b border-brand-border flex items-center gap-1">
                                      <User className="w-3.5 h-3.5" /> Ficha de Identificação
                                    </strong>
                                    
                                    <div>
                                      <span className="text-brand-muted block font-light">Nome:</span>
                                      <strong className="text-brand-text font-medium text-[13px]">{sub.nome}</strong>
                                    </div>
                                    <div>
                                      <span className="text-brand-muted block font-light">Estado Civil:</span>
                                      <strong className="text-brand-text font-medium text-[13px]">{sub.estadoCivil}</strong>
                                    </div>
                                    <div>
                                      <span className="text-brand-muted block font-light">Filhos / Dependentes:</span>
                                      <strong className="text-brand-text font-medium text-[13px]">{sub.filhos || 'Não informado'}</strong>
                                    </div>
                                    <div>
                                      <span className="text-brand-muted block font-light">Religião / Praticante:</span>
                                      <strong className="text-brand-text font-medium text-[12px]">
                                        {sub.religiao || 'Não informado'} {sub.praticante && `(Praticante: ${sub.praticante})`}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-brand-muted block font-light">Coabitação / Reside com:</span>
                                      <strong className="text-brand-text font-medium text-[12px]">{sub.reside}</strong>
                                    </div>
                                  </div>

                                  {/* Visual transcripts detail */}
                                  <div className="md:col-span-8 flex flex-col gap-3">
                                    <strong className="text-[11px] font-bold uppercase tracking-wider text-brand-text pb-2 border-b border-brand-border flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-brand-accent" /> Gabinete de Sintomas
                                    </strong>

                                    <div className="bg-white border border-brand-border rounded-xl max-h-[220px] overflow-y-auto divide-y divide-brand-border text-xs">
                                      {/* Question 1 print */}
                                      <div className="p-2 px-3 flex justify-between items-center bg-brand-bg/40">
                                        <span className="text-brand-muted leading-tight">1. Comportamento sem controle (compulsivos)</span>
                                        <span className={`font-semibold shrink-0 ml-4 px-2 py-0.5 rounded
                                          ${sub.q1 === 'Sempre' || sub.q1 === 'Frequente' ? 'bg-red-50 text-brand-danger' : 'text-brand-muted'}`}
                                        >
                                          {sub.q1 || 'Não respondida'}
                                        </span>
                                      </div>
                                      {sub.q1_quais && (
                                        <div className="p-2 px-3.5 bg-brand-accent-light/25 border-l-2 border-brand-mid italic font-light text-[11px] text-brand-text">
                                          Quais compulsões listadas: &ldquo;{sub.q1_quais}&rdquo;
                                        </div>
                                      )}

                                      {/* Other questions loop */}
                                      {questionsList.map((q, idx) => {
                                        const qNum = idx + 2;
                                        const val = sub.answers[qNum] || 'Não respondida';
                                        const isCritical = val === 'Sempre' || val === 'Frequente';
                                        
                                        return (
                                          <div key={qNum} className={`p-2 px-3 flex justify-between items-center ${isCritical ? 'bg-red-50/20' : ''}`}>
                                            <span className="text-brand-muted leading-tight">
                                              {qNum}. {q}
                                            </span>
                                            <span className={`font-semibold shrink-0 ml-4 px-2 py-0.5 rounded
                                              ${isCritical ? 'bg-red-50 text-brand-danger' : 'text-brand-muted'}`}
                                            >
                                              {val}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    <div className="flex justify-end gap-2.5 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const log = emailLogs.find(l => l.surveyId === selectedSurvey.id && l.htmlBody.includes(sub.nome));
                                          if (log) {
                                            const popup = window.open('', '_blank');
                                            popup?.document.write(`<html><body style="background:#f5f3ef; padding:40px; margin:0;">${log.htmlBody}</body></html>`);
                                          } else {
                                            alert('O e-mail gerado para esta resposta individual já está disponível nas logs de Correio!');
                                          }
                                        }}
                                        className="px-4 py-2 border border-brand-border text-brand-accent hover:border-brand-accent font-medium rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <Inbox className="w-3 h-3 text-brand-accent" />
                                        Ver E-mail Enviado
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded text-[11px] font-semibold cursor-pointer transition-colors"
                                      >
                                        Imprimir Prontuário 🖨️
                                      </button>
                                    </div>

                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          ) : (
            /* EMPTY DASHBOARD ROOT */
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Sparkles className="w-12 h-12 text-brand-accent mb-4 animate-bounce" />
              <h2 className="font-serif text-2xl font-light text-brand-text mb-2">Bem-vindo ao Painel Clínico</h2>
              <p className="text-brand-muted text-sm max-w-sm mb-6">
                Utilize o menu lateral esquerdo para criar sua primeira pesquisa ou selecione uma pesquisa existente na lista para examinar os dados consolidados coletados.
              </p>
            </div>
          )}

        </div>

      </div>

    </main>
  );
}
