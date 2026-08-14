using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;
using SmartGrader.Data.Database;

namespace SmartGrader.Core.Services
{
    public class StatisticsService : IStatisticsService
    {
        private readonly AppDbContext _context;

        public StatisticsService(AppDbContext context)
        {
            _context = context;
        }

        public ClassStatistics GetClassStatistics(int classId, int assignmentId)
        {
            var classEntity = _context.Classes
                .Include(c => c.Students)
                .FirstOrDefault(c => c.Id == classId);

            if (classEntity == null)
            {
                return new ClassStatistics { ClassId = classId };
            }

            var students = classEntity.Students;
            var records = _context.GradingRecords
                .Where(r => r.AssignmentId == assignmentId && students.Select(s => s.Id).Contains(r.StudentId))
                .ToList();

            var stats = new ClassStatistics
            {
                ClassId = classId,
                ClassName = classEntity.Name,
                TotalStudents = students.Count,
            };

            if (records.Any())
            {
                var scores = records.Select(r => (double)r.Score).ToList();
                stats.AverageScore = scores.Average();
                stats.HighestScore = scores.Max();
                stats.LowestScore = scores.Min();
                
                var passingScore = records.Any() ? records.Select(r => r.FullScore).FirstOrDefault() * 0.6 : 0;
                stats.PassCount = records.Count(r => r.Score >= passingScore);
                stats.FailCount = records.Count(r => r.Score < passingScore);
                stats.PassRate = stats.TotalStudents > 0 ? (double)stats.PassCount / stats.TotalStudents * 100 : 0;
            }

            return stats;
        }

        public QuestionStatistics GetQuestionStatistics(int assignmentId)
        {
            var assignment = _context.Assignments
                .Include(a => a.Questions)
                .FirstOrDefault(a => a.Id == assignmentId);

            if (assignment == null || !assignment.Questions.Any())
            {
                return new QuestionStatistics();
            }

            var records = _context.GradingRecords
                .Where(r => r.AssignmentId == assignmentId)
                .ToList();

            var statsList = new List<QuestionStatistics>();

            foreach (var question in assignment.Questions)
            {
                var questionRecords = records.Where(r => r.Id == question.Id).ToList();
                
                var stat = new QuestionStatistics
                {
                    QuestionId = question.Id,
                    QuestionContent = question.Content.Substring(0, Math.Min(50, question.Content.Length)),
                    TotalAttempts = questionRecords.Count,
                    CorrectCount = questionRecords.Count(r => r.IsCorrect),
                    TotalScore = questionRecords.Sum(r => r.Score),
                };

                if (stat.TotalAttempts > 0)
                {
                    stat.AccuracyRate = (double)stat.CorrectCount / stat.TotalAttempts * 100;
                    stat.AverageScore = (double)stat.TotalScore / stat.TotalAttempts;
                }

                statsList.Add(stat);
            }

            return statsList.FirstOrDefault() ?? new QuestionStatistics();
        }

        public List<GradeHistory> GetGradeHistory(int studentId)
        {
            var records = _context.GradingRecords
                .Where(r => r.StudentId == studentId)
                .OrderByDescending(r => r.GradedAt)
                .ToList();

            var history = new List<GradeHistory>();

            foreach (var record in records)
            {
                var assignment = _context.Assignments
                    .FirstOrDefault(a => a.Id == record.AssignmentId);

                var student = _context.Students
                    .FirstOrDefault(s => s.Id == record.StudentId);

                history.Add(new GradeHistory
                {
                    Id = record.Id,
                    AssignmentId = record.AssignmentId,
                    AssignmentName = assignment?.Name ?? "未知作业",
                    StudentId = record.StudentId,
                    StudentName = student?.Name ?? "未知学生",
                    Score = record.Score,
                    FullScore = record.FullScore,
                    ScoreRate = record.FullScore > 0 ? (double)record.Score / record.FullScore * 100 : 0,
                    GradedAt = record.GradedAt,
                    GradingMethod = record.GradingMethod ?? "未知"
                });
            }

            return history;
        }

        public List<GradeHistory> GetGradeHistoryByAssignment(int assignmentId)
        {
            var records = _context.GradingRecords
                .Where(r => r.AssignmentId == assignmentId)
                .OrderByDescending(r => r.GradedAt)
                .ToList();

            var assignment = _context.Assignments
                .FirstOrDefault(a => a.Id == assignmentId);

            var history = new List<GradeHistory>();

            foreach (var record in records)
            {
                var student = _context.Students
                    .FirstOrDefault(s => s.Id == record.StudentId);

                history.Add(new GradeHistory
                {
                    Id = record.Id,
                    AssignmentId = record.AssignmentId,
                    AssignmentName = assignment?.Name ?? "未知作业",
                    StudentId = record.StudentId,
                    StudentName = student?.Name ?? "未知学生",
                    Score = record.Score,
                    FullScore = record.FullScore,
                    ScoreRate = record.FullScore > 0 ? (double)record.Score / record.FullScore * 100 : 0,
                    GradedAt = record.GradedAt,
                    GradingMethod = record.GradingMethod ?? "未知"
                });
            }

            return history;
        }
    }
}
