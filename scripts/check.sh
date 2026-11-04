#!/usr/bin/env bash
# Οι λειτουργικοί έλεγχοι απαιτούν ήδη ανοιχτό backend και frontend.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if command -v dotnet >/dev/null 2>&1; then dotnet_cmd=dotnet; else dotnet_cmd=/workspace/tools/dotnet/dotnet; fi
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$PWD/.local/dotnet-home}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-$PWD/.local/nuget}"
"$dotnet_cmd" build backend/Quiz.Api.csproj --nologo
(cd frontend && npm run build)
node tests/live.mjs
(cd frontend && npm run test:e2e)
