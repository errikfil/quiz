namespace Quiz.Api.Models;

public sealed class Quiz
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = "";
    // Αποθηκεύουμε το hash του κλειδιού, όχι το ίδιο το μυστικό του δημιουργού.
    public string OwnerKeyHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Question> Questions { get; set; } = [];
}

public sealed class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuizId { get; set; }
    public int Position { get; set; }
    public string Text { get; set; } = "";
    public string OptionA { get; set; } = "";
    public string OptionB { get; set; } = "";
    public string OptionC { get; set; } = "";
    public string OptionD { get; set; } = "";
    public int CorrectIndex { get; set; }
    public int Seconds { get; set; } = 20;
    public string[] Options => [OptionA, OptionB, OptionC, OptionD];
}

public record QuestionInput(string Text, string[] Options, int CorrectIndex, int Seconds);
public record QuizInput(string Title, List<QuestionInput> Questions);

public static class QuizValidation
{
    public static string? Error(QuizInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Length > 100)
            return "Ο τίτλος πρέπει να έχει 1–100 χαρακτήρες.";
        if (input.Questions is null || input.Questions.Count is < 1 or > 30)
            return "Πρόσθεσε από 1 έως 30 ερωτήσεις.";
        foreach (var q in input.Questions)
        {
            if (q is null || string.IsNullOrWhiteSpace(q.Text) || q.Text.Length > 300)
                return "Κάθε ερώτηση χρειάζεται κείμενο έως 300 χαρακτήρες.";
            if (q.Options is null || q.Options.Length != 4 || q.Options.Any(o => string.IsNullOrWhiteSpace(o) || o.Length > 160))
                return "Κάθε ερώτηση χρειάζεται τέσσερις απαντήσεις έως 160 χαρακτήρες.";
            if (q.CorrectIndex is < 0 or > 3 || q.Seconds is < 10 or > 120)
                return "Διάλεξε σωστή απάντηση και χρόνο 10–120 δευτερολέπτων.";
        }
        return null;
    }

    public static List<Question> ToQuestions(QuizInput input) => input.Questions.Select((q, i) => new Question
    {
        Position = i,
        Text = q.Text.Trim(),
        OptionA = q.Options[0].Trim(),
        OptionB = q.Options[1].Trim(),
        OptionC = q.Options[2].Trim(),
        OptionD = q.Options[3].Trim(),
        CorrectIndex = q.CorrectIndex,
        Seconds = q.Seconds
    }).ToList();
}
