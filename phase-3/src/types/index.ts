export interface Review {
  id: string;
  platform: string;
  rating: number;
  title: string;
  text: string;
  clean_text?: string;
  created_at: string;
  week_start: string;
  week_end: string;
}

export interface Theme {
  id: number;
  name: string;
  description: string;
  created_at: string;
  valid_from?: string;
  valid_to?: string;
}

export interface ThemeSummary {
  theme_id: number;
  name: string;
  description: string;
  review_count: number;
  avg_rating: number;
}

export interface Quote {
  text: string;
  rating: number;
}

export interface ActionIdea {
  idea: string;
}

export interface WeeklyPulse {
  id: number;
  week_start: string;
  week_end: string;
  top_themes: ThemeSummary[];
  user_quotes: Quote[];
  action_ideas: ActionIdea[];
  note_body: string;
  created_at: string;
  version: number;
}

export interface UserPreferences {
  id?: number;
  email: string;
  timezone: string;
  preferred_day_of_week: number;
  preferred_time: string;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
}

export interface DashboardStats {
  totalReviews: number;
  totalThemes: number;
  lastPulseDate: string | null;
  weeksCovered: number;
}
