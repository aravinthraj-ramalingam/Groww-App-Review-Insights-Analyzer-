export interface Review {
  id: string;
  platform: 'android';
  rating: number;
  title: string;
  text: string;
  cleanText: string;
  createdAt: Date;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  rawPayload?: unknown;
}

