export type MarketingGoal = 'awareness' | 'conversion' | 'seeding';

export interface SelectionCriteria {
  cities: string[];
  ecommerceRequired: boolean;
  excludeTags: string[];
  followerMax?: number;
  followerMin?: number;
  gender?: 'F' | 'M';
  includeTags: string[];
  interactRateMin?: number;
  marketingGoal: MarketingGoal;
  price20To60Max?: number;
  provinces: string[];
}

export interface CriteriaChip {
  key: string;
  label: string;
  tone?: 'danger' | 'default' | 'goal';
}

export interface UnsupportedRequirement {
  reason: string;
  text: string;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  max: number;
  score: number;
}

export interface CandidateRecommendation {
  authorId: string;
  avatar?: string;
  city: string;
  dataConfidence: number;
  ecommerceEnabled: boolean;
  expectedPlayNum: number;
  follower: number;
  interactRate30d: number;
  linkConvertIndex: number;
  linkShoppingIndex: number;
  linkSpreadIndex: number;
  matchScore: number;
  nickName: string;
  playOverRate30d: number;
  price20To60: number;
  primaryTags: string[];
  province: string;
  reasons: string[];
  risks: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  starId: string;
}

export interface SelectionExample {
  accent: string;
  description: string;
  icon: string;
  id: string;
  text: string;
  title: string;
}

export interface StaticRecommendationResponse {
  candidates: CandidateRecommendation[];
  criteria: SelectionCriteria;
  queryTimeMs: number;
  totalMatched: number;
  unsupportedRequirements: UnsupportedRequirement[];
}
