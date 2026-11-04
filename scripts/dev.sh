#!/usr/bin/env bash
# Ένα σημείο εκκίνησης και για Mac και για Linux. Ctrl+C κλείνει και τους δύο servers.
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
mode="${1:---mysql}"
if [[ "$mode" != --mysql && "$mode" != --demo ]]; then
  echo 'Χρήση: bash scripts/dev.sh [--mysql|--demo]' >&2
  exit 1
fi
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi
if [[ "$mode" == --demo ]]; then
  export Storage__UseInMemory=true
  echo 'Demo mode: τα quiz και τα δωμάτια χάνονται όταν κλείσει το backend.'
else
  export Storage__UseInMemory=false
  if [[ -z "${ConnectionStrings__Quiz:-}" ]]; then
    echo 'Αντίγραψε το .env.example σε .env και ρύθμισε τη σύνδεση MySQL.' >&2
    exit 1
  fi
fi
if command -v dotnet >/dev/null 2>&1; then
  dotnet_cmd="$(command -v dotnet)"
elif [[ -x /workspace/tools/dotnet/dotnet ]]; then
  dotnet_cmd=/workspace/tools/dotnet/dotnet
else
  echo 'Χρειάζεται .NET SDK 8. Δες το README.md.' >&2
  exit 1
fi
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$project_root/.local/dotnet-home}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-$project_root/.local/nuget}"
mkdir -p "$DOTNET_CLI_HOME" "$NUGET_PACKAGES"
"$dotnet_cmd" build backend/Quiz.Api.csproj --nologo
if [[ ! -d frontend/node_modules ]]; then (cd frontend && npm ci --no-audit --no-fund); fi
# Ξεκινάμε το έτοιμο dll απευθείας, ώστε το PID να ανήκει στον ίδιο τον server.
(
  cd backend
  exec "$dotnet_cmd" bin/Debug/net8.0/Quiz.Api.dll --urls http://0.0.0.0:5080
) &
api_pid=$!
(
  cd frontend
  exec node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort
) &
web_pid=$!
cleanup() {
  trap - EXIT INT TERM
  kill "$api_pid" "$web_pid" 2>/dev/null || true
  wait "$api_pid" "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Το wait -n δεν υπάρχει στο Bash 3 του macOS. Ο μικρός έλεγχος είναι συμβατός και με αυτό.
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do sleep 1; done
exit 1
