param(
  [string]$OutFile = "target/deploy/devnet-deployer.json",
  [switch]$NoEnvUpdate
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outPath = Join-Path $repoRoot $OutFile
$outDir = Split-Path -Parent $outPath
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$secureSecret = Read-Host "Paste Solana base58 private key or seed" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
  $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $plainSecret) {
  throw "No key material provided."
}

$importerPath = Join-Path $repoRoot "scripts/import-solana-deployer.cjs"
$plainSecret | node $importerPath $outPath
if ($LASTEXITCODE -ne 0) {
  $plainSecret = $null
  throw "Solana deployer import failed with exit code $LASTEXITCODE."
}
$plainSecret = $null

if (-not $NoEnvUpdate) {
  $envDeployPath = Join-Path $repoRoot ".env.deploy"
  $normalizedOutFile = $OutFile -replace "\\", "/"
  if (Test-Path $envDeployPath) {
    $envDeploy = Get-Content $envDeployPath
    if ($envDeploy -match "^ANCHOR_WALLET=") {
      $envDeploy = $envDeploy -replace "^ANCHOR_WALLET=.*$", "ANCHOR_WALLET=$normalizedOutFile"
    } else {
      $envDeploy += "ANCHOR_WALLET=$normalizedOutFile"
    }
    Set-Content -Path $envDeployPath -Value $envDeploy -Encoding utf8
  }
}

Write-Output "Keypair saved to ignored path: $OutFile"
