using System.Windows;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Services;
using SmartGrader.AI.Services;
using SmartGrader.Image.Services;
using SmartGrader.Data;
using SmartGrader.Data.Database;
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
            var viewModel = new MainViewModel();
            return viewModel;
        }
    }
}
