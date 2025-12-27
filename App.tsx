
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCcw,
  Sparkles,
  BookOpen,
  Download,
  Wand2,
  BrainCircuit,
  Camera,
  User,
  X,
  ArrowUpRight,
  History,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Target,
  Rocket,
  GraduationCap,
  Trophy,
  Timer,
  Terminal,
  Activity,
  Layers,
  Layout,
  Dna,
  Heart,
  Settings,
  Info,
  HelpCircle
} from 'lucide-react';
import { analyzeResume, optimizeResumeToSchema, proposeChanges, generateAptitudeQuiz } from './geminiService';
import { AnalysisResult, AnalysisStep, OptimizedResume, ProposedChanges, QuizQuestion } from './types';
import { MatchGauge } from './components/MatchGauge';
import { jsPDF } from "jspdf";

const HireBuddyLogo = ({ size = 40 }: { size?: number }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
      <circle cx="20" cy="22" r="11" stroke="#3b82f6" strokeWidth="2.5" />
      <circle cx="16" cy="20" r="1.5" fill="#3b82f6" />
      <circle cx="24" cy="20" r="1.5" fill="#3b82f6" />
      <path d="M16 26C16 26 18 28.5 20 28.5C22 28.5 24 26 24 26" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 20C8 13.3726 13.3726 8 20 8C26.6274 8 32 13.3726 32 20" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="19" width="4" height="8" rx="1.5" fill="#3b82f6" />
      <rect x="30" y="19" width="4" height="8" rx="1.5" fill="#3b82f6" />
      <path d="M30 26C30 31 26 33 23 33.5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="33.5" r="1.5" fill="#3b82f6" />
    </svg>
  </div>
);

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <HelpCircle size={14} className="text-slate-500 cursor-help hover:text-blue-400 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-slate-900 border border-white/10 text-[10px] text-slate-300 rounded-xl shadow-2xl z-50 animate-enter">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

const StepProgress: React.FC<{ current: AnalysisStep }> = ({ current }) => {
  const steps = [
    { label: 'Setup', value: [AnalysisStep.LANDING, AnalysisStep.IDLE] },
    { label: 'Analyze', value: [AnalysisStep.ANALYZING, AnalysisStep.COMPLETED] },
    { label: 'Refine', value: [AnalysisStep.PROPOSING, AnalysisStep.REVIEWING] },
    { label: 'Result', value: [AnalysisStep.OPTIMIZED_RESUME, AnalysisStep.QUIZ, AnalysisStep.QUIZ_RESULTS] }
  ];

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-16 relative px-4">
      <div className="absolute top-1/2 left-0 w-full h-px bg-slate-800 -translate-y-1/2 -z-10"></div>
      {steps.map((step, idx) => {
        const isActive = step.value.includes(current);
        const isPast = steps.slice(0, idx).some(s => s.value.includes(current));
        return (
          <div key={step.label} className="flex flex-col items-center gap-3 bg-[#020617] px-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-700 border-2 
              ${isActive ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 
                isPast ? 'bg-teal-600 border-teal-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              {isPast ? <CheckCircle size={18} /> : idx + 1}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [status, setStatus] = useState<AnalysisStep>(AnalysisStep.LANDING);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [proposals, setProposals] = useState<ProposedChanges | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [improvedResult, setImprovedResult] = useState<AnalysisResult | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const mainPhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setProfilePhoto(event.target?.result as string || null);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText || !jobDesc) return setError("Resume content and job profile are required for semantic analysis.");
    setError(null);
    setStatus(AnalysisStep.ANALYZING);
    try {
      const data = await analyzeResume(resumeText, jobDesc);
      setResult(data);
      setStatus(AnalysisStep.COMPLETED);
    } catch (err) {
      setError("Analysis engine timeout. Please check your inputs.");
      setStatus(AnalysisStep.IDLE);
    }
  };

  const handleRequestProposals = async () => {
    if (!result) return;
    setStatus(AnalysisStep.PROPOSING);
    try {
      const p = await proposeChanges(resumeText, jobDesc, result.missingKeywords);
      setProposals(p);
      setStatus(AnalysisStep.REVIEWING);
    } catch (err) {
      setError("Blueprint formulation failed.");
      setStatus(AnalysisStep.COMPLETED);
    }
  };

  const handleFinalOptimization = async () => {
    if (!result) return;
    setIsProcessing(true);
    try {
      const optimized = await optimizeResumeToSchema(resumeText, jobDesc, result.missingKeywords);
      setOptimizedResume(optimized);
      
      const optimizedString = `
        NAME: ${optimized.name}
        ROLE: ${optimized.jobTitle}
        PROFILE: ${optimized.profile}
        EXPERIENCE: ${optimized.experience.map(e => `${e.company} ${e.role}: ${e.details}`).join(' ')}
        SKILLS: ${optimized.skills.join(', ')}
      `;
      const improvedData = await analyzeResume(optimizedString, jobDesc);
      setImprovedResult(improvedData);
      setStatus(AnalysisStep.OPTIMIZED_RESUME);
    } catch (err) {
      setError("Optimization synthesis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!jobDesc) {
      setError("A targeted job profile is required to generate a relevant assessment.");
      return;
    }
    setIsProcessing(true);
    try {
      const questions = await generateAptitudeQuiz(jobDesc);
      setQuizQuestions(questions);
      setCurrentQuestionIndex(0);
      setQuizScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setStatus(AnalysisStep.QUIZ);
    } catch (err) {
      setError("Assessment generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;
    const currentQ = quizQuestions[currentQuestionIndex];
    if (selectedAnswer === currentQ.correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setStatus(AnalysisStep.QUIZ_RESULTS);
    }
  };

  const highlightText = (text: string, keywords: string[], isDark: boolean = false) => {
    if (!keywords || keywords.length === 0) return text;
    const sortedKeywords = [...new Set(keywords)]
      .filter(k => k.trim().length > 0)
      .sort((a, b) => b.length - a.length);
    if (sortedKeywords.length === 0) return text;
    const pattern = new RegExp(`(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);
    return (
      <>
        {parts.map((part, i) => {
          const isMatch = sortedKeywords.some(kw => kw.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <mark key={i} className={`inline-block px-1 rounded transition-all duration-300 font-bold ${isDark ? 'bg-blue-500/40 text-blue-100 border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'bg-blue-900/40 text-blue-300 border-b-2 border-blue-600'}`}>
                {part}
              </mark>
            );
          }
          return part;
        })}
      </>
    );
  };

  const downloadPDF = () => {
    if (!optimizedResume) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const leftColWidth = 75;
    const rightColWidth = pageWidth - leftColWidth;
    doc.setFont("helvetica", "normal");
    doc.setFillColor(242, 245, 247);
    doc.rect(0, 0, leftColWidth, 297, 'F');
    doc.setFillColor(34, 34, 34);
    doc.rect(leftColWidth, 0, rightColWidth, 297, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 20, 'F');
    if (profilePhoto) {
      try { doc.addImage(profilePhoto, 'JPEG', 12.5, 30, 50, 50); } catch (e) {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text(optimizedResume.name.split(' ')[0].toUpperCase(), leftColWidth + 10, 60);
    doc.setTextColor(180, 180, 180);
    doc.text(optimizedResume.name.split(' ').slice(1).join(' ').toUpperCase(), leftColWidth + 10, 75);
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(optimizedResume.jobTitle.toUpperCase(), leftColWidth + 10, 90);
    doc.setTextColor(45, 55, 72);
    let ly = 105;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PROFILE", 10, ly);
    ly += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const pPoints = doc.splitTextToSize(optimizedResume.profile, 55);
    doc.text(pPoints, 10, ly); ly += pPoints.length * 5 + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONTACT", 10, ly); ly += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`PHONE: ${optimizedResume.contact.phone}`, 10, ly); ly += 5;
    doc.text(`WEB: ${optimizedResume.contact.website}`, 10, ly); ly += 5;
    doc.setTextColor(37, 99, 235);
    doc.text(optimizedResume.contact.email, 10, ly);
    ly += 15;
    doc.setTextColor(45, 55, 72);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SKILLS", 10, ly); ly += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const sLines = doc.splitTextToSize(optimizedResume.skills.join(", "), 55);
    doc.text(sLines, 10, ly);
    let ry = 115;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("WORK EXPERIENCE", leftColWidth + 10, ry);
    doc.setDrawColor(60, 60, 60);
    doc.line(leftColWidth + 10, ry + 2, pageWidth - 10, ry + 2);
    ry += 12;
    optimizedResume.experience.forEach(exp => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${exp.company} | ${exp.role}`, leftColWidth + 10, ry); ry += 5;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(exp.dates, leftColWidth + 10, ry); ry += 5;
      doc.setTextColor(220, 220, 220);
      const details = doc.splitTextToSize(exp.details, rightColWidth - 20);
      doc.text(details, leftColWidth + 10, ry);
      ry += details.length * 5 + 10;
    });
    doc.save(`${optimizedResume.name.replace(/\s+/g, '_')}_Resume.pdf`);
  };

  const reset = () => {
    setStatus(AnalysisStep.LANDING);
    setResult(null);
    setProposals(null);
    setOptimizedResume(null);
    setImprovedResult(null);
    setProfilePhoto(null);
    setError(null);
  };

  const integratedKeywords = proposals?.integratedKeywords || [];

  return (
    <div className="min-h-screen text-slate-100 p-6 md:p-12 animate-enter">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Bar */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 px-4 gap-8">
          <div className="flex items-center gap-6 cursor-pointer group" onClick={reset}>
            <div className="p-2.5 bg-slate-900 rounded-[1.5rem] border border-white/10 shadow-[0_15px_45px_rgba(59,130,246,0.15)] transition-all group-hover:scale-110 group-hover:border-blue-500/40 group-hover:rotate-2">
              <HireBuddyLogo size={52} />
            </div>
            <div>
              <span className="text-4xl font-extrabold text-white tracking-tighter block leading-none font-poppins">
                HireBuddy<span className="text-blue-500">.</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em]">Ready for Liftoff</span>
            </div>
          </div>
          
          {status !== AnalysisStep.LANDING && (
            <button onClick={reset} className="px-8 py-4 bg-white/5 border border-white/10 rounded-[1.25rem] text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-all uppercase tracking-widest btn-glint">
              <RefreshCcw size={16} /> Global Reset
            </button>
          )}
        </header>

        {status !== AnalysisStep.LANDING && <StepProgress current={status} />}

        {error && (
          <div className="mb-10 p-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-[2.5rem] flex items-center gap-6 animate-enter backdrop-blur-xl">
            <div className="p-4 bg-rose-500/20 rounded-2xl"><AlertCircle size={32} /></div>
            <span className="font-bold text-xl">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>
        )}

        {/* Landing Page View */}
        {status === AnalysisStep.LANDING && (
          <div className="animate-enter py-10 flex flex-col items-center">
            {/* Hero Section */}
            <div className="text-center mb-28 max-w-5xl relative">
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/5 blur-[180px] rounded-full pointer-events-none"></div>
              
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-12 border border-blue-500/20 glow-blue">
                <Sparkles size={16} className="animate-pulse" /> Your AI Career Sidekick
              </div>
              
              <h1 className="text-6xl md:text-[8.5rem] font-extrabold text-white tracking-tighter leading-[0.85] mb-14 font-poppins">
                Bridge The <br />
                <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-indigo-600 bg-clip-text text-transparent">Career Gap.</span>
              </h1>
              
              <p className="text-xl md:text-3xl text-slate-400 font-medium leading-relaxed mb-24 max-w-3xl mx-auto">
                Hi! I'm HireBuddy. I help you align your professional story with top-tier job profiles and ace technical rounds.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-6xl mx-auto px-4">
                {/* Module Choice A: Resume Architect */}
                <div 
                  onClick={() => setStatus(AnalysisStep.IDLE)}
                  className="glass-panel p-16 rounded-[4.5rem] text-left group cursor-pointer border-blue-500/10 hover:border-blue-500/50 hover:-translate-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity"><Layout size={160} /></div>
                  <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mb-12 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xl">
                    <FileText size={40} />
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-6 font-poppins">Resume Architect</h3>
                  <p className="text-slate-400 font-medium leading-relaxed mb-12 text-xl">
                    Let's polish your resume to be bulletproof. Semantic analysis and ATS optimization tailored to you.
                  </p>
                  <div className="flex items-center gap-4 text-blue-400 font-black uppercase text-[11px] tracking-[0.4em] group-hover:text-blue-200">
                    Launch Module <ArrowRight size={20} className="group-hover:translate-x-3 transition-transform" />
                  </div>
                </div>

                {/* Module Choice B: Aptitude Engine */}
                <div 
                  onClick={() => setStatus(AnalysisStep.QUIZ)}
                  className="glass-panel p-16 rounded-[4.5rem] text-left group cursor-pointer border-teal-500/10 hover:border-teal-500/50 hover:-translate-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity"><Cpu size={160} /></div>
                  <div className="w-20 h-20 bg-teal-500/10 text-teal-400 rounded-3xl flex items-center justify-center mb-12 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xl">
                    <Terminal size={40} />
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-6 font-poppins">Aptitude Engine</h3>
                  <p className="text-slate-400 font-medium leading-relaxed mb-12 text-xl">
                    Prep like an expert. Custom interview-grade quizzes generated instantly for your target role.
                  </p>
                  <div className="flex items-center gap-4 text-teal-400 font-black uppercase text-[11px] tracking-[0.4em] group-hover:text-teal-200">
                    Master Skills <ArrowRight size={20} className="group-hover:translate-x-3 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Phase - Resume Architect */}
        {status === AnalysisStep.IDLE && (
          <div className="space-y-16 animate-enter max-w-6xl mx-auto pb-40">
             <div className="glass-panel p-16 rounded-[4.5rem] flex flex-col items-center relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full"></div>
              
              <div className="flex items-center gap-8 mb-14 w-full max-w-2xl text-center flex-col md:flex-row md:text-left">
                <div className="p-6 bg-blue-500/10 text-blue-400 rounded-[2.5rem] border border-blue-500/20 shadow-xl"><Camera size={44} /></div>
                <div>
                  <h2 className="text-4xl font-bold text-white tracking-tight font-poppins">Identity Check <Tooltip text="We use your headshot to generate a more professional and personalized PDF portfolio export." /></h2>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-3">Upload a professional headshot</p>
                </div>
              </div>
              
              <input type="file" ref={mainPhotoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              
              <div 
                onClick={() => mainPhotoInputRef.current?.click()} 
                className="w-72 h-72 rounded-[5rem] border-2 border-dashed border-slate-800 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group overflow-hidden relative shadow-[0_25px_100px_rgba(0,0,0,0.5)]"
              >
                {profilePhoto ? (
                  <>
                    <img src={profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                    <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-[12px] font-black uppercase tracking-[0.4em] backdrop-blur-md">Update Avatar</div>
                  </>
                ) : (
                  <>
                    <div className="p-8 rounded-full bg-slate-900/50 mb-6 group-hover:bg-blue-500/20 transition-all border border-white/5">
                      <User className="text-slate-600 group-hover:text-blue-400 transition-all" size={72} />
                    </div>
                    <span className="text-[12px] font-black uppercase text-slate-500 tracking-[0.3em]">Sync Avatar</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
              <div className="glass-panel p-16 rounded-[4.5rem] group border-transparent hover:border-white/10">
                <div className="flex items-center gap-6 mb-14">
                  <div className="p-6 bg-white/5 text-blue-400 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl"><FileText size={36} /></div>
                  <h2 className="text-3xl font-bold text-white tracking-tight font-poppins">Your Resume <Tooltip text="Paste the text from your existing resume. The more detail, the better our analysis will be." /></h2>
                </div>
                <textarea 
                  className="w-full h-[450px] p-12 rounded-[3.5rem] bg-[#010410] border border-white/5 focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner font-medium text-slate-300 placeholder:text-slate-800 text-lg leading-relaxed" 
                  placeholder="Paste your source experience text..." 
                  value={resumeText} 
                  onChange={(e) => setResumeText(e.target.value)} 
                />
              </div>
              
              <div className="glass-panel p-16 rounded-[4.5rem] group border-transparent hover:border-white/10 flex flex-col">
                <div className="flex items-center gap-6 mb-14">
                  <div className="p-6 bg-white/5 text-teal-400 rounded-3xl group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xl"><BookOpen size={36} /></div>
                  <h2 className="text-3xl font-bold text-white tracking-tight font-poppins">Target Role <Tooltip text="The specific job description or requirements you are applying for." /></h2>
                </div>
                <textarea 
                  className="w-full h-[380px] p-12 rounded-[3.5rem] bg-[#010410] border border-white/5 focus:border-teal-500/50 outline-none transition-all resize-none shadow-inner font-medium text-slate-300 placeholder:text-slate-800 text-lg leading-relaxed" 
                  placeholder="Paste the target requirements..." 
                  value={jobDesc} 
                  onChange={(e) => setJobDesc(e.target.value)} 
                />
                <button 
                  onClick={handleAnalyze} 
                  disabled={!resumeText || !jobDesc} 
                  className="w-full mt-auto py-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 text-white rounded-[2.5rem] font-black text-2xl hover:brightness-110 hover:shadow-[0_20px_70px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-5 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed group btn-glint shadow-2xl"
                >
                  <Zap size={32} className="group-hover:rotate-12 transition-transform" /> Initiate Pulse Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aptitude Input Pathway */}
        {status === AnalysisStep.QUIZ && quizQuestions.length === 0 && (
          <div className="max-w-4xl mx-auto py-16 animate-enter">
            <div className="glass-panel p-20 rounded-[5rem] border-blue-500/20">
              <div className="flex items-center gap-8 mb-16">
                <div className="p-8 bg-blue-500/10 text-blue-400 rounded-[3rem] border border-blue-500/20 shadow-2xl">
                  <Terminal size={56} />
                </div>
                <div>
                  <h2 className="text-5xl font-bold text-white tracking-tight font-poppins">Skill Assessment <Tooltip text="I'll generate 8 challenging questions based on the job requirements you provide here." /></h2>
                  <p className="text-slate-500 text-[12px] font-black uppercase tracking-[0.3em] mt-3">Ready to test your knowledge?</p>
                </div>
              </div>

              <div className="mb-14">
                <textarea 
                  className="w-full h-96 p-14 rounded-[4rem] bg-[#010410] border border-white/5 focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner font-medium text-slate-300 placeholder:text-slate-800 text-xl leading-relaxed" 
                  placeholder="Paste the target stack or requirements..." 
                  value={jobDesc} 
                  onChange={(e) => setJobDesc(e.target.value)} 
                />
              </div>

              <button 
                onClick={handleStartQuiz}
                disabled={!jobDesc}
                className="w-full py-12 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-[3.5rem] font-black text-3xl hover:brightness-110 transition-all flex items-center justify-center gap-6 shadow-[0_30px_90px_rgba(79,70,229,0.5)] disabled:opacity-30 disabled:cursor-not-allowed group btn-glint"
              >
                <Cpu size={44} className="group-hover:rotate-12 transition-transform" /> Build My Quiz Round
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(status === AnalysisStep.ANALYZING || status === AnalysisStep.PROPOSING || isProcessing) && (
          <div className="flex flex-col items-center py-56 animate-enter">
            <div className="relative mb-24">
              <div className="w-56 h-56 border-[4px] border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                <BrainCircuit size={96} className="animate-pulse" />
              </div>
              <div className="absolute inset-[-40px] border border-blue-500/20 rounded-full animate-ping opacity-10"></div>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-4 font-poppins">
              Synchronizing Path
            </h2>
            <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-blue-500 animate-[subtlePulse_1.5s_infinite]"></div>
            </div>
            <p className="text-slate-600 font-bold uppercase tracking-[0.6em] text-[10px]">Processing global matrix nodes...</p>
          </div>
        )}

        {/* Assessment Results (Resume Architect Flow) */}
        {status === AnalysisStep.COMPLETED && result && (
          <div className="animate-enter space-y-16 max-w-6xl mx-auto pb-40">
            <div className="glass-panel rounded-[6rem] p-24 shadow-2xl border-white/10 flex flex-col lg:row items-center gap-28 relative overflow-hidden lg:flex-row">
              <div className="shrink-0 scale-[1.4]"><MatchGauge score={result.matchPercentage} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-6 mb-10">
                  <div className="p-5 bg-blue-500/10 text-blue-400 rounded-[2rem]"><ShieldCheck size={48} /></div>
                  <h2 className="text-5xl font-bold text-white tracking-tight font-poppins">HireBuddy Audit</h2>
                </div>
                
                <p className="text-slate-400 text-3xl leading-relaxed italic border-l-8 border-blue-500/30 pl-12 mb-20 font-medium">
                  "{result.overallSummary}"
                </p>
                
                <div className="space-y-10">
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.6em] mb-4">Semantic Deficits Detected</h3>
                  <div className="flex flex-wrap gap-5">
                    {result.missingKeywords.length > 0 ? result.missingKeywords.map((k, i) => (
                      <span key={i} className="px-8 py-4 bg-rose-500/10 text-rose-400 rounded-3xl text-[16px] font-black border border-rose-500/20 hover:scale-110 transition-transform cursor-default shadow-xl">{k}</span>
                    )) : <span className="text-teal-400 font-black italic text-2xl">Perfect Alignment Detected. You're a natural.</span>}
                  </div>
                </div>
                
                <button 
                  onClick={handleRequestProposals} 
                  className="w-full mt-24 py-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[3rem] font-black text-3xl hover:brightness-110 transition-all flex items-center justify-center gap-6 shadow-[0_25px_60px_rgba(59,130,246,0.4)] group btn-glint active:scale-[0.98]"
                >
                  <Wand2 size={40} className="group-hover:rotate-12 transition-transform" /> Transform My Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStep.REVIEWING && proposals && (
          <div className="animate-enter max-w-7xl mx-auto space-y-16 pb-48">
             <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 text-white p-20 rounded-[6rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10">
                  <h2 className="text-6xl font-extrabold tracking-tight mb-6 italic uppercase font-poppins">Strategic Delta</h2>
                  <p className="text-blue-100 text-3xl font-medium opacity-80 max-w-3xl leading-relaxed">Here's how we transform your profile from matching to leading.</p>
                </div>
                <div className="hidden lg:flex flex-col items-center bg-black/40 px-16 py-10 rounded-[4rem] backdrop-blur-[60px] border border-white/10 relative z-10 shadow-2xl">
                   <span className="text-[12px] font-black uppercase tracking-[0.6em] mb-4 opacity-70">Impact Potential</span>
                   <span className="text-7xl font-black flex items-center gap-5 text-teal-400 drop-shadow-[0_0_20px_rgba(20,184,166,0.5)]">+{proposals.predictedScore - (result?.matchPercentage || 0)}% <ArrowUpRight size={52} className="animate-bounce" /></span>
                </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
                <div className="xl:col-span-5 glass-panel p-20 rounded-[5rem]">
                   <h3 className="text-2xl font-black text-white mb-16 flex items-center gap-6 uppercase tracking-[0.2em] font-poppins"><History size={32} className="text-blue-500" /> Vectors Integrated</h3>
                   <div className="flex flex-wrap gap-5">
                      {proposals.integratedKeywords.map((kw, i) => (
                        <div key={i} className="px-8 py-5 bg-blue-500/10 text-blue-400 rounded-[2rem] text-[17px] font-black border border-blue-500/20 flex items-center gap-4 hover:bg-blue-500/20 transition-all cursor-default group shadow-lg">
                          <CheckCircle2 size={20} className="group-hover:scale-125 transition-transform" /> {kw}
                        </div>
                      ))}
                   </div>
                </div>

                <div className="xl:col-span-7 glass-panel p-20 rounded-[5rem]">
                   <h3 className="text-2xl font-black text-white mb-16 flex items-center gap-6 uppercase tracking-[0.2em] font-poppins"><Sparkles size={32} className="text-blue-500" /> Synthesized Phrasing</h3>
                   <div className="space-y-12">
                      {proposals.phrasingImprovements.map((imp, i) => (
                        <div key={i} className="p-12 rounded-[4rem] bg-[#020617]/40 border border-white/5 group hover:border-blue-500/50 transition-all duration-700 shadow-xl">
                           <div className="flex items-center justify-between mb-8">
                             <span className="text-[14px] font-black uppercase text-blue-400 tracking-[0.5em]">{imp.section}</span>
                             <span className="text-[12px] font-bold text-slate-600 italic opacity-80 uppercase tracking-widest">Strategy: {imp.reason}</span>
                           </div>
                           <div className="space-y-10">
                              <div className="flex gap-7 opacity-25 hover:opacity-100 transition-opacity">
                                <div className="shrink-0 mt-1.5"><X size={24} className="text-rose-500" /></div>
                                <p className="text-lg text-slate-400 line-through font-medium leading-relaxed">{imp.original}</p>
                              </div>
                              <div className="flex gap-7">
                                <div className="shrink-0 mt-1.5"><CheckCircle size={32} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]" /></div>
                                <p className="text-2xl text-white font-bold leading-tight tracking-tight">{imp.improved}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                   <button 
                    onClick={handleFinalOptimization} 
                    className="w-full mt-20 py-12 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-[3.5rem] font-black text-3xl hover:brightness-110 transition-all flex items-center justify-center gap-6 shadow-[0_30px_80px_rgba(59,130,246,0.4)] group btn-glint active:scale-[0.98]"
                   >
                      Generate New Portfolio <ChevronRight size={40} className="group-hover:translate-x-3 transition-transform" />
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* ... (Rest of the status conditional rendering remains similar in structure but inherits the new paddings/pacing) ... */}
        
        {status === AnalysisStep.QUIZ && quizQuestions.length > 0 && (
          <div className="animate-enter max-w-6xl mx-auto py-16">
            <div className="glass-panel rounded-[6rem] p-24 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.9)] border-white/10 text-white min-h-[800px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[200px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
              
              <header className="flex justify-between items-start mb-28 relative z-10 flex-col md:flex-row gap-12">
                <div className="flex items-center gap-10">
                  <div className="p-8 bg-indigo-700 rounded-[3rem] shadow-[0_0_70px_rgba(79,70,229,0.5)] border border-indigo-400/30">
                    <Terminal size={48} />
                  </div>
                  <div>
                    <div className="flex items-center gap-5 mb-4">
                      <span className="text-[14px] font-black uppercase tracking-[0.6em] text-indigo-400">Simulation Active</span>
                      <span className="w-2.5 h-2.5 bg-slate-700 rounded-full"></span>
                      <span className="text-[14px] font-black uppercase tracking-[0.6em] text-teal-400">Round {currentQuestionIndex + 1}</span>
                    </div>
                    <h2 className="text-5xl font-extrabold tracking-tight uppercase italic font-poppins">Technical Evaluator</h2>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-6 self-end md:self-start">
                  <div className="bg-white/5 px-14 py-7 rounded-[3rem] border border-white/10 flex items-center gap-8 shadow-3xl backdrop-blur-3xl">
                    <Timer size={32} className="text-slate-500 animate-pulse" />
                    <span className="text-5xl font-black text-indigo-400 font-poppins">{currentQuestionIndex + 1}</span>
                    <span className="text-slate-600 font-bold text-3xl">/ {quizQuestions.length}</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 relative z-10">
                <div className="mb-14">
                  <span className={`px-10 py-4 rounded-3xl text-[15px] font-black uppercase tracking-[0.5em] border shadow-3xl inline-block
                    ${quizQuestions[currentQuestionIndex].category === 'Technical' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 
                      quizQuestions[currentQuestionIndex].category === 'Logical' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' :
                      'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'}
                  `}>
                    {quizQuestions[currentQuestionIndex].category} Sector
                  </span>
                </div>
                
                <h3 className="text-5xl md:text-6xl font-extrabold mb-24 leading-[1.05] tracking-tight text-white drop-shadow-2xl font-poppins">{quizQuestions[currentQuestionIndex].question}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = showExplanation && option === quizQuestions[currentQuestionIndex].correctAnswer;
                    const isWrong = showExplanation && isSelected && option !== quizQuestions[currentQuestionIndex].correctAnswer;
                    
                    return (
                      <button 
                        key={idx}
                        disabled={showExplanation}
                        onClick={() => setSelectedAnswer(option)}
                        className={`p-12 rounded-[4rem] text-left font-bold text-2xl transition-all border-2 flex items-center justify-between group relative overflow-hidden shadow-xl
                          ${isSelected ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_60px_rgba(79,70,229,0.3)] scale-[1.03]' : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 hover:-translate-y-2'}
                          ${isCorrect ? 'border-teal-500 bg-teal-500/25 shadow-[0_0_80px_rgba(20,184,166,0.4)]' : ''}
                          ${isWrong ? 'border-rose-500 bg-rose-500/25 shadow-[0_0_80px_rgba(244,63,94,0.4)]' : ''}
                        `}
                      >
                        <span className="flex-1 relative z-10 pr-8">{option}</span>
                        <div className="relative z-10 shrink-0">
                          {isCorrect && <CheckCircle className="text-teal-400" size={48} />}
                          {isWrong && <X className="text-rose-400" size={48} />}
                        </div>
                        {isSelected && !showExplanation && <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showExplanation && (
                <div className="mt-24 p-16 bg-white/5 border border-white/10 rounded-[5rem] animate-enter relative z-10 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                      <Settings size={32} className="animate-spin-slow" />
                    </div>
                    <span className="text-[16px] font-black uppercase tracking-[0.6em] text-indigo-400">HireBuddy Master Recap</span>
                  </div>
                  <p className="text-slate-300 text-3xl font-medium leading-relaxed italic">{quizQuestions[currentQuestionIndex].explanation}</p>
                </div>
              )}

              <div className="mt-24 flex justify-end relative z-10">
                {!showExplanation ? (
                  <button 
                    disabled={!selectedAnswer}
                    onClick={handleAnswerSubmit}
                    className="px-24 py-10 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white rounded-[3rem] font-black text-3xl hover:brightness-110 transition-all shadow-[0_30px_100px_rgba(79,70,229,0.5)] group btn-glint"
                  >
                    Confirm Path
                  </button>
                ) : (
                  <button 
                    onClick={handleNextQuestion}
                    className="px-24 py-10 bg-white text-black rounded-[3rem] font-black text-3xl hover:bg-slate-200 transition-all flex items-center gap-6 shadow-4xl hover:scale-105 active:scale-95"
                  >
                    {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Sequence' : 'Reveal Summary'} <ChevronRight size={44} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStep.QUIZ_RESULTS && (
            <div className="animate-enter max-w-4xl mx-auto py-24 pb-60">
              <div className="glass-panel rounded-[7rem] p-28 shadow-[0_150px_300px_-80px_rgba(0,0,0,1)] border-white/10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 shadow-[0_0_50px_rgba(59,130,246,0.9)]"></div>
                <div className="w-48 h-48 bg-blue-500/10 text-blue-400 rounded-[5rem] flex items-center justify-center mx-auto mb-20 shadow-[0_0_120px_rgba(59,130,246,0.4)] border border-blue-500/20 scale-[1.4]">
                  <Trophy size={96} />
                </div>
                <h2 className="text-7xl font-black text-white mb-10 tracking-tighter uppercase italic font-poppins drop-shadow-2xl">Mission Peak</h2>
                
                <div className="flex items-center justify-center gap-40 mb-32 flex-col lg:flex-row">
                  <div className="group">
                    <span className="text-[14px] font-black uppercase text-slate-600 tracking-[0.6em] block mb-8 group-hover:text-blue-400 transition-colors">Aptitude Peak</span>
                    <span className="text-[10rem] font-black text-blue-500 tracking-tighter leading-none">{Math.round((quizScore / quizQuestions.length) * 100)}%</span>
                  </div>
                  <div className="w-1.5 h-48 bg-white/5 hidden lg:block"></div>
                  <div className="group">
                    <span className="text-[14px] font-black uppercase text-slate-600 tracking-[0.6em] block mb-8 group-hover:text-teal-400 transition-colors">Carrier Sync</span>
                    <span className="text-[10rem] font-black text-teal-500 tracking-tighter leading-none">{improvedResult?.matchPercentage || 0}%</span>
                  </div>
                </div>

                <div className="bg-white/5 p-16 rounded-[5rem] border border-white/10 text-left mb-24 shadow-2xl relative group hover:border-blue-500/30 transition-all duration-1000">
                   <div className="flex items-center gap-6 mb-8">
                     <div className="p-5 bg-blue-600/20 text-blue-400 rounded-3xl"><Heart size={40} className="animate-pulse" /></div>
                     <h4 className="text-blue-400 font-black text-[18px] uppercase tracking-[0.6em] font-poppins">Final Buddy Recap</h4>
                   </div>
                   <p className="text-slate-300 text-4xl font-medium leading-tight italic opacity-90 drop-shadow-sm">
                     {quizScore >= quizQuestions.length * 0.8 
                      ? "I'm genuinely impressed. Your skills and profile are in perfect sync. You are a high-tier hire—go get them!" 
                      : "We've made massive progress. Keep reviewing those logic Recaps and you'll be hitting 100% in no time. I'm proud of us!"}
                   </p>
                </div>

                <button 
                  onClick={reset} 
                  className="w-full py-12 bg-white text-black rounded-[4rem] font-black text-4xl hover:bg-slate-200 transition-all shadow-[0_40px_100px_rgba(255,255,255,0.15)] active:scale-95 uppercase tracking-tighter btn-glint"
                >
                  Restart Sequence
                </button>
              </div>
            </div>
        )}

        {/* ... (Optimized Resume Screen Refinement follows same patterns) ... */}
        {status === AnalysisStep.OPTIMIZED_RESUME && optimizedResume && improvedResult && (
          <div className="animate-enter max-w-7xl mx-auto space-y-20 pb-48">
             <div className="glass-panel p-16 rounded-[4rem] border-white/20 sticky top-8 z-50 shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-[80px] flex flex-col xl:flex-row justify-between items-center gap-12">
                <div className="flex items-center gap-16">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.5em] mb-4">Hireability Lift</span>
                    <div className="flex items-center gap-8">
                      <span className="text-5xl font-black text-slate-700 line-through tracking-tighter">{result?.matchPercentage}%</span>
                      <ArrowRight className="text-slate-700" size={40} />
                      <span className="text-7xl font-black text-blue-500 flex items-center gap-5 tracking-tighter font-poppins">
                        {improvedResult.matchPercentage}% <ArrowUpRight size={52} className="animate-bounce" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-8 w-full xl:w-auto">
                  <button 
                    onClick={downloadPDF} 
                    className="flex-1 xl:flex-none bg-white text-black px-16 py-8 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-5 hover:bg-slate-200 transition-all shadow-3xl hover:scale-105 btn-glint"
                  >
                    <Download size={32} /> Export PDF
                  </button>
                  <button 
                    onClick={() => setStatus(AnalysisStep.REVIEWING)} 
                    className="flex-1 xl:flex-none bg-slate-900 text-slate-300 px-12 py-8 rounded-[3rem] font-black text-xl hover:bg-slate-800 transition-all border border-white/10"
                  >
                    Back to Blueprint
                  </button>
                </div>
             </div>
             
             {/* The Resume Preview content stays mostly same but inherits the better font-poppins for headers */}
             <div className="bg-white rounded-[6rem] overflow-hidden shadow-[0_120px_240px_-60px_rgba(0,0,0,1)] flex flex-col md:flex-row min-h-[1400px] border border-white/10">
               <div className="w-full md:w-[400px] bg-[#f8fafc] p-20 flex flex-col items-center border-r border-slate-200">
                  <div className="w-64 h-64 rounded-[4.5rem] border-[14px] border-white overflow-hidden mb-20 shadow-4xl bg-slate-100 flex items-center justify-center text-slate-200 relative group transition-transform duration-1000 hover:scale-105">
                     {profilePhoto ? ( <img src={profilePhoto} className="w-full h-full object-cover" alt="ID" /> ) : ( <User size={120} /> )}
                  </div>
                  <div className="w-full space-y-24">
                    <section>
                      <h3 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.6em] mb-12 border-b-4 border-blue-50 pb-6 font-poppins">Identity Summary</h3>
                      <div className="text-slate-700 text-[15px] leading-relaxed font-semibold whitespace-pre-wrap">
                        {highlightText(optimizedResume.profile, integratedKeywords)}
                      </div>
                    </section>
                  </div>
               </div>
               <div className="flex-1 bg-[#020617] p-32 text-white overflow-hidden relative">
                  <header className="mb-32">
                    <h1 className="text-[12rem] font-black tracking-tighter leading-[0.65] mb-6 uppercase text-white drop-shadow-4xl font-poppins">{optimizedResume.name.split(' ')[0]}</h1>
                    <h1 className="text-9xl font-black tracking-tighter text-slate-800 leading-none uppercase opacity-80 font-poppins">{optimizedResume.name.split(' ').slice(1).join(' ')}</h1>
                    <div className="inline-block mt-16 px-14 py-7 bg-blue-600 rounded-[3rem] font-black text-3xl uppercase tracking-[0.5em] shadow-4xl font-poppins">
                      {optimizedResume.jobTitle}
                    </div>
                  </header>
                  {/* ... rest of preview sections ... */}
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
