param(
  [string]$SellerAddress = "",
  [string]$BuyerAddress = ""
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)

  $result = @{}

  if (!(Test-Path $Path)) {
    return $result
  }

  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
      return
    }

    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
      $result[$parts[0].Trim()] = $parts[1].Trim()
    }
  }

  return $result
}

function Add-ErrorLine {
  param([string]$Message)

  $script:Errors.Add($Message) | Out-Null
}

function Add-WarningLine {
  param([string]$Message)

  $script:Warnings.Add($Message) | Out-Null
}

function Add-OkLine {
  param([string]$Message)

  $script:OkLines.Add($Message) | Out-Null
}

function Test-AddressLike {
  param([string]$Value)

  return $Value -match '^0x[a-fA-F0-9]{40}$'
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$appEnv = Read-EnvFile (Join-Path $repoRoot ".env.app")
$deployEnv = Read-EnvFile (Join-Path $repoRoot ".env.deploy")
$castPath = Join-Path $repoRoot "tools\foundry\cast.exe"
$dockerComposePath = Join-Path $repoRoot "docker-compose.yml"

$script:Errors = New-Object System.Collections.Generic.List[string]
$script:Warnings = New-Object System.Collections.Generic.List[string]
$script:OkLines = New-Object System.Collections.Generic.List[string]

Add-OkLine "Loaded .env.app and .env.deploy for demo preflight validation."

if ([string]::IsNullOrWhiteSpace($SellerAddress) -and $appEnv.ContainsKey("DEMO_SELLER_ADDRESS")) {
  $SellerAddress = $appEnv["DEMO_SELLER_ADDRESS"]
}

if ([string]::IsNullOrWhiteSpace($BuyerAddress) -and $appEnv.ContainsKey("DEMO_BUYER_ADDRESS")) {
  $BuyerAddress = $appEnv["DEMO_BUYER_ADDRESS"]
}

if ([string]::IsNullOrWhiteSpace($SellerAddress) -and $deployEnv.ContainsKey("PERSON_A_ADDRESS")) {
  $SellerAddress = $deployEnv["PERSON_A_ADDRESS"]
}

if ([string]::IsNullOrWhiteSpace($BuyerAddress) -and $deployEnv.ContainsKey("PERSON_B_ADDRESS")) {
  $BuyerAddress = $deployEnv["PERSON_B_ADDRESS"]
}

$requiredAppVars = @(
  "NEXT_PUBLIC_PROPERTY_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_USUFRUCT_RIGHT_NFT_ADDRESS",
  "NEXT_PUBLIC_PROPERTY_VALUE_TOKEN_FACTORY_ADDRESS",
  "NEXT_PUBLIC_PRIMARY_VALUE_SALE_ADDRESS"
)

$missingAppVars = @(
  $requiredAppVars | Where-Object { -not $appEnv.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($appEnv[$_]) }
)

if ($missingAppVars.Count -gt 0) {
  Add-ErrorLine "Missing deployed contract addresses in .env.app: $($missingAppVars -join ', ')."
} else {
  Add-OkLine "All required Sepolia contract addresses are configured in .env.app."
}

foreach ($envName in $requiredAppVars) {
  if ($appEnv.ContainsKey($envName) -and ![string]::IsNullOrWhiteSpace($appEnv[$envName])) {
    if (!(Test-AddressLike $appEnv[$envName])) {
      Add-ErrorLine "$envName is not a valid EVM address."
    }
  }
}

if ($deployEnv.ContainsKey("SEPOLIA_RPC_URL") -and ![string]::IsNullOrWhiteSpace($deployEnv["SEPOLIA_RPC_URL"])) {
  Add-OkLine "SEPOLIA_RPC_URL is configured in .env.deploy."
} else {
  Add-ErrorLine "Missing SEPOLIA_RPC_URL in .env.deploy."
}

$hasDeployerKey = $deployEnv.ContainsKey("DEPLOYER_PRIVATE_KEY") -and ![string]::IsNullOrWhiteSpace($deployEnv["DEPLOYER_PRIVATE_KEY"])
if ($hasDeployerKey) {
  Add-OkLine "DEPLOYER_PRIVATE_KEY is configured for fresh Sepolia deployment."
} elseif ($missingAppVars.Count -gt 0) {
  Add-ErrorLine "DEPLOYER_PRIVATE_KEY is missing and .env.app does not already contain deployed contract addresses."
} else {
  Add-WarningLine "DEPLOYER_PRIVATE_KEY is missing. Existing contract addresses must stay valid because fresh deployment is not currently possible."
}

if (Test-Path $castPath) {
  Add-OkLine "Foundry cast binary is available."
} else {
  Add-ErrorLine "Missing tools\\foundry\\cast.exe. Wallet balance checks cannot run."
}

if (Test-Path $dockerComposePath) {
  Add-OkLine "docker-compose.yml is present."
} else {
  Add-ErrorLine "docker-compose.yml is missing."
}

try {
  $null = Get-Command docker -ErrorAction Stop
  Add-OkLine "Docker CLI is available."
} catch {
  Add-WarningLine "Docker CLI is not available in PATH. Docker demo verification cannot run from this machine."
}

$localDbPath = $appEnv["LOCAL_DB_PATH"]
if ([string]::IsNullOrWhiteSpace($localDbPath)) {
  Add-ErrorLine "LOCAL_DB_PATH is missing in .env.app."
} else {
  Add-OkLine "LOCAL_DB_PATH is configured in .env.app."
}

if ([string]::IsNullOrWhiteSpace($SellerAddress)) {
  Add-ErrorLine "SellerAddress is required for milestone 0.13 demo-wallet validation."
} elseif (!(Test-AddressLike $SellerAddress)) {
  Add-ErrorLine "SellerAddress is not a valid EVM address."
} else {
  Add-OkLine "SellerAddress is configured for demo validation."
}

if ([string]::IsNullOrWhiteSpace($BuyerAddress)) {
  Add-ErrorLine "BuyerAddress is required for milestone 0.13 demo-wallet validation."
} elseif (!(Test-AddressLike $BuyerAddress)) {
  Add-ErrorLine "BuyerAddress is not a valid EVM address."
} else {
  Add-OkLine "BuyerAddress is configured for demo validation."
}

if (
  !( [string]::IsNullOrWhiteSpace($SellerAddress) ) -and
  !( [string]::IsNullOrWhiteSpace($BuyerAddress) ) -and
  (Test-AddressLike $SellerAddress) -and
  (Test-AddressLike $BuyerAddress) -and
  ($SellerAddress.ToLowerInvariant() -eq $BuyerAddress.ToLowerInvariant())
) {
  Add-ErrorLine "SellerAddress and BuyerAddress must be different wallets."
}

$canCheckBalances =
  (Test-Path $castPath) -and
  ($deployEnv.ContainsKey("SEPOLIA_RPC_URL")) -and
  ![string]::IsNullOrWhiteSpace($deployEnv["SEPOLIA_RPC_URL"])

if ($canCheckBalances) {
  foreach ($wallet in @(
    @{ Label = "Seller"; Address = $SellerAddress },
    @{ Label = "Buyer"; Address = $BuyerAddress }
  )) {
    if ([string]::IsNullOrWhiteSpace($wallet.Address) -or !(Test-AddressLike $wallet.Address)) {
      continue
    }

    try {
      $balanceEth = (& $castPath balance $wallet.Address --rpc-url $deployEnv["SEPOLIA_RPC_URL"] --ether).Trim()
      Add-OkLine "$($wallet.Label) Sepolia balance: $balanceEth ETH."

      if ([decimal]$balanceEth -le 0) {
        Add-ErrorLine "$($wallet.Label) wallet has zero Sepolia ETH."
      }
    } catch {
      Add-ErrorLine "Could not read $($wallet.Label) Sepolia balance via cast."
    }
  }
}

Write-Host ""
Write-Host "Demo preflight summary" -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan

foreach ($line in $OkLines) {
  Write-Host "[OK] $line" -ForegroundColor Green
}

foreach ($line in $Warnings) {
  Write-Host "[WARN] $line" -ForegroundColor Yellow
}

foreach ($line in $Errors) {
  Write-Host "[ERR] $line" -ForegroundColor Red
}

Write-Host ""
if ($Errors.Count -gt 0) {
  Write-Host "Demo preflight failed." -ForegroundColor Red
  exit 1
}

Write-Host "Demo preflight passed." -ForegroundColor Green
