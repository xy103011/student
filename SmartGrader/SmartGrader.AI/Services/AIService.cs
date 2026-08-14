using System;
using System.Threading.Tasks;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Configuration;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.AI.Services
{
    public class AIService : IAIgradingService
    {
        private readonly OpenAIClient _client;
        private readonly string _model;
        private bool _isAvailable = true;

        public AIService(IConfiguration configuration)
        {
            var apiKey = configuration["AI:ApiKey"];
            var baseUri = configuration["AI:BaseUri"];
            _model = configuration["AI:Model"] ?? "gpt-4";

            if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(baseUri))
            {
                _client = new OpenAIClient(new Uri(baseUri), new Azure.AzureKeyCredential(apiKey));
            }
        }

        public async Task<bool> IsAvailableAsync()
        {
            try
            {
                if (_client == null) return false;
                _isAvailable = true;
                return true;
            }
            catch
            {
                _isAvailable = false;
                return false;
            }
        }

        public async Task<GradingRecord> GradeSubjectiveAsync(Question question, string studentAnswer)
        {
            var record = new GradingRecord
            {
                QuestionId = question.Id,
                StudentAnswer = studentAnswer,
                GradedAt = DateTime.Now,
                GradingMethod = "AI"
            };

            if (_client == null)
            {
                record.IsCorrect = false;
                record.Score = 0;
                record.Feedback = "AI服务未配置，请联系管理员";
                return record;
            }

            try
            {
                var prompt = BuildGradingPrompt(question, studentAnswer);
                var response = await CallAIAsync(prompt);
                
                record = ParseAIResponse(question, response);
            }
            catch (Exception ex)
            {
                record.IsCorrect = false;
                record.Score = 0;
                record.Feedback = $"AI批阅失败: {ex.Message}";
            }

            return record;
        }

        private string BuildGradingPrompt(Question question, string studentAnswer)
        {
            return $@"你是专业的教师，请批改以下作业。

题目: {question.Content}
题目类型: {question.Type}
参考答案: {question.Answer}
学生答案: {studentAnswer}
满分: {question.Score}分

请给出：
1. 是否正确 (true/false)
2. 得分 (0到{question.Score}之间的整数)
3. 简要评语 (最多50字)

格式: [correct/false] [score] [feedback]";
        }

        private async Task<string> CallAIAsync(string prompt)
        {
            var response = await _client.GetChatCompletionsAsync(_model, new[]
            {
                new ChatMessage(ChatRole.System, "你是一个专业的教师助手"),
                new ChatMessage(ChatRole.User, prompt)
            });

            return response.Choices[0].Message.Content;
        }

        private GradingRecord ParseAIResponse(Question question, string response)
        {
            var record = new GradingRecord
            {
                QuestionId = question.Id,
                StudentAnswer = question.Answer,
                GradedAt = DateTime.Now,
                GradingMethod = "AI"
            };

            var lines = response.Split('\n');
            foreach (var line in lines)
            {
                if (line.Contains("true"))
                {
                    record.IsCorrect = true;
                }
                else if (line.Contains("false"))
                {
                    record.IsCorrect = false;
                }

                var scoreMatch = System.Text.RegularExpressions.Regex.Match(line, @"\d+");
                if (scoreMatch.Success && int.TryParse(scoreMatch.Value, out var score))
                {
                    record.Score = Math.Min(score, question.Score);
                }

                if (line.Contains("评语") || line.Contains("feedback"))
                {
                    record.Feedback = line.Replace("评语:", "").Replace("feedback:", "").Trim();
                }
            }

            return record;
        }
    }
}
