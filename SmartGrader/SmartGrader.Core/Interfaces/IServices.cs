using System;
using SmartGrader.Core.Models;

namespace SmartGrader.Core.Interfaces
{
    public interface IGradingEngine
    {
        GradingResult GradeAssignment(Assignment assignment, List<GradingRecord> records);
        GradingRecord GradeQuestion(Question question, string answer, string studentAnswer);
    }

    public interface IAI gradingService
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

    public class ImageInfo
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public string Format { get; set; } = string.Empty;
        public long SizeInBytes { get; set; }
    }
}
