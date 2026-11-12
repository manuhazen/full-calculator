$ErrorActionPreference='Stop'
$repo=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$fixture=Join-Path $repo ('tmp/format-hook-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $fixture '.githooks'),(Join-Path $fixture 'tools/format') -Force | Out-Null
foreach($name in @('package.json','package-lock.json','.prettierrc.json','.prettierignore','.dockerignore','lint-staged.config.mjs')){Copy-Item -LiteralPath (Join-Path $repo $name) -Destination $fixture}
Copy-Item -LiteralPath (Join-Path $repo '.githooks/pre-commit') -Destination (Join-Path $fixture '.githooks/pre-commit')
Copy-Item -LiteralPath (Join-Path $repo 'tools/format/Dockerfile') -Destination (Join-Path $fixture 'tools/format/Dockerfile')

function Invoke-Git([string[]]$Arguments){& git -C $fixture @Arguments;if($LASTEXITCODE -ne 0){throw "Git failed: $Arguments"}}
Invoke-Git @('init','--quiet')
Invoke-Git @('config','user.name','Formatter Verifier')
Invoke-Git @('config','user.email','formatter@example.invalid')
Invoke-Git @('config','core.autocrlf','false')
$data=[ordered]@{}
foreach($number in 1..20){$data[('key{0:d2}' -f $number)]=1}
$file=Join-Path $fixture 'notes with spaces.json'
$baseline=($data | ConvertTo-Json).Replace("`r`n","`n")+"`n"
[System.IO.File]::WriteAllText($file,$baseline,[System.Text.UTF8Encoding]::new($false))
Invoke-Git @('add','.')
Invoke-Git @('commit','--quiet','-m','fixture baseline')
Invoke-Git @('config','core.hooksPath','.githooks')

# Stage one deliberately unformatted edit, then leave a distant edit unstaged.
$text=Get-Content -LiteralPath $file -Raw
$text=$text.Replace('"key01": 1','"key01":2')
[System.IO.File]::WriteAllText($file,$text,[System.Text.UTF8Encoding]::new($false))
Invoke-Git @('add','notes with spaces.json')
$text=$text.Replace('"key20": 1','"key20": 3')
[System.IO.File]::WriteAllText($file,$text,[System.Text.UTF8Encoding]::new($false))
Invoke-Git @('commit','-m','exercise actual Docker pre-commit hook')
$committed=(& git -C $fixture show 'HEAD:notes with spaces.json' | Out-String) | ConvertFrom-Json
$working=Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
if($committed.key01 -ne 2 -or $committed.key20 -ne 1){throw 'Hook committed an unstaged change or lost the staged change.'}
if($working.key20 -ne 3){throw 'Hook did not preserve the unstaged change.'}
$raw=& git -C $fixture show 'HEAD:notes with spaces.json' | Out-String
if($raw -notmatch '"key01": 2'){throw 'Prettier did not format the staged JSON.'}
Write-Output 'PASS actual Git pre-commit: Docker-only Prettier formatted staged path with spaces and preserved the unstaged edit.'
Write-Output "Fixture: $fixture"
