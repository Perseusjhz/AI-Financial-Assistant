export type WorkflowMode =
  | 'saving_plan'
  | 'expense_review'
  | 'risk_education'
  | 'follow_up'
  | 'general'
  | 'auto';

export interface SavingPlanInput {
  monthlyIncome: number;
  extraIncome?: number;
  fixedExpense: number;
  savingGoal: number;
  remainingDays: number;
  style?: 'strict' | 'balanced' | 'relaxed';
}

export interface ExpenseReviewInput {
  text: string;
  dailyBudget?: number;
}

export interface RiskEducationInput {
  question: string;
}

export interface AgentRequest {
  mode: WorkflowMode;
  message: string;
  messages?: Array<{ role?: 'user' | 'assistant' | 'system'; content?: string }>;
  system?: string;
  profile?: {
    dailyBudget?: number;
    savingGoal?: number;
    weeklyBudget?: number;
  };
  formData?: SavingPlanInput | ExpenseReviewInput | RiskEducationInput;
}

export interface ResultCard {
  title: string;
  value: string;
  subtitle?: string;
  type?: 'primary' | 'warning' | 'success' | 'danger' | 'info' | 'neutral';
}

export type FeasibilityLevel = 'good' | 'ok' | 'tight' | 'impossible';

export interface SavingPlanResult {
  type: 'saving_plan_result';
  feasibility: string;
  feasibilityLevel: FeasibilityLevel;
  totalIncome: number;
  fixedExpense: number;
  savingGoal: number;
  monthlySpendable: number;
  dailyBudget: number;
  weeklyBudget: number;
  riskPoints: string[];
  nextAction: string;
  reply: string;
}

export interface ExpenseCategories {
  necessary: string[];
  optimizable: string[];
  impulsive: string[];
  learning: string[];
}

export interface ExpenseReviewResult {
  type: 'expense_review_result';
  total: number;
  dailyBudget?: number;
  overBudget?: boolean;
  categories: ExpenseCategories;
  mainRisk: string;
  nextAction: string;
  reply: string;
}

export type RiskLevel = '低' | '中低' | '中' | '高' | '极高';
export type StudentSuitability =
  | '适合了解'
  | '可谨慎了解'
  | '需要谨慎'
  | '不建议参与'
  | '强烈不建议';

export interface RiskEducationResult {
  type: 'risk_education_result';
  riskLevel: RiskLevel;
  studentSuitability: StudentSuitability;
  conclusion: string;
  reasons: string[];
  nextAction: string;
  disclaimer: string;
  reply: string;
}

export interface AgentResponse {
  mode: WorkflowMode;
  type: string;
  summary: string;
  cards?: ResultCard[];
  result?: SavingPlanResult | ExpenseReviewResult | RiskEducationResult;
  reply: string;
  needMoreInfo?: boolean;
  missingField?: string;
  error?: string;
  state?: AppStateSnapshot;
}

export interface AppStateSnapshot {
  sessionId?: string;
  dailyBudget?: number;
  weeklyBudget?: number;
  savingGoal?: number;
  monthlySpendable?: number;
  totalIncome?: number;
  lastPlan?: {
    savingGoal: number;
    dailyBudget: number;
    weeklyBudget: number;
    monthlySpendable: number;
    feasibility: string;
    updatedAt: string;
    riskPoints?: string[];
  };
  lastReview?: {
    total: number;
    overBudget?: boolean;
    date: string;
    categories?: ExpenseCategories;
    mainRisk?: string;
    nextAction?: string;
  };
  todaySpent?: number;
  historyCount?: number;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: ResultCard[];
  result?: AgentResponse['result'];
  timestamp: number;
}
