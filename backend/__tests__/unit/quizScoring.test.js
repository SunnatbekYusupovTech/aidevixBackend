'use strict';

const { gradeQuizAnswers } = require('../../controllers/xpController');

const questions = Array.from({ length: 5 }, (_, i) => ({
  question: `q${i}`, options: ['a', 'b', 'c', 'd'], correctAnswer: (i * 7) % 4, xpReward: 10,
}));

describe('gradeQuizAnswers (D05 / COM-07)', () => {
  test('all correct answers -> score 100', () => {
    const answers = questions.map((q, i) => ({ questionIndex: i, selectedOption: q.correctAnswer }));
    const r = gradeQuizAnswers(questions, answers);
    expect(r.score).toBe(100);
    expect(r.correctCount).toBe(5);
    expect(r.totalXP).toBe(50);
  });

  test('every option for every question counts only the first answer per question', () => {
    const answers = [];
    for (let qi = 0; qi < 5; qi++) for (let o = 0; o < 4; o++) answers.push({ questionIndex: qi, selectedOption: o });
    const r = gradeQuizAnswers(questions, answers);
    // only option 0 is kept per question; correct for q0 and q4
    expect(r.correctCount).toBe(2);
    expect(r.score).toBe(40);
    expect(r.resultAnswers).toHaveLength(5);
  });

  test('duplicate correct answers do not push score above 100', () => {
    const answers = [0, 0, 0, 0, 0].map(() => ({ questionIndex: 0, selectedOption: questions[0].correctAnswer }));
    const r = gradeQuizAnswers(questions, answers);
    expect(r.correctCount).toBe(1);
    expect(r.score).toBe(20);
  });

  test('out-of-range / non-integer indexes are ignored', () => {
    const r = gradeQuizAnswers(questions, [
      { questionIndex: -1, selectedOption: 0 },
      { questionIndex: 5, selectedOption: 0 },
      { questionIndex: 1.5, selectedOption: 0 },
      { questionIndex: '__proto__', selectedOption: 0 },
      null,
    ]);
    expect(r.correctCount).toBe(0);
    expect(r.score).toBe(0);
    expect(r.resultAnswers).toHaveLength(0);
  });

  test('empty quiz -> score 0', () => {
    expect(gradeQuizAnswers([], [{ questionIndex: 0, selectedOption: 0 }]).score).toBe(0);
  });
});
