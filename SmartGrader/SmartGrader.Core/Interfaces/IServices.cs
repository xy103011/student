using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SmartGrader.Core.Models;

namespace SmartGrader.Core.Interfaces
{
    public interface IGradingEngine
    {
        GradingResult GradeAssignment(Assignment assignment, List<GradingRecord> records);
        GradingRecord GradeQuestion(Question question, string studentAnswer);
    }

    public interface IAIgradingService
    {
        Task<GradingRecord> GradeSubjectiveAsync(Question question, string studentAnswer);
        Task<bool> IsAvailableAsync();
    }

    public interface IImageProcessingService
    {
        Task<byte[]> ProcessImageAsync(byte[] imageData);
        Task<string> ExtractTextAsync(byte[] imageData);
        ImageInfo GetImageInfo(byte[] imageData);
    }

    public interface IRepository<T> where T : class
    {
        Task<IEnumerable<T>> GetAllAsync();
        Task<T?> GetByIdAsync(int id);
        Task AddAsync(T entity);
        Task UpdateAsync(T entity);
        Task DeleteAsync(int id);
    }

    public interface IDatabaseService
    {
        void InitializeDatabase();
        void BackupDatabase(string backupPath);
        void RestoreDatabase(string backupPath);
    }

    public interface IStatisticsService
    {
        ClassStatistics GetClassStatistics(int classId, int assignmentId);
        QuestionStatistics GetQuestionStatistics(int assignmentId);
        List<GradeHistory> GetGradeHistory(int studentId);
        List<GradeHistory> GetGradeHistoryByAssignment(int assignmentId);
    }

    public class ImageInfo
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public string Format { get; set; } = string.Empty;
        public long SizeInBytes { get; set; }
    }

    public class ClassStatistics
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public double AverageScore { get; set; }
        public double HighestScore { get; set; }
        public double LowestScore { get; set; }
        public int PassCount { get; set; }
        public int FailCount { get; set; }
        public double PassRate { get; set; }
    }

    public class QuestionStatistics
    {
        public int QuestionId { get; set; }
        public string QuestionContent { get; set; } = string.Empty;
        public int TotalAttempts { get; set; }
        public int CorrectCount { get; set; }
        public double AccuracyRate { get; set; }
        public int TotalScore { get; set; }
        public double AverageScore { get; set; }
    }

    public class GradeHistory
    {
        public int Id { get; set; }
        public int AssignmentId { get; set; }
        public string AssignmentName { get; set; } = string.Empty;
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int Score { get; set; }
        public int FullScore { get; set; }
        public double ScoreRate { get; set; }
        public DateTime GradedAt { get; set; }
        public string GradingMethod { get; set; } = string.Empty;
    }
}
