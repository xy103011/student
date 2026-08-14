using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartGrader.AI.Services;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;
using SmartGrader.Core.Services;
using SmartGrader.Data;
using SmartGrader.Data.Database;
using SmartGrader.Data.Database;
using SmartGrader.Image.Services;

namespace SmartGrader.Desktop.ViewModels
{
    public partial class MainViewModel : CommunityToolkit.Mvvm.ComponentModel.ObservableObject
    {
        private readonly AppDbContext _context;
        private readonly IGradingEngine _gradingEngine;
        private readonly IAIgradingService _aiService;
        private readonly IImageProcessingService _imageService;
        private readonly IStatisticsService _statisticsService;

        [ObservableProperty]
        private string _currentView = "Assignments";

        [ObservableProperty]
        private ObservableCollection<Assignment> _assignments = new();

        [ObservableProperty]
        private ObservableCollection<Student> _students = new();

        [ObservableProperty]
        private ObservableCollection<Class> _classes = new();

        [ObservableProperty]
        private Assignment? _selectedAssignment;

        [ObservableProperty]
        private Student? _selectedStudent;

        [ObservableProperty]
        private Class? _selectedClass;

        [ObservableProperty]
        private GradingResult? _gradingResult;

        [ObservableProperty]
        private ObservableCollection<GradeHistory> _gradeHistory = new();

        [ObservableProperty]
        private ClassStatistics? _classStats;

        [ObservableProperty]
        private string _statusMessage = string.Empty;

        [ObservableProperty]
        private bool _isBusy;

        public MainViewModel()
        {
            _context = new AppDbContext();
            var dbService = new DatabaseService(_context);
            dbService.InitializeDatabase();

            _gradingEngine = new GradingEngine();
            _aiService = new AIService(null, null);
            _imageService = new ImageProcessingService();
            _statisticsService = new StatisticsService();
        }

        [RelayCommand]
        private async Task LoadAssignments()
        {
            try
            {
                IsBusy = true;
                StatusMessage = "正在加载作业列表...";
                
                var repository = new AssignmentRepository(_context);
                var assignments = await repository.GetActiveAssignmentsAsync();
                Assignments = new ObservableCollection<Assignment>(assignments);
                
                StatusMessage = $"已加载 {assignments.Count()} 个作业";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task LoadStudents()
        {
            try
            {
                IsBusy = true;
                StatusMessage = "正在加载学生列表...";
                
                var repository = new StudentRepository(_context);
                var students = await repository.GetAllAsync();
                Students = new ObservableCollection<Student>(students);
                
                StatusMessage = $"已加载 {students.Count()} 名学生";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task LoadClasses()
        {
            try
            {
                IsBusy = true;
                StatusMessage = "正在加载班级列表...";
                
                var repository = new ClassRepository(_context);
                var classes = await repository.GetWithStudentsAsync();
                Classes = new ObservableCollection<Class>(classes);
                
                StatusMessage = $"已加载 {classes.Count()} 个班级";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task GradeAssignment()
        {
            if (SelectedAssignment == null || SelectedStudent == null)
            {
                StatusMessage = "请选择作业和学生";
                return;
            }

            try
            {
                IsBusy = true;
                StatusMessage = "正在批阅作业...";
                
                var gradingRecords = new List<GradingRecord>();
                
                foreach (var question in SelectedAssignment.Questions)
                {
                    var record = _gradingEngine.GradeQuestion(question, "待批阅");
                    record.AssignmentId = SelectedAssignment.Id;
                    record.StudentId = SelectedStudent.Id;
                    gradingRecords.Add(record);
                }

                var repository = new GradingRecordRepository(_context);
                foreach (var record in gradingRecords)
                {
                    await repository.AddAsync(record);
                }

                GradingResult = _gradingEngine.GradeAssignment(SelectedAssignment, gradingRecords);
                StatusMessage = "批阅完成";
            }
            catch (Exception ex)
            {
                StatusMessage = $"批阅失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task GradeWithAI()
        {
            if (SelectedAssignment == null || SelectedStudent == null)
            {
                StatusMessage = "请选择作业和学生";
                return;
            }

            try
            {
                IsBusy = true;
                StatusMessage = "正在使用AI批阅...";
                
                var gradingRecords = new List<GradingRecord>();
                
                foreach (var question in SelectedAssignment.Questions)
                {
                    GradingRecord record;
                    
                    if (question.Type == "ShortAnswer" || question.Type == "Essay")
                    {
                        var isAvailable = await _aiService.IsAvailableAsync();
                        if (isAvailable)
                        {
                            record = await _aiService.GradeSubjectiveAsync(question, "学生答案");
                        }
                        else
                        {
                            record = _gradingEngine.GradeQuestion(question, "待批阅");
                        }
                    }
                    else
                    {
                        record = _gradingEngine.GradeQuestion(question, "待批阅");
                    }
                    
                    record.AssignmentId = SelectedAssignment.Id;
                    record.StudentId = SelectedStudent.Id;
                    gradingRecords.Add(record);
                }

                var repository = new GradingRecordRepository(_context);
                foreach (var record in gradingRecords)
                {
                    await repository.AddAsync(record);
                }

                GradingResult = _gradingEngine.GradeAssignment(SelectedAssignment, gradingRecords);
                StatusMessage = "AI批阅完成";
            }
            catch (Exception ex)
            {
                StatusMessage = $"AI批阅失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task ViewStatistics()
        {
            if (SelectedAssignment == null)
            {
                StatusMessage = "请选择作业";
                return;
            }

            try
            {
                IsBusy = true;
                StatusMessage = "正在加载统计数据...";
                
                var history = _statisticsService.GetGradeHistoryByAssignment(SelectedAssignment.Id);
                GradeHistory = new ObservableCollection<GradeHistory>(history);
                
                StatusMessage = $"已加载 {history.Count} 条批阅记录";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载统计失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task ViewClassStatistics()
        {
            if (SelectedClass == null || SelectedAssignment == null)
            {
                StatusMessage = "请选择班级和作业";
                return;
            }

            try
            {
                IsBusy = true;
                StatusMessage = "正在加载班级统计...";
                
                ClassStats = _statisticsService.GetClassStatistics(SelectedClass.Id, SelectedAssignment.Id);
                
                StatusMessage = "班级统计加载完成";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载统计失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task ProcessImage(byte[] imageData)
        {
            try
            {
                IsBusy = true;
                StatusMessage = "正在处理图片...";
                
                var processed = await _imageService.ProcessImageAsync(imageData);
                var info = _imageService.GetImageInfo(imageData);
                
                StatusMessage = $"图片处理完成: {info.Width}x{info.Height}";
            }
            catch (Exception ex)
            {
                StatusMessage = $"图片处理失败: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private void Navigate(string view)
        {
            CurrentView = view;
            StatusMessage = $"已切换到: {view}";
        }
    }
}
