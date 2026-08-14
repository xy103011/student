using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace SmartGrader.Core.Models
{
    public class ObservableObject : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
        {
            if (EqualityComparer<T>.Default.Equals(field, value))
                return false;

            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }
    }

    public class Question : ObservableObject
    {
        private int _id;
        private string _title = string.Empty;
        private string _type = string.Empty;
        private string _content = string.Empty;
        private string _answer = string.Empty;
        private int _score;
        private string? _explanation;

        public int Id 
        { 
            get => _id; 
            set => SetProperty(ref _id, value); 
        }
        
        public string Title 
        { 
            get => _title; 
            set => SetProperty(ref _title, value); 
        }
        
        public string Type 
        { 
            get => _type; 
            set => SetProperty(ref _type, value); 
        }
        
        public string Content 
        { 
            get => _content; 
            set => SetProperty(ref _content, value); 
        }
        
        public List<Option> Options { get; set; } = new();
        
        public string Answer 
        { 
            get => _answer; 
            set => SetProperty(ref _answer, value); 
        }
        
        public int Score 
        { 
            get => _score; 
            set => SetProperty(ref _score, value); 
        }
        
        public string? Explanation 
        { 
            get => _explanation; 
            set => SetProperty(ref _explanation, value); 
        }
    }

    public class Option : ObservableObject
    {
        private string _label = string.Empty;
        private string _content = string.Empty;

        public string Label 
        { 
            get => _label; 
            set => SetProperty(ref _label, value); 
        }
        
        public string Content 
        { 
            get => _content; 
            set => SetProperty(ref _content, value); 
        }
    }

    public class Assignment : ObservableObject
    {
        private int _id;
        private string _name = string.Empty;
        private string _description = string.Empty;
        private int _teacherId;
        private DateTime _createdAt;
        private DateTime? _deadline;
        private bool _isActive = true;

        public int Id 
        { 
            get => _id; 
            set => SetProperty(ref _id, value); 
        }
        
        public string Name 
        { 
            get => _name; 
            set => SetProperty(ref _name, value); 
        }
        
        public string Description 
        { 
            get => _description; 
            set => SetProperty(ref _description, value); 
        }
        
        public int TeacherId 
        { 
            get => _teacherId; 
            set => SetProperty(ref _teacherId, value); 
        }
        
        public List<Question> Questions { get; set; } = new();
        
        public DateTime CreatedAt 
        { 
            get => _createdAt; 
            set => SetProperty(ref _createdAt, value); 
        }
        
        public DateTime? Deadline 
        { 
            get => _deadline; 
            set => SetProperty(ref _deadline, value); 
        }
        
        public bool IsActive 
        { 
            get => _isActive; 
            set => SetProperty(ref _isActive, value); 
        }
    }

    public class Student : ObservableObject
    {
        private int _id;
        private string _name = string.Empty;
        private string _studentId = string.Empty;
        private int _classId;

        public int Id 
        { 
            get => _id; 
            set => SetProperty(ref _id, value); 
        }
        
        public string Name 
        { 
            get => _name; 
            set => SetProperty(ref _name, value); 
        }
        
        public string StudentId 
        { 
            get => _studentId; 
            set => SetProperty(ref _studentId, value); 
        }
        
        public int ClassId 
        { 
            get => _classId; 
            set => SetProperty(ref _classId, value); 
        }
    }

    public class Class : ObservableObject
    {
        private int _id;
        private string _name = string.Empty;
        private int _teacherId;

        public int Id 
        { 
            get => _id; 
            set => SetProperty(ref _id, value); 
        }
        
        public string Name 
        { 
            get => _name; 
            set => SetProperty(ref _name, value); 
        }
        
        public int TeacherId 
        { 
            get => _teacherId; 
            set => SetProperty(ref _teacherId, value); 
        }
        
        public List<Student> Students { get; set; } = new();
    }

    public class GradingRecord : ObservableObject
    {
        private int _id;
        private int _assignmentId;
        private int _studentId;
        private string _answer = string.Empty;
        private bool _isCorrect;
        private int _score;
        private int _fullScore;
        private string? _feedback;
        private string? _gradingMethod;
        private DateTime _gradedAt;

        public int Id 
        { 
            get => _id; 
            set => SetProperty(ref _id, value); 
        }
        
        public int AssignmentId 
        { 
            get => _assignmentId; 
            set => SetProperty(ref _assignmentId, value); 
        }
        
        public int StudentId 
        { 
            get => _studentId; 
            set => SetProperty(ref _studentId, value); 
        }
        
        public string Answer 
        { 
            get => _answer; 
            set => SetProperty(ref _answer, value); 
        }
        
        public bool IsCorrect 
        { 
            get => _isCorrect; 
            set => SetProperty(ref _isCorrect, value); 
        }
        
        public int Score 
        { 
            get => _score; 
            set => SetProperty(ref _score, value); 
        }
        
        public int FullScore 
        { 
            get => _fullScore; 
            set => SetProperty(ref _fullScore, value); 
        }
        
        public string? Feedback 
        { 
            get => _feedback; 
            set => SetProperty(ref _feedback, value); 
        }
        
        public string? GradingMethod 
        { 
            get => _gradingMethod; 
            set => SetProperty(ref _gradingMethod, value); 
        }
        
        public DateTime GradedAt 
        { 
            get => _gradedAt; 
            set => SetProperty(ref _gradedAt, value); 
        }
    }

    public class GradingResult : ObservableObject
    {
        private int _totalQuestions;
        private int _correctCount;
        private int _wrongCount;
        private double _accuracyRate;
        private int _totalScore;
        private int _fullTotalScore;
        private double _scoreRate;

        public int TotalQuestions 
        { 
            get => _totalQuestions; 
            set => SetProperty(ref _totalQuestions, value); 
        }
        
        public int CorrectCount 
        { 
            get => _correctCount; 
            set => SetProperty(ref _correctCount, value); 
        }
        
        public int WrongCount 
        { 
            get => _wrongCount; 
            set => SetProperty(ref _wrongCount, value); 
        }
        
        public double AccuracyRate 
        { 
            get => _accuracyRate; 
            set => SetProperty(ref _accuracyRate, value); 
        }
        
        public int TotalScore 
        { 
            get => _totalScore; 
            set => SetProperty(ref _totalScore, value); 
        }
        
        public int FullTotalScore 
        { 
            get => _fullTotalScore; 
            set => SetProperty(ref _fullTotalScore, value); 
        }
        
        public double ScoreRate 
        { 
            get => _scoreRate; 
            set => SetProperty(ref _scoreRate, value); 
        }
        
        public List<GradingRecord> Records { get; set; } = new();
    }
}
