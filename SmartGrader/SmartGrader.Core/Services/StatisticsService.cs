using System;
using System;
using System.Collections.Generic;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.Core.Services
{
    public class StatisticsService : IStatisticsService
    {
        public ClassStatistics GetClassStatistics(int classId, int assignmentId)
        {
            return new ClassStatistics
            {
                ClassId = classId,
                ClassName = $"班级{classId}"
            };
        }

        public QuestionStatistics GetQuestionStatistics(int assignmentId)
        {
            return new QuestionStatistics
            {
                QuestionId = 0,
                QuestionContent = "题目内容"
            };
        }

        public List<GradeHistory> GetGradeHistory(int studentId)
        {
            return new List<GradeHistory>();
        }

        public List<GradeHistory> GetGradeHistoryByAssignment(int assignmentId)
        {
            return new List<GradeHistory>();
        }
    }
}
