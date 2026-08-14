using System;
using System.Collections.Generic;

namespace SmartGrader.Core.Models
{
    public class Question
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<Option> Options { get; set; } = new();
        public string Answer { get; set; } = string.Empty;
        public int Score { get; set; }
        public string? Explanation { get; set; }
    }

    public class Option
    {
        public string Label { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class Assignment
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int TeacherId { get; set; }
        public List<Question> Questions { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class Student
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public int ClassId { get; set; }
    }

    public class Class
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TeacherId { get; set; }
        public List<Student> Students { get; set; } = new();
    }

    public class GradingRecord
    {
        public int Id { get; set; }
        public int AssignmentId { get; set; }
        public int StudentId { get; set; }
        public string Answer { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
        public int Score { get; set; }
        public int FullScore { get; set; }
        public string? Feedback { get; set; }
        public string? GradingMethod { get; set; }
        public DateTime GradedAt { get; set; }
    }

    public class GradingResult
    {
        public int TotalQuestions { get; set; }
        public int CorrectCount { get; set; }
        public int WrongCount { get; set; }
        public double AccuracyRate { get; set; }
        public int TotalScore { get; set; }
        public int FullTotalScore { get; set; }
        public double ScoreRate { get; set; }
        public List<GradingRecord> Records { get; set; } = new();
    }
}
