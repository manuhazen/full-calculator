param(
  [Parameter(Mandatory)][string]$Id,
  [Parameter(Mandatory)][ValidateSet('not_started','in_progress','completed','blocked')][string]$Status,
  [string]$Command,
  [string]$Result,
  [string]$Note
)
$ErrorActionPreference='Stop'
$path=Join-Path $PSScriptRoot '../feature-list.json'
$tracker=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
$feature=$tracker.features | Where-Object id -eq $Id
if(!$feature){throw "Unknown feature $Id"}
if($Status -in @('in_progress','completed')) {
  foreach($dependency in $feature.dependencies) {
    if(($tracker.features | Where-Object id -eq $dependency).status -ne 'completed'){throw "Unmet dependency: $dependency"}
  }
}
if($Status -eq 'completed' -and (!$Command -or !$Result)){throw 'Completion requires actual verification command and outcome.'}
$now=[DateTime]::UtcNow.ToString('o')
$feature.status=$Status
if($Command){$feature.verification.checks=@($feature.verification.checks)+[pscustomobject]@{command=$Command;result=$Result;executedAt=$now}}
if($Status -eq 'blocked'){$feature.verification.blocker=$Note}else{$feature.verification.blocker=$null}
if($Note){$feature.notes=@($feature.notes)+$Note}
$tracker.updatedAt=$now
$tracker | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $path -Encoding utf8
