import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import StepWizard from './components/StepWizard';
import LiveCalculation from './components/results/LiveCalculation';
import { isRetiredArchetype } from './logic/archetypes';

const DEFAULT_FORM_DATA = {
  // Step 1: Company Context
  industry: '',
  companySize: '',
  role: '',
  // Step 2: Risk & Readiness (moved earlier - drives cost estimates)
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: null,
  // Step 3: Project Archetype & Team Details
  processType: '',              // kept for backward compat
  projectArchetype: '',         // archetype id string
  assumptions: {},              // populated from archetype defaults, user-editable
  archetypeInputs: {},          // short, case-specific operating inputs
  // Current workforce doing the process. These are the source inputs for
  // the blended workforce cost used throughout the model.
  directEmployeeCount: 10,
  employeeFullyBurdenedCost: 125000,
  offshoreContractorCount: 0,
  contractorFullyBurdenedCost: 65000,
  hoursPerWeek: 40,
  // Legacy aggregate fields are retained for older shared models.
  teamSize: 10,
  avgSalary: 100000,
  // Existing contracts that could be retired after implementation.
  existingContractCount: 0,
  annualCostPerContract: 0,
  contractNoticePeriodMonths: 3,
  // Project-impact plan.
  totalEfficiencyGainPct: 10,
  employeesToRetrain: 0,
  employeesToMakeRedundant: 0,
  deliveryPace: 'standard',
  projectInputsComplete: false,
  costTransitionComplete: false,
  // Retired scenarios are retained only as historical data. A user must choose
  // a supported use case before the model can be run.
  legacyRetiredProjectArchetype: null,
  legacyRetiredArchetypeInputs: null,
  legacyRetiredAssumptions: null,
  // Optional usage meters. When blank, the model derives volume from the
  // selected archetype instead of treating headcount as the usage proxy.
  aiLicensedUsers: null,
  monthlyAiRequests: null,
  avgInputTokensPerRequest: null,
  avgOutputTokensPerRequest: null,
  monthlyAgentWorkflows: null,
  documentsPerMonth: null,
  dataStoredGb: null,
  connectedApplications: null,
  // Measured rework baseline (annual counts; replaces a blanket error-rate assumption).
  errorCountEmployees: 0,
  errorCountContracts: 0,
  annualErrorCount: 0,
  fractionNeedingRework: 0.5,
  estimatedReworkCostPerItem: 0,
  // Step 4: Current Costs
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
  revenueUpliftPct: null, // null = industry benchmark; integer 1-30
  contributionMargin: null, // defaults to 0.30
  cycleTimeReductionMonths: null, // defaults from industry benchmarks
  includeCapacityValue: false,
  includeRiskReduction: false,
  includeRevenueAcceleration: false,
  // V4: Reviewer feedback additions
  retainedTalentPremiumRate: null,  // defaults to 0.10 in calculations
  isAgenticWorkflow: false,
  // UX mode
  wizardMode: 'quick', // 'quick' or 'detailed'
};

const ANALYSIS_STEPS = [
  'Applying model assumptions',
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
    return prepareRestoredFormData(parsed);
  } catch { return null; }
}

/**
 * Keep a retired case explicit after restoring a share link.  In particular,
 * do not reinterpret legacy sales/pipeline values as customer-support inputs:
 * those have different workload, cost, and evidence requirements.
 */
function prepareRestoredFormData(data = {}) {
  // Retire the old implementation-location fields when a legacy share link
  // is restored. Deployment cost is now always tied to the entered direct
  // employee / contractor workforce mix.
  const {
    teamLocation: _retiredTeamLocation,
    contractorPct: _retiredContractorPct,
    blendedAISalary: _retiredBlendedAISalary,
    ...supportedData
  } = data;
  const restored = { ...DEFAULT_FORM_DATA, ...supportedData };
  if (!isRetiredArchetype(restored.projectArchetype)) return restored;

  return {
    ...restored,
    legacyRetiredProjectArchetype: restored.legacyRetiredProjectArchetype || restored.projectArchetype,
    legacyRetiredArchetypeInputs: restored.legacyRetiredArchetypeInputs || restored.archetypeInputs || {},
    legacyRetiredAssumptions: restored.legacyRetiredAssumptions || restored.assumptions || {},
    // Keep the retired id visible to the wizard so it can explain the change,
    // but invalidate both completion gates to prevent an unreviewed result.
    projectInputsComplete: false,
    costTransitionComplete: false,
  };
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
  const initialLoadDone = useRef(false);

  // Restore from share token (/share/:token) or URL hash on initial load
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const path = window.location.pathname;
    const shareMatch = path.match(/\/share\/([A-Za-z0-9_-]{7})$/);

    if (shareMatch) {
      loadSharedModel(shareMatch[1]).then((loaded) => {
        if (loaded && (loaded.industry || loaded.projectArchetype)) {
          const restored = prepareRestoredFormData(loaded);
          setFormData(restored);
          setScreen(isRetiredArchetype(restored.projectArchetype) ? 'wizard' : 'results');
        }
      });
      return;
    }

    // Fallback: hash-based sharing
    const hash = window.location.hash.slice(1);
    if (hash) {
      const restored = decodeFormData(hash);
      if (restored && (restored.industry || restored.projectArchetype)) {
        setFormData(restored);
        setScreen(isRetiredArchetype(restored.projectArchetype) ? 'wizard' : 'results');
      }
    }
  }, []);

  const handleStart = useCallback(() => setScreen('wizard'), []);
  const handleWizardComplete = useCallback(() => setScreen('analyzing'), []);
  const handleAnalysisComplete = useCallback(() => setScreen('results'), []);
  const handleDownload = useCallback(
    async (results, recommendation, mcResults) => {
      const { default: generateExecutiveReport } = await import('./pptx/generateExecutiveReport');
      await generateExecutiveReport(formData, results, recommendation, mcResults);
    },
    [formData]
  );

  const handleDownloadExcel = useCallback(async (mcResults, results) => {
    const { generateExcelModel } = await import('./excel/generateExcelModel');
    await generateExcelModel(formData, mcResults, results);
  }, [formData]);

  const handleEditInputs = useCallback(() => setScreen('wizard'), []);
  const handleShare = useCallback(async () => {
    // Try API-based short URL first
    const saved = await saveModelToAPI(formData);
    if (saved?.shareToken) {
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
        onBack={() => setScreen('landing')}
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
