$toolsDir = Join-Path $PSScriptRoot "..\\tools\\foundry"
$zipPath = Join-Path $env:TEMP "foundry_win32_amd64.zip"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/foundry-rs/foundry/releases/latest"
$asset = $release.assets | Where-Object { $_.name -like "foundry_*_win32_amd64.zip" } | Select-Object -First 1

if (-not $asset) {
  throw "Could not locate Windows Foundry asset in latest GitHub release."
}

Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDir -Force
Remove-Item -LiteralPath $zipPath -Force

Write-Output "Foundry installed to $toolsDir"
