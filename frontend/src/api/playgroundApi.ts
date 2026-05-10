import api from './axiosInstance';

export type PlaygroundIssue = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  line: number | null;
  message: string;
  fix: string;
};

export type PlaygroundReview = {
  score: number;
  summary: string;
  issues: PlaygroundIssue[];
  improvements: string[];
  rewrite: string;
  model: string;
  language: string;
  createdAt: string;
  degraded?: boolean;
};

export const playgroundApi = {
  /** POST /playground/review — kod tahlili (Groq AI) */
  review: (data: { code: string; language: string; prompt?: string }) =>
    api.post('playground/review', data),
};
