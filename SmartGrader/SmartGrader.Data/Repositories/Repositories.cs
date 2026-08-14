using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;
using SmartGrader.Data.Database;

namespace SmartGrader.Data
{
    public class BaseRepository<T> : IRepository<T> where T : class
    {
        protected readonly AppDbContext _context;
        protected readonly Microsoft.EntityFrameworkCore.DbSet<T> _dbSet;

        public BaseRepository(AppDbContext context)
        {
            _context = context;
            _dbSet = context.Set<T>();
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public virtual async Task<T?> GetByIdAsync(int id)
        {
            return await _dbSet.FindAsync(id);
        }

        public virtual async Task AddAsync(T entity)
        {
            await _dbSet.AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        public virtual async Task UpdateAsync(T entity)
        {
            _dbSet.Update(entity);
            await _context.SaveChangesAsync();
        }

        public virtual async Task DeleteAsync(int id)
        {
            var entity = await _dbSet.FindAsync(id);
            if (entity != null)
            {
                _dbSet.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class QuestionRepository : BaseRepository<Question>
    {
        public QuestionRepository(AppDbContext context) : base(context) { }
    }

    public class AssignmentRepository : BaseRepository<Assignment>
    {
        public AssignmentRepository(AppDbContext context) : base(context) { }

        public async Task<List<Assignment>> GetActiveAssignmentsAsync()
        {
            return await _dbSet.Where(a => a.IsActive).ToListAsync();
        }
    }

    public class StudentRepository : BaseRepository<Student>
    {
        public StudentRepository(AppDbContext context) : base(context) { }

        public async Task<List<Student>> GetByClassAsync(int classId)
        {
            return await _dbSet.Where(s => s.ClassId == classId).ToListAsync();
        }
    }

    public class ClassRepository : BaseRepository<Class>
    {
        public ClassRepository(AppDbContext context) : base(context) { }

        public async Task<List<Class>> GetWithStudentsAsync()
        {
            return await _dbSet.Include(c => c.Students).ToListAsync();
        }
    }

    public class GradingRecordRepository : BaseRepository<GradingRecord>
    {
        public GradingRecordRepository(AppDbContext context) : base(context) { }

        public async Task<List<GradingRecord>> GetByAssignmentAsync(int assignmentId)
        {
            return await _dbSet.Where(r => r.AssignmentId == assignmentId).ToListAsync();
        }

        public async Task<List<GradingRecord>> GetByStudentAsync(int studentId)
        {
            return await _dbSet.Where(r => r.StudentId == studentId).OrderByDescending(r => r.GradedAt).ToListAsync();
        }

        public async Task<List<GradingRecord>> GetByAssignmentAndStudentAsync(int assignmentId, int studentId)
        {
            return await _dbSet.Where(r => r.AssignmentId == assignmentId && r.StudentId == studentId).ToListAsync();
        }

        public async Task<int> GetTotalRecordsAsync(int assignmentId)
        {
            return await _dbSet.CountAsync(r => r.AssignmentId == assignmentId);
        }

        public async Task<double> GetAverageScoreAsync(int assignmentId)
        {
            var records = await _dbSet.Where(r => r.AssignmentId == assignmentId).ToListAsync();
            return records.Any() ? records.Average(r => (double)r.Score) : 0;
        }

        public async Task<double> GetAccuracyRateAsync(int assignmentId)
        {
            var records = await _dbSet.Where(r => r.AssignmentId == assignmentId).ToListAsync();
            return records.Any() ? (double)records.Count(r => r.IsCorrect) / records.Count * 100 : 0;
        }
    }
}
