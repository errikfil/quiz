using System.Security.Cryptography;
using System.Text;
namespace Quiz.Api.Services;

public static class Keys
{
    public static string New() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public static bool Matches(string? value, string hash) => value is not null &&
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(Hash(value)), Encoding.UTF8.GetBytes(hash));
}
