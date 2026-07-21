import axiosInstance from './axiosInstance';

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewCard {
  _id: string;
  quizId: string;
  quizTitle: string;
  question: string;
  options: string[];
  correctAnswer: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
}

export interface DueCardsResponse {
  cards: ReviewCard[];
  total: number;
}

export interface GradeResponse {
  card: ReviewCard;
  xpEarned: number;
}

export const reviewApi = {
  getDueCards: () =>
    axiosInstance.get<{ success: boolean; data: DueCardsResponse }>('spaced-repetition/due'),

  gradeCard: (cardId: string, result: ReviewGrade) =>
    axiosInstance.post<{ success: boolean; data: GradeResponse }>(
      `spaced-repetition/${cardId}/grade`,
      { result },
    ),
};
