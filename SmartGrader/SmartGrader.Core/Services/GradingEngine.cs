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

        public GradingRecord GradeQuestion(Question question, string studentAnswer)
        {
            var record = new GradingRecord
            {
                AssignmentId = 0,
                StudentId = 0,
                Answer = studentAnswer,
                FullScore = question.Score,
                GradedAt = DateTime.Now,
                GradingMethod = "RuleBased"
            };

            bool isCorrect = false;

            switch (question.Type)
            {
                case "Choice":
                    isCorrect = question.Answer.Trim().ToUpper() == studentAnswer.Trim().ToUpper();
                    break;
                case "TrueFalse":
                    isCorrect = question.Answer.Trim().ToLower() == studentAnswer.Trim().ToLower();
                    break;
                case "FillBlank":
                    isCorrect = question.Answer.Trim() == studentAnswer.Trim();
                    break;
                case "ShortAnswer":
                    isCorrect = false;
                    break;
                default:
                    isCorrect = question.Answer.Trim() == studentAnswer.Trim();
                    break;
            }

            record.IsCorrect = isCorrect;
            record.Score = isCorrect ? question.Score : 0;

            return record;
        }
    }
}
