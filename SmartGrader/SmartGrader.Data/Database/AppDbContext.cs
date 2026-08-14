using System;
using Microsoft.EntityFrameworkCore;
using SmartGrader.Core.Models;

namespace SmartGrader.Data.Database
{
    public class AppDbContext : DbContext
    {
        public string DbPath { get; private set; }

        public AppDbContext()
        {
            DbPath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SmartGrader", "grader.db");
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                optionsBuilder.UseSqlite($"Data Source={DbPath}");
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Question>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Answer).IsRequired();
            });

            modelBuilder.Entity<Assignment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);
            });

            modelBuilder.Entity<Student>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.StudentId).IsRequired().HasMaxLength(50);
            });

            modelBuilder.Entity<Class>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<GradingRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Answer).IsRequired();
                entity.Property(e => e.Feedback).HasMaxLength(500);
            });
        }

        public DbSet<Question> Questions => Set<Question>();
        public DbSet<Assignment> Assignments => Set<Assignment>();
        public DbSet<Student> Students => Set<Student>();
        public DbSet<Class> Classes => Set<Class>();
        public DbSet<GradingRecord> GradingRecords => Set<GradingRecord>();
    }
}
