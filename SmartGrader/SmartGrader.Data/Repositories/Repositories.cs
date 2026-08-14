using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.Data.Repositories
{
    public class BaseRepository<T> : IRepository<T> where T : class
    {
        protected readonly AppDbContext _context;
        protected readonly DbSet<T> _dbSet;

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

    public class QuestionRepository : BaseRepository<Question>, IRepository<Question>
    {
        public QuestionRepository(AppDbContext context) : base(context) { }
    }

    public class AssignmentRepository : BaseRepository<Assignment>, IRepository<Assignment>
    {
        public AssignmentRepository(AppDbContext context) : base(context) { }
    }

    public class StudentRepository : BaseRepository<Student>, IRepository<Student>
    {
        public StudentRepository(AppDbContext context) : base(context) { }
    }

    public class ClassRepository : BaseRepository<Class>, IRepository<Class>
    {
        public ClassRepository(AppDbContext context) : base(context) { }
    }

    public class GradingRecordRepository : BaseRepository<GradingRecord>, IRepository<GradingRecord>
    {
        public GradingRecordRepository(AppDbContext context) : base(context) { }

        public async Task<List<GradingRecord>> GetByAssignmentAsync(int assignmentId)
        {
            return await _dbSet.Where(r => r.AssignmentId == assignmentId).ToListAsync();
        }

        public async Task<List<GradingRecord>> GetByStudentAsync(int studentId)
        {
            return await _dbSet.Where(r => r.StudentId == studentId).ToListAsync();
        }
    }
}
