using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.Desktop.ViewModels
{
    public partial class MainViewModel : ObservableObject
    {
        private readonly IGradingEngine _gradingEngine;
        private readonly IAIgradingService _aiService;
        private readonly IImageProcessingService _imageService;

        [ObservableProperty]
        private string _currentView = "Home";

        [ObservableProperty]
        private ObservableCollection<Assignment> _assignments = new();

        [ObservableProperty]
        private ObservableCollection<Student> _students = new();

        [ObservableProperty]
        private Assignment? _selectedAssignment;

        [ObservableProperty]
        private Student? _selectedStudent;

        [ObservableProperty]
        private GradingResult? _gradingResult;

        [ObservableProperty]
        private string _statusMessage = string.Empty;

        public MainViewModel(
            IGradingEngine gradingEngine,
            IAIgradingService aiService,
            IImageProcessingService imageService)
        {
            _gradingEngine = gradingEngine;
            _aiService = aiService;
            _imageService = imageService;
        }

        [RelayCommand]
        private async Task LoadAssignments()
        {
            try
            {
                StatusMessage = "正在加载作业列表...";
                var repository = new AssignmentRepository(null!);
                var assignments = await repository.GetAllAsync();
                Assignments = new ObservableCollection<Assignment>(assignments);
                StatusMessage = $"已加载 {assignments.Count()} 个作业";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载失败: {ex.Message}";
            }
        }

        [RelayCommand]
        private async Task LoadStudents()
        {
            try
            {
                StatusMessage = "正在加载学生列表...";
                var repository = new StudentRepository(null!);
                var students = await repository.GetAllAsync();
                Students = new ObservableCollection<Student>(students);
                StatusMessage = $"已加载 {students.Count()} 名学生";
            }
            catch (Exception ex)
            {
                StatusMessage = $"加载失败: {ex.Message}";
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
                StatusMessage = "正在批阅作业...";
                
                var gradingRecords = new System.Collections.Generic.List<GradingRecord>();
                
                foreach (var question in SelectedAssignment.Questions)
                {
                    var record = _gradingEngine.GradeQuestion(
                        question, 
                        question.Answer, 
                        "student_answer_placeholder");
                    gradingRecords.Add(record);
                }

                GradingResult = _gradingEngine.GradeAssignment(SelectedAssignment, gradingRecords);
                StatusMessage = "批阅完成";
            }
            catch (Exception ex)
            {
                StatusMessage = $"批阅失败: {ex.Message}";
            }
        }

        [RelayCommand]
        private async Task GradeWithAI()
        {
            if (SelectedAssignment == null)
            {
                StatusMessage = "请选择作业";
                return;
            }

            try
            {
                StatusMessage = "正在使用AI批阅...";
                
                var isAvailable = await _aiService.IsAvailableAsync();
                if (!isAvailable)
                {
                    StatusMessage = "AI服务不可用，将使用规则批阅";
                    await GradeAssignmentCommand.ExecuteAsync(null);
                    return;
                }

                var gradingRecords = new System.Collections.Generic.List<GradingRecord>();
                
                foreach (var question in SelectedAssignment.Questions)
                {
                    if (question.Type == "ShortAnswer" || question.Type == "Essay")
                    {
                        var record = await _aiService.GradeSubjectiveAsync(
                            question, 
                            "学生答案内容");
                        gradingRecords.Add(record);
                    }
                    else
                    {
                        var record = _gradingEngine.GradeQuestion(
                            question,
                            question.Answer,
                            "student_answer");
                        gradingRecords.Add(record);
                    }
                }

                GradingResult = _gradingEngine.GradeAssignment(SelectedAssignment, gradingRecords);
                StatusMessage = "AI批阅完成";
            }
            catch (Exception ex)
            {
                StatusMessage = $"AI批阅失败: {ex.Message}";
            }
        }

        [RelayCommand]
        private async Task ProcessImage(byte[] imageData)
        {
            try
            {
                StatusMessage = "正在处理图片...";
                var processed = await _imageService.ProcessImageAsync(imageData);
                var info = _imageService.GetImageInfo(imageData);
                StatusMessage = $"图片处理完成: {info.Width}x{info.Height}";
            }
            catch (Exception ex)
            {
                StatusMessage = $"图片处理失败: {ex.Message}";
            }
        }
    }
}
