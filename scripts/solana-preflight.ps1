$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envAppPath = Join-Path $repoRoot ".env.app"
$envDeployPath = Join-Path $repoRoot ".env.deploy"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$agaveBin = Join-Path $repoRoot "tools\agave-v3.0.10\bin"
$anchorBin = Join-Path $repoRoot "tools\anchor-v0.32.1\bin"
$env:Path = "$anchorBin;$agaveBin;$cargoBin;$env:Path"

function Add-Result($Label, $Ok, $Detail) {
  $prefix = if ($Ok) { "[OK]" } else { "[FAIL]" }
  Write-Output "$prefix $Label - $Detail"
  if (-not $Ok) { $script:Failed = $true }
}

function Get-CommandVersion($Command, $CommandArgs) {
  $cmd = Get-Command $Command -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  $result = & $Command @CommandArgs 2>&1 | Select-Object -First 1
  if (-not $result) { return $null }
  return $result.ToString()
}

$script:Failed = $false

$nodeVersion = Get-CommandVersion "node" @("--version")
if (-not $nodeVersion) { $nodeVersion = "missing" }
Add-Result "Node.js" ($nodeVersion -like "v24.*") $nodeVersion

$rustVersion = Get-CommandVersion "rustc" @("--version")
if (-not $rustVersion) { $rustVersion = "missing" }
Add-Result "Rust" ($rustVersion -like "rustc 1.91.1*") $rustVersion

$solanaVersion = Get-CommandVersion "solana" @("--version")
if (-not $solanaVersion) { $solanaVersion = "missing" }
Add-Result "Solana CLI" ($solanaVersion -like "*3.0.10*") $solanaVersion

$anchorVersion = Get-CommandVersion "anchor" @("--version")
if (-not $anchorVersion) { $anchorVersion = "missing" }
Add-Result "Anchor CLI" ($anchorVersion -like "anchor-cli 0.32.1*") $anchorVersion

if (Test-Path $envAppPath) {
  $envApp = Get-Content $envAppPath -Raw
  Add-Result ".env.app has no private key" ($envApp -notmatch "PRIVATE_KEY|SECRET|MNEMONIC|ANCHOR_WALLET") "checked"
  Add-Result ".env.app removes EVM addresses" ($envApp -notmatch "SEPOLIA|PROPERTY_REGISTRY|PRIMARY_VALUE_SALE|USUFRUCT_RIGHT_NFT|VALUE_TOKEN_FACTORY") "checked"
} else {
  Add-Result ".env.app" $true "not present; use .env.app.example"
}

if (Test-Path $envDeployPath) {
  $envDeploy = Get-Content $envDeployPath -Raw
  Add-Result ".env.deploy cluster" ($envDeploy -match "SOLANA_CLUSTER=devnet|ANCHOR_PROVIDER_URL=.*devnet") "checked"
} else {
  Add-Result ".env.deploy" $true "not present; use .env.deploy.example"
}

if ($script:Failed) {
  throw "Solana preflight failed. Install fixed tooling versions or update env files."
}

Write-Output "[OK] Solana preflight passed."
