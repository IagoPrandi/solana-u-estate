$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envDeployPath = Join-Path $repoRoot ".env.deploy"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$agaveBin = Join-Path $repoRoot "tools\agave-v3.0.10\bin"
$anchorBin = Join-Path $repoRoot "tools\anchor-v0.32.1\bin"
$env:Path = "$anchorBin;$agaveBin;$cargoBin;$env:Path"

if (Test-Path $envDeployPath) {
  Get-Content $envDeployPath | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $name, $value = $_ -split "=", 2
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
  }
}

$cluster = $env:SOLANA_CLUSTER
if (-not $cluster) { $cluster = "devnet" }
if ($cluster -ne "devnet") {
  throw "Refusing to deploy outside Solana Devnet for Phase 0."
}

& (Join-Path $PSScriptRoot "anchor-docker.ps1") -Command deploy-devnet
