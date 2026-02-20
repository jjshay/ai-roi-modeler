import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import StepWizard from './components/StepWizard';
import LiveCalculation from './components/results/LiveCalculation';

const DEFAULT_FORM_DATA = {
  // Step 1: Company Context
  industry: '',
  companySize: '',
  role: '',
  teamLocation: '',
  // Step 2: Risk & Readiness (moved earlier - drives cost estimates)
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  // Step 3: Project Archetype & Team Details
  processType: '',              // kept for backward compat
  projectArchetype: '',         // archetype id string
  assumptions: {},              // populated from archetype defaults, user-editable
  teamSize: 10,
  hoursPerWeek: 20,
  errorRate: 0.10,
  // Step 4: Current Costs
  avgSalary: 100000,
  currentToolCosts: 0,
  vendorsReplaced: 0,
  vendorTerminationCost: 0,
  // Step 5: AI Investment (auto-suggested based on context)
  implementationBudget: null, // Auto-calculated if null
  expectedTimeline: null, // Auto-calculated if null
  ongoingAnnualCost: null, // Auto-calculated if null
  // Step 1 (optional): State for R&D credit
  companyState: 'Other / Not Sure',
  // V3: Advanced Value Modeling (optional)
  cashRealizationPct: null, // defaults to 0.40 in calculations
  annualRevenue: 0,
  contributionMargin: null, // defaults to 0.30
  cycleTimeReductionMonths: null, // defaults from industry benchmarks
  includeCapacityValue: false,
  includeRiskReduction: false,
  includeRevenueAcceleration: false,
  // V4: Reviewer feedback additions
  retainedTalentPremiumRate: null,  // defaults to 0.10 in calculations
  isAgenticWorkflow: false,
};

const ANALYSIS_STEPS = [
  'Calibrating industry benchmarks',
  'Running 5-year DCF projections',
  'Modeling three scenarios',
  'Calculating value pathways',
  'Evaluating capital efficiency',
  'Finalizing risk adjustments',
];

function AnalyzingScreen({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const stepDuration = 300; // ms per step (faster per reviewer feedback)
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    // Transition to results after all steps complete + brief pause
    const totalDuration = ANALYSIS_STEPS.length * stepDuration + 400;
    const completeTimer = setTimeout(onComplete, totalDuration);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md w-full text-center"
      >
        {/* Animated ring */}
        <div className="relative mx-auto w-20 h-20 mb-8">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-gray-200"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-gold border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-bold text-navy">
              {Math.round(((activeStep + 1) / ANALYSIS_STEPS.length) * 100)}%
            </span>
          </div>
        </div>

        <h2 className="text-navy text-xl font-bold mb-2">Analyzing Your Data</h2>
        <p className="text-gray-400 text-sm mb-8">Building your custom ROI model</p>

        {/* Step list */}
        <div className="space-y-3 text-left">
          {ANALYSIS_STEPS.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: i <= activeStep ? 1 : 0.3,
                x: 0,
              }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                i < activeStep
                  ? 'bg-emerald-500 text-white'
                  : i === activeStep
                    ? 'bg-gold text-navy'
                    : 'bg-gray-200 text-gray-400'
              }`}>
                {i < activeStep ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    &#10003;
                  </motion.span>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-sm ${
                i <= activeStep ? 'text-navy font-medium' : 'text-gray-400'
              }`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold to-amber-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((activeStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function encodeFormData(data) {
  try {
    const compact = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== DEFAULT_FORM_DATA[k] && v !== '' && v !== null && v !== 0 && v !== false) {
        compact[k] = v;
      }
    }
    return btoa(JSON.stringify(compact));
  } catch { return ''; }
}

function decodeFormData(hash) {
  try {
    const parsed = JSON.parse(atob(hash));
    return { ...DEFAULT_FORM_DATA, ...parsed };
  } catch { return null; }
}

const API_URL = import.meta.env.VITE_API_URL || '';

async function loadSharedModel(token) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/share/${token}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.formData || null;
  } catch {
    return null;
  }
}

async function saveModelToAPI(formData) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData }),
    });
    if (!res.ok) return null;
    return await res.json(); // { id, shareToken }
  } catch {
    return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState('landing'); // landing | wizard | analyzing | results
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [modelId, setModelId] = useState(null);
  const initialLoadDone = useRef(false);

  // Restore from share token (/share/:token) or URL hash on initial load
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const path = window.location.pathname;
    const shareMatch = path.match(/\/share\/([A-Za-z0-9_-]{7})$/);

    if (shareMatch) {
      loadSharedModel(shareMatch[1]).then((loaded) => {
        if (loaded && loaded.industry) {
          setFormData({ ...DEFAULT_FORM_DATA, ...loaded });
          setScreen('results');
        }
      });
      return;
    }

    // Fallback: hash-based sharing
    const hash = window.location.hash.slice(1);
    if (hash) {
      const restored = decodeFormData(hash);
      if (restored && restored.industry) {
        setFormData(restored);
        setScreen('results');
      }
    }
  }, []);

  const handleStart = useCallback(() => setScreen('wizard'), []);
  const handleWizardComplete = useCallback(() => setScreen('analyzing'), []);
  const handleAnalysisComplete = useCallback(() => setScreen('results'), []);
  const handleDownload = useCallback(
    async (results, recommendation, mcResults) => {
      const { default: generateReport } = await import('./pdf/generateReport');
      generateReport(formData, results, recommendation, mcResults);
    },
    [formData]
  );

  const handleDownloadExcel = useCallback(async (mcResults) => {
    const { generateExcelModel } = await import('./excel/generateExcelModel');
    generateExcelModel(formData, mcResults);
  }, [formData]);

  const handleEditInputs = useCallback(() => setScreen('wizard'), []);
  const handleShare = useCallback(async () => {
    // Try API-based short URL first
    const saved = await saveModelToAPI(formData);
    if (saved?.shareToken) {
      setModelId(saved.id);
      const url = `${window.location.origin}/share/${saved.shareToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
      return url;
    }
    // Fallback: hash-based sharing
    const encoded = encodeFormData(formData);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {});
    return url;
  }, [formData]);
  const handleStartOver = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setModelId(null);
    setScreen('landing');
  }, []);

  if (screen === 'landing') {
    return <LandingPage onStart={handleStart} />;
  }

  if (screen === 'wizard') {
    return (
      <StepWizard
        formData={formData}
        setFormData={setFormData}
        onComplete={handleWizardComplete}
      />
    );
  }

  if (screen === 'analyzing') {
    return <AnalyzingScreen onComplete={handleAnalysisComplete} />;
  }

  return (
    <LiveCalculation
      formData={formData}
      onDownload={handleDownload}
      onDownloadExcel={handleDownloadExcel}
      onStartOver={handleStartOver}
      onEditInputs={handleEditInputs}
      onShare={handleShare}
    />
  );
}
