# 接口定义

## 核心接口

### IGradingEngine
```csharp
public interface IGradingEngine
{
    GradingResult GradeAssignment(Assignment assignment, List<GradingRecord> records);
    GradingRecord GradeQuestion(Question question, string answer, string studentAnswer);
}
```

### IAIgradingService
```csharp
public interface IAIgradingService
{
    Task<GradingRecord> GradeSubjectiveAsync(Question question, string studentAnswer);
    Task<bool> IsAvailableAsync();
}
```

### IImageProcessingService
```csharp
public interface IImageProcessingService
{
    Task<byte[]> ProcessImageAsync(byte[] imageData);
    Task<string> ExtractTextAsync(byte[] imageData);
    ImageInfo GetImageInfo(byte[] imageData);
}
```

### IRepository<T>
```csharp
public interface IRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync();
    Task<T?> GetByIdAsync(int id);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}
```

## 数据模型

### Question
- Id: int
- Title: string
- Type: string (Choice/TrueFalse/FillBlank/ShortAnswer/Essay)
- Content: string
- Options: List<Option>
- Answer: string
- Score: int
- Explanation: string?

### Assignment
- Id: int
- Name: string
- Description: string
- TeacherId: int
- Questions: List<Question>
- CreatedAt: DateTime
- Deadline: DateTime?
- IsActive: bool

### Student
- Id: int
- Name: string
- StudentId: string
- ClassId: int

### GradingRecord
- Id: int
- AssignmentId: int
- StudentId: int
- Answer: string
- IsCorrect: bool
- Score: int
- FullScore: int
- Feedback: string?
- GradingMethod: string
- GradedAt: DateTime
