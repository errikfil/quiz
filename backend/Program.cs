using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Quiz.Api.Data;
using Quiz.Api.Hubs;
using Quiz.Api.Models;
using Quiz.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var demo = builder.Configuration.GetValue<bool>("Storage:UseInMemory");
builder.Services.AddDbContext<QuizDbContext>(options =>
{
    if (demo) options.UseInMemoryDatabase("sima-demo");
    else
    {
        var connection = builder.Configuration.GetConnectionString("Quiz");
        if (string.IsNullOrWhiteSpace(connection))
            throw new InvalidOperationException("Set ConnectionStrings__Quiz for MySQL, or Storage__UseInMemory=true for a temporary demo.");
        options.UseMySql(connection, new MySqlServerVersion(new Version(8, 0, 36)), mysql => mysql.EnableRetryOnFailure());
    }
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddSignalR(options => { options.MaximumReceiveMessageSize = 16 * 1024; });
builder.Services.AddSingleton<LiveRooms>();
builder.Services.AddHostedService<RoomClock>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "local",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    context.Response.StatusCode = 500;
    await context.Response.WriteAsJsonAsync(new { message = "Προέκυψε σφάλμα στον server. Δοκίμασε ξανά." });
}));
app.UseCors();
app.UseRateLimiter();

using (var scope = app.Services.CreateScope())
{
    // Για το αρχικό σχήμα. Όταν εξελιχθεί το μοντέλο, αντικατάστησέ το με EF migrations.
    var db = scope.ServiceProvider.GetRequiredService<QuizDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", storage = demo ? "temporary-memory" : "mysql" }));
app.MapPost("/api/quizzes", async (QuizInput input, QuizDbContext db) =>
{
    if (QuizValidation.Error(input) is { } error) return Results.BadRequest(new { message = error });
    var key = Keys.New();
    var quiz = new Quiz.Api.Models.Quiz { Title = input.Title.Trim(), OwnerKeyHash = Keys.Hash(key), Questions = QuizValidation.ToQuestions(input) };
    db.Quizzes.Add(quiz);
    await db.SaveChangesAsync();
    return Results.Created($"/api/quizzes/{quiz.Id}", new { quiz.Id, quiz.Title, ownerKey = key, questionCount = quiz.Questions.Count });
});
app.MapGet("/api/quizzes/{id:guid}", async (Guid id, HttpRequest request, QuizDbContext db) =>
{
    var quiz = await db.Quizzes.Include(q => q.Questions).AsNoTracking().FirstOrDefaultAsync(q => q.Id == id);
    if (quiz is null) return Results.NotFound(new { message = "Το quiz δεν βρέθηκε." });
    if (!Keys.Matches(request.Headers["X-Quiz-Key"].FirstOrDefault(), quiz.OwnerKeyHash)) return Results.Unauthorized();
    return Results.Ok(new { quiz.Id, quiz.Title, questions = quiz.Questions.OrderBy(q => q.Position).Select(q => new QuestionInput(q.Text, q.Options, q.CorrectIndex, q.Seconds)) });
});
app.MapPut("/api/quizzes/{id:guid}", async (Guid id, QuizInput input, HttpRequest request, QuizDbContext db) =>
{
    if (QuizValidation.Error(input) is { } error) return Results.BadRequest(new { message = error });
    var quiz = await db.Quizzes.Include(q => q.Questions).FirstOrDefaultAsync(q => q.Id == id);
    if (quiz is null) return Results.NotFound();
    if (!Keys.Matches(request.Headers["X-Quiz-Key"].FirstOrDefault(), quiz.OwnerKeyHash)) return Results.Unauthorized();
    // Τα ενεργά δωμάτια κρατούν δικό τους snapshot και δεν επηρεάζονται από την επεξεργασία.
    db.RemoveRange(quiz.Questions);
    quiz.Title = input.Title.Trim();
    quiz.Questions = QuizValidation.ToQuestions(input);
    // Τα νέα Guid δεν σημαίνουν ότι οι ερωτήσεις υπάρχουν ήδη στη βάση.
    db.AddRange(quiz.Questions);
    await db.SaveChangesAsync();
    return Results.Ok(new { quiz.Id, quiz.Title, questionCount = quiz.Questions.Count });
});
app.MapPost("/api/quizzes/{id:guid}/sessions", async (Guid id, HttpRequest request, QuizDbContext db, LiveRooms rooms) =>
{
    var quiz = await db.Quizzes.Include(q => q.Questions).AsNoTracking().FirstOrDefaultAsync(q => q.Id == id);
    if (quiz is null) return Results.NotFound();
    if (!Keys.Matches(request.Headers["X-Quiz-Key"].FirstOrDefault(), quiz.OwnerKeyHash)) return Results.Unauthorized();
    quiz.Questions = quiz.Questions.OrderBy(q => q.Position).ToList();
    try { return Results.Ok(rooms.Create(quiz)); }
    catch (InvalidOperationException e) { return Results.Json(new { message = e.Message }, statusCode: 503); }
});
app.MapHub<QuizHub>("/hubs/quiz");
app.Run();
