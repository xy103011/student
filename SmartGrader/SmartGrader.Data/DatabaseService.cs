using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartGrader.Core.Interfaces;
using SmartGrader.Data.Database;

namespace SmartGrader.Data
{
    public class DatabaseService : IDatabaseService
    {
        private readonly AppDbContext _context;
        private readonly string _dbPath;

        public DatabaseService(AppDbContext context)
        {
            _context = context;
            _dbPath = context.DbPath;
        }

        public void InitializeDatabase()
        {
            var directory = Path.GetDirectoryName(_dbPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            _context.Database.EnsureCreated();
        }

        public void BackupDatabase(string backupPath)
        {
            var directory = Path.GetDirectoryName(backupPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            if (File.Exists(_dbPath))
            {
                File.Copy(_dbPath, backupPath, true);
            }
        }

        public void RestoreDatabase(string backupPath)
        {
            if (File.Exists(backupPath))
            {
                if (File.Exists(_dbPath))
                {
                    File.Delete(_dbPath);
                }
                File.Copy(backupPath, _dbPath);
            }
        }
    }
}
