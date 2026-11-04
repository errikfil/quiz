using Microsoft.EntityFrameworkCore;
using Quiz.Api.Models;

namespace Quiz.Api.Data;

public sealed class QuizDbContext(DbContextOptions<QuizDbContext> options) : DbContext(options)
{
    public DbSet<Models.Quiz> Quizzes => Set<Models.Quiz>();
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Models.Quiz>().Property(q => q.Title).HasMaxLength(100);
        model.Entity<Models.Quiz>().HasMany(q => q.Questions).WithOne().HasForeignKey(q => q.QuizId).OnDelete(DeleteBehavior.Cascade);
        model.Entity<Question>().Ignore(q => q.Options);
        model.Entity<Question>().Property(q => q.Text).HasMaxLength(300);
    }
}
