using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using SmartGrader.Core.Interfaces;
using SmartGrader.Core.Models;

namespace SmartGrader.AI.Services
{
    public class AIService : IAIgradingService
    {
        private readonly string? _apiKey;
        private readonly string? _baseUri;
        private readonly string _model;
        private bool _isAvailable = false;
        private readonly HttpClient _httpClient;

        public AIService(string? apiKey, string? baseUri, string? model = null)
        {
            _apiKey = apiKey;
            _baseUri = baseUri;
            _model = model ?? "gpt-4";
            _httpClient = new HttpClient();
            
            if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(baseUri))
            {
                _isAvailable = true;
            }
        }

        public async Task<bool> IsAvailableAsync()
        {
            return _isAvailable && !string.IsNullOrEmpty(_apiKey);
        }

        public async Task<GradingRecord> GradeSubjectiveAsync(Question question, string studentAnswer)
        {
            var record = new GradingRecord
            {
                AssignmentId = 0,
                StudentId = 0,
                Answer = studentAnswer,
                FullScore = question.Score,
                GradedAt = DateTime.Now,
                GradingMethod = "AI"
            };

            if (_httpClient == null || string.IsNullOrEmpty(_apiKey))
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
            return $"你是专业的教师，请批改以下作业。\n\n题目: {question.Content}\n题目类型: {question.Type}\n参考答案: {question.Answer}\n学生答案: {studentAnswer}\n满分: {question.Score}分\n\n请给出：\n1. 是否正确 (正确/错误)\n2. 得分 (0到{question.Score}之间的整数)\n3. 简要评语 (最多50字)\n\n格式: [正确/错误] [分数] [评语]";
        }

        private async Task<string> CallAIAsync(string prompt)
        {
            var url = $"{_baseUri}/openai/deployments/{_model}/chat/completions?api-version=2024-02-01";
            
            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = "你是一个专业的教师助手" },
                    new { role = "user", content = prompt }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey!);

            var response = await _httpClient.PostAsync(url, content);
            var responseJson = await response.Content.ReadAsStringAsync();
            
            using var doc = JsonDocument.Parse(responseJson);
            return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
        }

        private GradingRecord ParseAIResponse(Question question, string response)
        {
            var record = new GradingRecord
            {
                AssignmentId = 0,
                StudentId = 0,
                Answer = question.Answer,
                FullScore = question.Score,
                GradedAt = DateTime.Now,
                GradingMethod = "AI"
            };

            var lines = response.Split('\n');
            foreach (var line in lines)
            {
                if (line.Contains("正确") || line.Contains("true"))
                {
                    record.IsCorrect = true;
                }
                else if (line.Contains("错误") || line.Contains("false"))
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
