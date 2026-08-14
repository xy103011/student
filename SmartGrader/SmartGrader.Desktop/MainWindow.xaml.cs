using System;
using System.Windows;
using SmartGrader.Desktop.ViewModels;

namespace SmartGrader.Desktop
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = new MainViewModel();
        }
    }
}
