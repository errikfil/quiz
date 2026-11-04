#!/usr/bin/env bash
# Εγκατάσταση μέσα στο cloud workspace, χωρίς αλλαγή των system directories.
set -euo pipefail
cd /workspace/quiz
mkdir -p /workspace/tools/dotnet-home /workspace/tools/nuget /workspace/tools/npm-cache
export DOTNET_CLI_HOME=/workspace/tools/dotnet-home
export NUGET_PACKAGES=/workspace/tools/nuget
export npm_config_cache=/workspace/tools/npm-cache
export DOTNET_CLI_TELEMETRY_OPTOUT=1
if ! [[ -x /workspace/tools/dotnet/dotnet ]]; then
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /workspace/tools/dotnet-install.sh
  bash /workspace/tools/dotnet-install.sh --version 8.0.427 --install-dir /workspace/tools/dotnet --no-path
fi
/workspace/tools/dotnet/dotnet restore backend/Quiz.Api.csproj --locked-mode
/workspace/tools/dotnet/dotnet build backend/Quiz.Api.csproj --no-restore --nologo
(cd frontend && npm ci --no-audit --no-fund && npm run build)
