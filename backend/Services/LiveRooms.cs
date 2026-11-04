using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.AspNetCore.SignalR;
using Quiz.Api.Hubs;
using Quiz.Api.Models;

namespace Quiz.Api.Services;

public sealed class Player
{
    public string Id { get; } = Guid.NewGuid().ToString("N");
    public string Token { get; } = Keys.New();
    public required string Name { get; init; }
    public string? ConnectionId { get; set; }
    public int Score { get; set; }
    public int? Answer { get; set; }
    public int LastPoints { get; set; }
}

public sealed class Room
{
    public required string Pin { get; init; }
    public required string HostToken { get; init; }
    public required Models.Quiz Quiz { get; init; }
    // Κάθε δωμάτιο έχει δικό του lock: δύο ταυτόχρονες απαντήσεις δεν αλλάζουν μαζί το σκορ.
    public SemaphoreSlim Gate { get; } = new(1, 1);
    public Dictionary<string, Player> Players { get; } = [];
    public string Phase { get; set; } = "lobby";
    public int QuestionIndex { get; set; } = -1;
    public DateTimeOffset? Deadline { get; set; }
    public DateTimeOffset LastActivity { get; set; } = DateTimeOffset.UtcNow;
    public long Revision { get; set; }
}

public record Binding(string Pin, string Role, string? PlayerId = null);

// Τα quiz αποθηκεύονται στη MySQL. Τα live δωμάτια είναι προσωρινά και ανήκουν σε έναν server.
// Σε πολλά instances θα χρειαστούν shared room storage και SignalR backplane.
public sealed class LiveRooms(IHubContext<QuizHub> hub)
{
    private readonly ConcurrentDictionary<string, Room> rooms = new();
    private readonly object creationLock = new();

    public object Create(Models.Quiz quiz)
    {
        lock (creationLock)
        {
            if (rooms.Count >= 200) throw new InvalidOperationException("Ο server είναι πλήρης. Δοκίμασε αργότερα.");
            string pin;
            do { pin = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(); } while (rooms.ContainsKey(pin));
            var room = new Room { Pin = pin, HostToken = Keys.New(), Quiz = quiz };
            rooms[pin] = room;
            return new { pin, hostToken = room.HostToken };
        }
    }

    private Room Find(string pin) => rooms.TryGetValue(pin, out var room)
        ? room : throw new HubException("Το δωμάτιο δεν βρέθηκε ή έχει λήξει.");

    // Το snapshot δεν περιέχει κλειδιά ή τη σωστή απάντηση όσο τρέχει η ερώτηση.
    private static object Snapshot(Room room)
    {
        var q = room.QuestionIndex >= 0 ? room.Quiz.Questions[room.QuestionIndex] : null;
        var revealed = room.Phase is "results" or "finished";
        return new
        {
            room.Pin,
            title = room.Quiz.Title,
            room.Phase,
            room.Revision,
            questionNumber = room.QuestionIndex + 1,
            totalQuestions = room.Quiz.Questions.Count,
            serverTime = DateTimeOffset.UtcNow,
            deadline = room.Deadline,
            question = q is null ? null : new { q.Text, options = q.Options, q.Seconds, correctIndex = revealed ? (int?)q.CorrectIndex : null },
            answerCount = room.Players.Values.Count(p => p.Answer.HasValue),
            distribution = revealed ? Enumerable.Range(0, 4).Select(i => room.Players.Values.Count(p => p.Answer == i)).ToArray() : null,
            players = room.Players.Values.OrderByDescending(p => VisibleScore(room, p)).ThenBy(p => p.Name).Select((p, i) => new
            {
                p.Id,
                p.Name,
                score = VisibleScore(room, p),
                rank = i + 1,
                connected = p.ConnectionId is not null,
                hasAnswered = p.Answer.HasValue,
                lastPoints = revealed ? p.LastPoints : 0
            }).ToArray()
        };
    }

    private static int VisibleScore(Room room, Player player) =>
        room.Phase == "question" ? player.Score - player.LastPoints : player.Score;

    private async Task Publish(Room room)
    {
        room.Revision++;
        await hub.Clients.Group(room.Pin).SendAsync("RoomUpdated", Snapshot(room));
    }

    public async Task<object> JoinHost(string pin, string token, string connectionId)
    {
        var room = Find(pin);
        await room.Gate.WaitAsync();
        try
        {
            if (!Keys.Matches(token, Keys.Hash(room.HostToken))) throw new HubException("Το κλειδί διαχείρισης δεν είναι έγκυρο.");
            await hub.Groups.AddToGroupAsync(connectionId, pin);
            return new { state = Snapshot(room), playerId = (string?)null, playerToken = (string?)null, answer = (int?)null };
        }
        finally { room.Gate.Release(); }
    }

    public async Task<(object Response, string PlayerId)> JoinPlayer(string pin, string name, string? token, string connectionId)
    {
        var room = Find(pin);
        await room.Gate.WaitAsync();
        try
        {
            var player = token is null ? null : room.Players.Values.FirstOrDefault(p => p.Token == token);
            if (player is null)
            {
                if (room.Phase != "lobby") throw new HubException("Το παιχνίδι έχει ξεκινήσει. Μπορείς να μπεις στον επόμενο γύρο.");
                name = name.Trim();
                if (name.Length is < 1 or > 24 || name.Any(char.IsControl)) throw new HubException("Διάλεξε όνομα 1–24 χαρακτήρων.");
                if (room.Players.Count >= 100) throw new HubException("Το δωμάτιο έχει συμπληρώσει 100 παίκτες.");
                if (room.Players.Values.Any(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)))
                    throw new HubException("Αυτό το όνομα χρησιμοποιείται ήδη.");
                player = new Player { Name = name };
                room.Players[player.Id] = player;
            }
            // Η νεότερη σύνδεση αντικαθιστά την προηγούμενη καρτέλα του ίδιου παίκτη.
            if (player.ConnectionId is { } previous && previous != connectionId)
                await hub.Groups.RemoveFromGroupAsync(previous, pin);
            player.ConnectionId = connectionId;
            room.LastActivity = DateTimeOffset.UtcNow;
            await hub.Groups.AddToGroupAsync(connectionId, pin);
            await Publish(room);
            return (new { state = Snapshot(room), playerId = player.Id, playerToken = player.Token, answer = player.Answer }, player.Id);
        }
        finally { room.Gate.Release(); }
    }

    public async Task HostAction(string pin, string action)
    {
        var room = Find(pin);
        await room.Gate.WaitAsync();
        try
        {
            if (action == "start" && room.Phase == "lobby")
            {
                if (!room.Players.Values.Any(p => p.ConnectionId is not null)) throw new HubException("Περίμενε να συνδεθεί τουλάχιστον ένας παίκτης.");
                OpenQuestion(room);
            }
            else if (action == "next" && room.Phase == "results")
            {
                if (room.QuestionIndex + 1 == room.Quiz.Questions.Count) room.Phase = "finished";
                else OpenQuestion(room);
            }
            else if (action == "reveal" && room.Phase == "question")
            {
                room.Phase = "results";
                room.Deadline = null;
            }
            else if (action == "end" && room.Phase != "finished")
            {
                room.Phase = "finished";
                room.Deadline = null;
            }
            else throw new HubException("Αυτή η ενέργεια δεν είναι διαθέσιμη τώρα.");
            room.LastActivity = DateTimeOffset.UtcNow;
            await Publish(room);
        }
        finally { room.Gate.Release(); }
    }

    private static void OpenQuestion(Room room)
    {
        room.QuestionIndex++;
        room.Phase = "question";
        foreach (var player in room.Players.Values) { player.Answer = null; player.LastPoints = 0; }
        room.Deadline = DateTimeOffset.UtcNow.AddSeconds(room.Quiz.Questions[room.QuestionIndex].Seconds);
    }

    public async Task Answer(Binding binding, string connectionId, int questionNumber, int option)
    {
        var room = Find(binding.Pin);
        await room.Gate.WaitAsync();
        try
        {
            if (binding.PlayerId is null || !room.Players.TryGetValue(binding.PlayerId, out var player) || player.ConnectionId != connectionId)
                throw new HubException("Συνδέσου ξανά στο παιχνίδι.");
            var now = DateTimeOffset.UtcNow;
            if (room.Phase != "question" || now >= room.Deadline || questionNumber != room.QuestionIndex + 1)
                throw new HubException("Η ερώτηση έχει κλείσει.");
            if (option is < 0 or > 3) throw new HubException("Μη έγκυρη απάντηση.");
            if (player.Answer.HasValue) throw new HubException("Η απάντησή σου έχει ήδη καταχωρηθεί.");
            var question = room.Quiz.Questions[room.QuestionIndex];
            player.Answer = option;
            // Σωστή απάντηση: 500 βασικοί πόντοι + έως 500 για ταχύτητα. Ο χρόνος του browser δεν είναι έμπιστος.
            if (option == question.CorrectIndex)
            {
                var remaining = Math.Clamp((room.Deadline!.Value - now).TotalSeconds / question.Seconds, 0, 1);
                player.LastPoints = 500 + (int)Math.Round(500 * remaining);
                player.Score += player.LastPoints;
            }
            // Το σκορ δεν αποκαλύπτεται πριν κλείσει η ερώτηση (ούτε μέσω των live ενημερώσεων).
            if (room.Players.Values.All(p => p.Answer.HasValue)) { room.Phase = "results"; room.Deadline = null; }
            room.LastActivity = now;
            await Publish(room);
        }
        finally { room.Gate.Release(); }
    }

    public async Task Disconnect(Binding binding, string connectionId)
    {
        if (!rooms.TryGetValue(binding.Pin, out var room) || binding.PlayerId is null) return;
        await room.Gate.WaitAsync();
        try
        {
            if (room.Players.TryGetValue(binding.PlayerId, out var p) && p.ConnectionId == connectionId)
            {
                p.ConnectionId = null;
                await Publish(room);
            }
        }
        finally { room.Gate.Release(); }
    }

    public async Task Tick(CancellationToken cancellationToken)
    {
        foreach (var room in rooms.Values)
        {
            await room.Gate.WaitAsync(cancellationToken);
            try
            {
                if (room.Phase == "question" && DateTimeOffset.UtcNow >= room.Deadline)
                {
                    room.Phase = "results";
                    room.Deadline = null;
                    room.LastActivity = DateTimeOffset.UtcNow;
                    await Publish(room);
                }
                if (DateTimeOffset.UtcNow - room.LastActivity > TimeSpan.FromHours(4))
                {
                    await hub.Clients.Group(room.Pin).SendAsync("RoomExpired", cancellationToken);
                    rooms.TryRemove(room.Pin, out _);
                }
            }
            finally { room.Gate.Release(); }
        }
    }
}

public sealed class RoomClock(LiveRooms rooms, ILogger<RoomClock> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(200));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await rooms.Tick(stoppingToken); }
                catch (Exception e) when (e is not OperationCanceledException) { logger.LogError(e, "Room clock failed"); }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
