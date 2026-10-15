# Extracts the transition table from stateMachine.ts into atlas-transitions.json
# Deterministic, no LLM. Run: powershell -File extract-transitions.ps1
$ErrorActionPreference = "Stop"
$repo = "D:\portfolio porjects\flytbase"
$src = Get-Content "$repo\src\app\domain\stateMachine.ts" -Raw

# Split on transition objects; capture from/event/to/gate/guard/reason/requiresDissent
$rx = [regex]'(?s)\{\s*from:\s*"([^"]+|\*)",\s*event:\s*"([^"]+)",\s*to:\s*"([^"]+)",\s*gate:\s*"([^"]+)"(.*?)\},'
$guardRx = [regex]'guard:\s*([A-Za-z_][A-Za-z0-9_]*)'
$reasonRx = [regex]'reason:\s*"([^"]*)"'
$dissentRx = [regex]'requiresDissent:\s*true'
$effectsRx = [regex]'effects:\s*\{([^}]*)\}'

$transitions = @()
$mi = $rx.Matches($src)
foreach ($m in $mi) {
  $from = $m.Groups[1].Value; $ev = $m.Groups[2].Value; $to = $m.Groups[3].Value; $gate = $m.Groups[4].Value
  $rest = $m.Groups[5].Value
  $guard = $guardRx.Matches($rest) | Select-Object -First 1 | ForEach-Object { $_.Groups[1].Value }
  $reason = $reasonRx.Matches($rest) | Select-Object -First 1 | ForEach-Object { $_.Groups[1].Value }
  $dissent = $dissentRx.IsMatch($rest)
  $eff = $effectsRx.Matches($rest) | Select-Object -First 1 | ForEach-Object { $_.Groups[1].Value.Trim() }
  $line = ($src.Substring(0, $m.Index).Split("`n")).Count
  $transitions += [pscustomobject]@{ line = $line; from = $from; event = $ev; to = $to; gate = $gate; guard = $guard; requiresDissent = $dissent; effects = $eff; reason = $reason }
}

$out = [pscustomobject]@{
  generated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
  source = "src/app/domain/stateMachine.ts"
  count = $transitions.Count
  transitions = $transitions
}
$dest = Join-Path $PSScriptRoot "atlas-transitions.json"
$out | ConvertTo-Json -Depth 5 | Set-Content -Path $dest -Encoding UTF8
Write-Host "Transitions extracted: $($transitions.Count)"
Write-Host "By gate:"
$transitions | Group-Object gate | ForEach-Object { "  $($_.Name): $($_.Count)" }
Write-Host "RequiresDissent: $(($transitions | Where-Object { $_.requiresDissent }).Count)"
Write-Host "Written: $dest"

