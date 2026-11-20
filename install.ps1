# Pixel Progress (cat edition) installer for Windows.
# Copies the mod to %USERPROFILE%\claude-mods\pixel-progress and adds that
# folder to CLAUDE_CODE_PLUGIN_DIRS in %USERPROFILE%\.claude\settings.json.
# Run: double-click install.cmd, or  powershell -ExecutionPolicy Bypass -File install.ps1
# Optional: -AddReminder also adds a short note to %USERPROFILE%\.claude\CLAUDE.md
# asking Claude to always use the progress bar.
param([switch]$AddReminder)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$src = Join-Path $PSScriptRoot 'pixel-progress'
if (-not (Test-Path (Join-Path $src '.claude-plugin\plugin.json'))) { throw "Can't find the pixel-progress folder next to install.ps1. Unzip the whole zip first." }

$mods = Join-Path $env:USERPROFILE 'claude-mods'
$dest = Join-Path $mods 'pixel-progress'
New-Item -ItemType Directory -Force $mods | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (Test-Path $dest) {
  $bk = Join-Path $mods "pixel-progress-backup-$stamp"
  Move-Item $dest $bk
  Write-Host "Old version kept in $bk"
}
Copy-Item $src $dest -Recurse
Write-Host "Mod copied to $dest"

# settings.json: add the folder to env.CLAUDE_CODE_PLUGIN_DIRS
$claudeDir = Join-Path $env:USERPROFILE '.claude'
New-Item -ItemType Directory -Force $claudeDir | Out-Null
$settings = Join-Path $claudeDir 'settings.json'
if (Test-Path $settings) {
  $raw = [IO.File]::ReadAllText($settings)
  Copy-Item $settings "$settings.backup-$stamp"
  if ($raw.Trim() -eq '') { $raw = '{}' }
  try { $json = $raw | ConvertFrom-Json } catch { throw "settings.json is not valid JSON, so it was left alone. Add CLAUDE_CODE_PLUGIN_DIRS by hand (see README.md)." }
} else {
  $json = New-Object PSObject
}
if (-not ($json.PSObject.Properties.Name -contains 'env')) { $json | Add-Member -NotePropertyName env -NotePropertyValue (New-Object PSObject) }
$cur = $json.env.CLAUDE_CODE_PLUGIN_DIRS
if ([string]::IsNullOrWhiteSpace($cur)) { $new = $dest }
elseif (($cur -split ';') -contains $dest) { $new = $cur }
else { $new = "$cur;$dest" }
if ($json.env.PSObject.Properties.Name -contains 'CLAUDE_CODE_PLUGIN_DIRS') { $json.env.CLAUDE_CODE_PLUGIN_DIRS = $new }
else { $json.env | Add-Member -NotePropertyName CLAUDE_CODE_PLUGIN_DIRS -NotePropertyValue $new }
[IO.File]::WriteAllText($settings, ($json | ConvertTo-Json -Depth 50), $utf8)
Write-Host "settings.json updated: CLAUDE_CODE_PLUGIN_DIRS = $new"

if ($AddReminder) {
  $md = Join-Path $claudeDir 'CLAUDE.md'
  $note = @"

## Pixel Progress bar
- For any task that uses tools, call ``mcp__pixel-progress__progress`` (load it with ToolSearch first if it is deferred): ``title`` + ``total`` + ``done: 0`` at the start, ``done`` + ``note`` after each step, ``finished: true`` at the end.
"@
  $old = if (Test-Path $md) { [IO.File]::ReadAllText($md) } else { '' }
  if ($old -notmatch 'mcp__pixel-progress__progress') { [IO.File]::WriteAllText($md, $old + $note, $utf8); Write-Host "Reminder added to $md" }
  else { Write-Host "CLAUDE.md already mentions the progress bar; left as is." }
}

Write-Host ''
Write-Host 'Done! Fully quit and reopen Claude (desktop app or terminal), then type /progress-demo' -ForegroundColor Green