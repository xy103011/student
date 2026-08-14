using System;
using System.Windows;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Services;
using SmartGrader.AI.Services;
using SmartGrader.Image.Services;
using SmartGrader.Data;
using SmartGrader.Data.Database;
using SmartGrader.Data.Repositories;
using SmartGrader.Desktop.ViewModels;

namespace SmartGrader.Desktop
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = CreateViewModel();
        }

        private MainViewModel CreateViewModel()
        {
            var context = new AppDbContext();
            var dbService = new DatabaseService(context);
            dbService.InitializeDatabase();

            var gradingEngine = new GradingEngine();
            var aiService = new AIService(null!);
            var imageService = new ImageProcessingService();

            return new MainViewModel(gradingEngine, aiService, imageService);
        }
    }
}
