<#
.SYNOPSIS
    Tests the TinyWins schema and its access rules on a local PostgreSQL (no Supabase needed).
    Connection: PGHOST / PGPORT / PGUSER / PGPASSWORD as for psql (defaults localhost, postgres).
#>
[CmdletBinding()]
param([string]$Database = 'tinywins_test', [switch]$Keep)
$ErrorActionPreference = 'Stop'
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) { $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName }
if (-not $psql) { throw 'psql not found.' }
if (-not $env:PGUSER) { $env:PGUSER = 'postgres' }
if (-not $env:PGHOST) { $env:PGHOST = 'localhost' }
$here = $PSScriptRoot
function Invoke-Psql([string]$Db, [string[]]$Arguments) {
    & $psql -X -q -v ON_ERROR_STOP=1 -d $Db @Arguments
    if ($LASTEXITCODE -ne 0) { throw "psql failed ($LASTEXITCODE)" }
}
Invoke-Psql 'postgres' @('-c', "drop database if exists $Database", '-c', "create database $Database")
try {
    Invoke-Psql $Database @('-f', (Join-Path $here 'local-shim.sql'))
    foreach ($pass in 1, 2) {
        Get-ChildItem (Join-Path $here '..\migrations') -Filter '*.sql' | Sort-Object Name | ForEach-Object { Invoke-Psql $Database @('-1', '-f', $_.FullName) }
        Write-Host "migration applied (pass $pass)" -ForegroundColor Cyan
    }
    Invoke-Psql $Database @('-t', '-f', (Join-Path $here 'access.test.sql'))
    Write-Host 'Database tests passed.' -ForegroundColor Green
} finally {
    if (-not $Keep) { Invoke-Psql 'postgres' @('-c', "drop database if exists $Database") }
}
