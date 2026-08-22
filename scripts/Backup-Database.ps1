param(
  [string]$ContainerName = 'mini-ctf-postgres',
  [string]$Database = 'mini_ctf',
  [string]$DatabaseUser = 'mini_ctf_owner',
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups')
)

$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^[A-Za-z0-9_]+$' -or $DatabaseUser -notmatch '^[A-Za-z0-9_]+$') {
  throw 'Database and database user may contain only letters, numbers, and underscores.'
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "mini-ctf-$stamp.dump"
$containerPath = "/tmp/$fileName"
$hostPath = Join-Path $resolvedOutput $fileName

try {
  & docker exec $ContainerName pg_dump -U $DatabaseUser -d $Database -Fc -f $containerPath
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
  & docker cp "${ContainerName}:$containerPath" $hostPath
  if ($LASTEXITCODE -ne 0) { throw 'Could not copy the database backup from Docker.' }
  Write-Host "Backup created: $hostPath"
} finally {
  & docker exec $ContainerName rm -f $containerPath 2>$null
}
