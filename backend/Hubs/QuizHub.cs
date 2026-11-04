using Microsoft.AspNetCore.SignalR;
using Quiz.Api.Services;
namespace Quiz.Api.Hubs;

public sealed class QuizHub(LiveRooms rooms) : Hub
{
    private Binding Current => Context.Items.TryGetValue("binding", out var value) && value is Binding binding
        ? binding : throw new HubException("Πρέπει πρώτα να συνδεθείς σε δωμάτιο.");

    private void EnsureNotJoined()
    {
        if (Context.Items.ContainsKey("binding")) throw new HubException("Η σύνδεση ανήκει ήδη σε δωμάτιο.");
    }

    public async Task<object> JoinHost(string pin, string token)
    {
        EnsureNotJoined();
        var response = await rooms.JoinHost(pin, token, Context.ConnectionId);
        Context.Items["binding"] = new Binding(pin, "host");
        return response;
    }

    public async Task<object> JoinPlayer(string pin, string name, string? token)
    {
        EnsureNotJoined();
        var result = await rooms.JoinPlayer(pin, name, token, Context.ConnectionId);
        Context.Items["binding"] = new Binding(pin, "player", result.PlayerId);
        return result.Response;
    }

    public Task HostAction(string action)
    {
        var binding = Current;
        if (binding.Role != "host") throw new HubException("Μόνο ο καθηγητής ελέγχει το παιχνίδι.");
        return rooms.HostAction(binding.Pin, action);
    }

    public Task Answer(int questionNumber, int option)
    {
        var binding = Current;
        if (binding.Role != "player") throw new HubException("Ο καθηγητής δεν μπορεί να απαντήσει.");
        return rooms.Answer(binding, Context.ConnectionId, questionNumber, option);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.Items.TryGetValue("binding", out var value) && value is Binding binding)
            await rooms.Disconnect(binding, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
