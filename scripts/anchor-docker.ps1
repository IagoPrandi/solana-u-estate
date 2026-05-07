param(
  [ValidateSet("build", "test", "deploy-devnet")]
  [string]$Command = "build"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envDeployPath = Join-Path $repoRoot ".env.deploy"

if (Test-Path $envDeployPath) {
  Get-Content $envDeployPath | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $name, $value = $_ -split "=", 2
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
  }
}

if ($Command -eq "deploy-devnet") {
  $cluster = [Environment]::GetEnvironmentVariable("SOLANA_CLUSTER", "Process")
  if (-not $cluster) { $cluster = "devnet" }
  if ($cluster -ne "devnet") {
    throw "Refusing to deploy outside Solana Devnet for Phase 0."
  }
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker is required for reproducible Anchor SBF builds on Windows."
}

$envArgs = @()
foreach ($name in @("SOLANA_CLUSTER", "SOLANA_RPC_URL", "ANCHOR_PROVIDER_URL", "ANCHOR_WALLET", "USUFRUCT_PROGRAM_ID")) {
  $value = [Environment]::GetEnvironmentVariable($name, "Process")
  if ($value) {
    $envArgs += @("-e", "$name=$value")
  }
}

& docker run --rm `
  -v "${repoRoot}:/work" `
  -v "usufruct-anchor-cargo:/tmp/cargo" `
  -v "usufruct-anchor-rustup:/tmp/rustup" `
  -v "usufruct-anchor-agave:/tmp/agave" `
  -v "usufruct-anchor-cli:/tmp/anchor" `
  -v "usufruct-anchor-node-modules:/work/node_modules" `
  -e "ANCHOR_TOOL_COMMAND=$Command" `
  @envArgs `
  node:24.10.0-trixie `
  bash /work/scripts/anchor-docker-runner.sh

if ($LASTEXITCODE -ne 0) {
  throw "Anchor Docker command failed with exit code $LASTEXITCODE."
}
