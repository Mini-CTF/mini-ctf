param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [switch]$ConfirmRestore,
  [string]$ContainerName = 'mini-ctf-postgres',
  [string]$Database = 'mini_ctf',
  [string]$DatabaseUser = 'mini_ctf_owner'
)

$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) {
  throw 'Restore changes the selected database. Re-run with -ConfirmRestore after verifying the backup path.'
}
if ($Database -notmatch '^[A-Za-z0-9_]+$' -or $DatabaseUser -notmatch '^[A-Za-z0-9_]+$') {
  throw 'Database and database user may contain only letters, numbers, and underscores.'
}
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if ([System.IO.Path]::GetExtension($resolvedBackup) -ne '.dump') {
  throw 'Expected a custom pg_dump file with the .dump extension.'
}

$containerPath = '/tmp/mini-ctf-restore.dump'
try {
  & docker cp $resolvedBackup "${ContainerName}:$containerPath"
  if ($LASTEXITCODE -ne 0) { throw 'Could not copy the backup into Docker.' }
  & docker exec $ContainerName pg_restore -U $DatabaseUser -d $Database --clean --if-exists --no-owner $containerPath
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed. The database may be partially restored; inspect PostgreSQL logs before retrying.' }
  Write-Host 'Database restore completed. Restart the backend so Flyway can validate the schema.'
} finally {
  & docker exec $ContainerName rm -f $containerPath 2>$null
}
