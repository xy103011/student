using System;
using System.Collections.Generic;
using System.Linq;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.Core.Services
{
    public class GradingEngine : IGradingEngine
    {
        public GradingResult GradeAssignment(Assignment assignment, List<GradingRecord> records)
        {
            var result = new GradingResult
            {
                TotalQuestions = assignment.Questions.Count,
                Records = records
            };

            result.CorrectCount = records.Count(r => r.IsCorrect);
            result.WrongCount = records.Count(r => !r.IsCorrect);
            result.TotalScore = records.Sum(r => r.Score);
            result.FullTotalScore = assignment.Questions.Sum(q => q.Score);

            if (result.TotalQuestions > 0)
            {
                result.AccuracyRate = (double)result.CorrectCount / result.TotalQuestions * 100;
            }
            if (result.FullTotalScore > 0)
            {
                result.ScoreRate = (double)result.TotalScore / result.FullTotalScore * 100;
            }

            return result;
        }

        public GradingRecord GradeQuestion(Question question, string answer, string studentAnswer)
        {
            var record = new GradingRecord
            {
                Question = question,
                StudentAnswer = studentAnswer,
                GradedAt = DateTime.Now,
                GradingMethod = "RuleBased"
            };

            bool isCorrect = false;
            int score = 0;

            switch (question.Type)
            {
                case "Choice":
                    isCorrect = answer.Trim().ToUpper() == studentAnswer.Trim().ToUpper();
                    break;
                case "TrueFalse":
                    isCorrect = answer.Trim().ToLower() == studentAnswer.Trim().ToLower();
                    break;
                case "FillBlank":
                    isCorrect = answer.Trim() == studentAnswer.Trim();
                    break;
                case "ShortAnswer":
                    isCorrect = question.IsAIRequired == true;
                    record.NeedsAIGrading = true;
                    break;
                default:
                    isCorrect = answer.Trim() == studentAnswer.Trim();
                    break;
            }

            record.IsCorrect = isCorrect;
            record.Score = isCorrect ? question.Score : 0;

            return record;
        }
    }
}
