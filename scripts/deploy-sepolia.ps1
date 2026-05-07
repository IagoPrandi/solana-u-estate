$forgePath = Join-Path $PSScriptRoot "..\\tools\\foundry\\forge.exe"
$envFilePath = Join-Path $PSScriptRoot "..\\.env.deploy"

if (!(Test-Path $forgePath)) {
  throw "Missing forge binary at $forgePath. Run .\\scripts\\install-foundry.ps1 first."
}

if (!(Test-Path $envFilePath)) {
  throw "Missing .env.deploy at $envFilePath."
}

Get-Content $envFilePath | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
    return
  }

  $parts = $_ -split '=', 2
  if ($parts.Length -eq 2) {
    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
  }
}

& $forgePath script contracts/script/Deploy.s.sol:Deploy `
  --rpc-url $env:SEPOLIA_RPC_URL `
  --private-key $env:DEPLOYER_PRIVATE_KEY `
  --broadcast
