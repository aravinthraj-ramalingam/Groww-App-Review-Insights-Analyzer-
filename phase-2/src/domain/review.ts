export interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  text: string;
  clean_text: string;
  created_at: string; // ISO
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
}

