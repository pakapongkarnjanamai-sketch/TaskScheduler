[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$TargetRoot = '\\10.10.143.39\wwwroot\Tools\TaskScheduler',
    [string]$PublicBaseUrl = 'https://ap-ntc2138-qawb/Tools/TaskScheduler',
    [switch]$SkipReactLint,
    [switch]$SkipValidation,
    [switch]$DisableReactWebConfig,
    [string[]]$ReactPhysicalFallbackRoutes = @('tasks'),
    [switch]$PatchProductionSchema,
    [string]$SqlServer = '10.10.143.37',
    [string]$SqlDatabase = 'TaskScheduler',
    [string]$SqlUser = 'sa'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)

    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-External {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory = $RepositoryRoot
    )

    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-RobocopyMirror {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path $Source)) {
        throw "Source path does not exist: $Source"
    }

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    & robocopy $Source $Destination /MIR /R:60 /W:2 /NFL /NDL /NJH /NJS
    $exitCode = $LASTEXITCODE

    if ($exitCode -ge 8) {
        throw "Robocopy failed with exit code $exitCode while copying '$Source' to '$Destination'."
    }
}

function Join-Url {
    param(
        [string]$BaseUrl,
        [string]$RelativePath
    )

    return "$($BaseUrl.TrimEnd('/'))/$($RelativePath.TrimStart('/'))"
}

function Get-ReactBasePath {
    param([string]$BaseUrl)

    $baseUri = [Uri]$BaseUrl
    $path = $baseUri.AbsolutePath.TrimEnd('/')

    if ([string]::IsNullOrWhiteSpace($path)) {
        return '/React/'
    }

    return "$path/React/"
}

function Write-JsonFile {
    param(
        [string]$Path,
        $Content
    )

    $json = $Content | ConvertTo-Json -Depth 20
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Set-AppOffline {
    param([string]$Path)

    New-Item -ItemType Directory -Force -Path $Path | Out-Null
    Set-Content -Path (Join-Path $Path 'app_offline.htm') -Value '<html><body>TaskScheduler deployment in progress.</body></html>' -Encoding UTF8
}

function Clear-AppOffline {
    param([string]$Path)

    Remove-Item -Path (Join-Path $Path 'app_offline.htm') -Force -ErrorAction SilentlyContinue
}

function Write-ClientConfiguration {
    param(
        [string]$ClientTarget,
        [string]$ApiBaseUrl
    )

    $settings = [ordered]@{
        Logging = [ordered]@{
            LogLevel = [ordered]@{
                Default = 'Information'
                'Microsoft.AspNetCore' = 'Warning'
            }
        }
        AllowedHosts = '*'
        TaskSchedulerApi = [ordered]@{
            BaseUrl = $ApiBaseUrl
        }
    }

    Write-JsonFile -Path (Join-Path $ClientTarget 'appsettings.json') -Content $settings
    Write-JsonFile -Path (Join-Path $ClientTarget 'appsettings.Development.json') -Content $settings
}

function Write-ApiDevelopmentConfiguration {
    param([string]$ApiTarget)

    $settings = [ordered]@{
        Logging = [ordered]@{
            LogLevel = [ordered]@{
                Default = 'Information'
                'Microsoft.AspNetCore' = 'Warning'
                'Microsoft.EntityFrameworkCore.Database.Command' = 'Warning'
            }
        }
    }

    Write-JsonFile -Path (Join-Path $ApiTarget 'appsettings.Development.json') -Content $settings
}

function Write-RootLandingPage {
    param(
        [string]$RootPath,
        [string]$BaseUrl
    )

    $html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TaskScheduler</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2933; }
    main { max-width: 720px; }
    a { color: #0f5ea8; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <main>
    <h1>TaskScheduler</h1>
    <ul>
      <li><a href="$(Join-Url $BaseUrl 'React/')">React workspace</a></li>
      <li><a href="$(Join-Url $BaseUrl 'Client/')">MVC client</a></li>
      <li><a href="$(Join-Url $BaseUrl 'Service/swagger')">API Swagger</a></li>
    </ul>
  </main>
</body>
</html>
"@

    Set-Content -Path (Join-Path $RootPath 'index.html') -Value $html -Encoding UTF8
}

function Write-ReactPhysicalFallbackRoutes {
    param(
        [string]$ReactTarget,
        [string[]]$Routes
    )

    $indexPath = Join-Path $ReactTarget 'index.html'
    if (-not (Test-Path $indexPath)) {
        throw "React index.html was not found at: $indexPath"
    }

    foreach ($route in $Routes) {
        $normalizedRoute = $route.Trim().Trim('/', '\')
        if ([string]::IsNullOrWhiteSpace($normalizedRoute)) {
            continue
        }

        $routePath = $ReactTarget
        foreach ($segment in ($normalizedRoute -split '[\\/]')) {
            if (-not [string]::IsNullOrWhiteSpace($segment)) {
                $routePath = Join-Path $routePath $segment
            }
        }

        New-Item -ItemType Directory -Force -Path $routePath | Out-Null
        Copy-Item -Path $indexPath -Destination (Join-Path $routePath 'index.html') -Force
        Write-Host "Created React physical fallback: $normalizedRoute"
    }
}

function Invoke-ValidationRequest {
    param([string]$Url)

    $requestParameters = @{
        Uri = $Url
        UseDefaultCredentials = $true
        MaximumRedirection = 5
    }
    $invokeWebRequestCommand = Get-Command Invoke-WebRequest

    if ($invokeWebRequestCommand.Parameters.ContainsKey('SkipCertificateCheck')) {
        $requestParameters.SkipCertificateCheck = $true
    }

    if ($invokeWebRequestCommand.Parameters.ContainsKey('SkipHttpErrorCheck')) {
        $requestParameters.SkipHttpErrorCheck = $true
    }

    try {
        $response = Invoke-WebRequest @requestParameters
        $statusCode = [int]$response.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        else {
            throw
        }
    }

    [pscustomobject]@{
        Url = $Url
        StatusCode = $statusCode
    }
}

function Invoke-PostDeployValidation {
    param(
        [string]$BaseUrl,
        [switch]$HasReactFallback
    )

    Write-Step 'Validating deployed endpoints'

    $validationUrls = @(
        $BaseUrl,
        (Join-Url $BaseUrl 'React/'),
        (Join-Url $BaseUrl 'Client/'),
        (Join-Url $BaseUrl 'Service/api/Tasks/Get?skip=0&take=5&requireTotalCount=true')
    )

    foreach ($url in $validationUrls) {
        $result = Invoke-ValidationRequest -Url $url
        Write-Host "$($result.StatusCode) $($result.Url)"
    }

    $deepLink = Join-Url $BaseUrl 'React/tasks'
    $deepLinkResult = Invoke-ValidationRequest -Url $deepLink
    Write-Host "$($deepLinkResult.StatusCode) $($deepLinkResult.Url)"

    if ($deepLinkResult.StatusCode -eq 404 -and -not $HasReactFallback) {
        Write-Warning "React deep links need a server fallback. Keep React\\web.config with the httpErrors ExecuteURL fallback, or disable it intentionally and create physical fallback routes for the paths that must be reachable directly."
    }
}

function Invoke-ProductionSchemaPatch {
    param(
        [string]$Server,
        [string]$Database,
        [string]$User
    )

    Require-Command 'sqlcmd'

    if ([string]::IsNullOrWhiteSpace($env:TASKSCHEDULER_SQL_PASSWORD)) {
        throw 'Set TASKSCHEDULER_SQL_PASSWORD in the current process before using -PatchProductionSchema.'
    }

    $sql = @"
IF COL_LENGTH('dbo.Tasks', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Tasks ADD IsDeleted bit NOT NULL CONSTRAINT DF_Tasks_IsDeleted DEFAULT (0);
END;

IF COL_LENGTH('dbo.Tasks', 'DeletedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Tasks ADD DeletedAt datetime2 NULL;
END;

IF COL_LENGTH('dbo.Tasks', 'DeletedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Tasks ADD DeletedBy nvarchar(max) NULL;
END;

IF COL_LENGTH('dbo.Schedules', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Schedules ADD IsDeleted bit NOT NULL CONSTRAINT DF_Schedules_IsDeleted DEFAULT (0);
END;

IF COL_LENGTH('dbo.Schedules', 'DeletedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Schedules ADD DeletedAt datetime2 NULL;
END;

IF COL_LENGTH('dbo.Schedules', 'DeletedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Schedules ADD DeletedBy nvarchar(max) NULL;
END;

IF COL_LENGTH('dbo.Schedules', 'DayOfMonth') IS NULL
BEGIN
    ALTER TABLE dbo.Schedules ADD DayOfMonth int NULL;
END;

IF COL_LENGTH('dbo.Schedules', 'DaysOfWeek') IS NULL
BEGIN
    ALTER TABLE dbo.Schedules ADD DaysOfWeek nvarchar(64) NULL;
END;
"@

    $tempFile = New-TemporaryFile
    try {
        Set-Content -Path $tempFile -Value $sql -Encoding UTF8
        & sqlcmd -S $Server -d $Database -U $User -P $env:TASKSCHEDULER_SQL_PASSWORD -b -i $tempFile
        if ($LASTEXITCODE -ne 0) {
            throw "sqlcmd failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}

$PublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
$apiBaseUrl = Join-Url $PublicBaseUrl 'Service/api/'
$hubUrl = Join-Url $PublicBaseUrl 'Service/taskHub'
$reactBasePath = Get-ReactBasePath -BaseUrl $PublicBaseUrl

$clientProject = Join-Path $RepositoryRoot 'TaskScheduler.Client\TaskScheduler.Client.csproj'
$apiProject = Join-Path $RepositoryRoot 'TaskScheduler.API\TaskScheduler.API.csproj'
$reactProject = Join-Path $RepositoryRoot 'TaskScheduler.React'
$reactDist = Join-Path $reactProject 'dist'
$publishRoot = Join-Path $RepositoryRoot (Join-Path 'artifacts\deploy' (Get-Date -Format 'yyyyMMdd-HHmmss'))
$clientPublish = Join-Path $publishRoot 'Client'
$apiPublish = Join-Path $publishRoot 'Service'

$clientTarget = Join-Path $TargetRoot 'Client'
$apiTarget = Join-Path $TargetRoot 'Service'
$reactTarget = Join-Path $TargetRoot 'React'

Write-Host "Repository: $RepositoryRoot"
Write-Host "Target:     $TargetRoot"
Write-Host "Public URL: $PublicBaseUrl"
Write-Host "React base: $reactBasePath"
Write-Host "API URL:    $apiBaseUrl"
Write-Host "Hub URL:    $hubUrl"

Require-Command 'dotnet'
Require-Command 'npm'
Require-Command 'robocopy'

foreach ($path in @($clientProject, $apiProject, $reactProject)) {
    if (-not (Test-Path $path)) {
        throw "Required path does not exist: $path"
    }
}

New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null
New-Item -ItemType Directory -Force -Path $publishRoot | Out-Null

Write-Step 'Publishing MVC client'
Invoke-External -FilePath 'dotnet' -Arguments @('publish', $clientProject, '-c', 'Release', '-o', $clientPublish)
Write-ClientConfiguration -ClientTarget $clientPublish -ApiBaseUrl $apiBaseUrl
Set-AppOffline -Path $clientPublish
Set-AppOffline -Path $clientTarget
try {
    Invoke-RobocopyMirror -Source $clientPublish -Destination $clientTarget
}
finally {
    Clear-AppOffline -Path $clientTarget
    Clear-AppOffline -Path $clientPublish
}

Write-Step 'Publishing API service'
Invoke-External -FilePath 'dotnet' -Arguments @('publish', $apiProject, '-c', 'Release', '-o', $apiPublish)
Write-ApiDevelopmentConfiguration -ApiTarget $apiPublish
Set-AppOffline -Path $apiPublish
Set-AppOffline -Path $apiTarget
try {
    Invoke-RobocopyMirror -Source $apiPublish -Destination $apiTarget
}
finally {
    Clear-AppOffline -Path $apiTarget
    Clear-AppOffline -Path $apiPublish
}

Write-Step 'Building React workspace'
$viteEnvKeys = @(
    'VITE_TASKSCHEDULER_APP_BASE_PATH',
    'VITE_TASKSCHEDULER_API_BASE_URL',
    'VITE_TASKSCHEDULER_HUB_URL'
)
$previousEnv = @{}

foreach ($key in $viteEnvKeys) {
    $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}

try {
    $env:VITE_TASKSCHEDULER_APP_BASE_PATH = $reactBasePath
    $env:VITE_TASKSCHEDULER_API_BASE_URL = $apiBaseUrl
    $env:VITE_TASKSCHEDULER_HUB_URL = $hubUrl

    if (-not $SkipReactLint) {
        Invoke-External -FilePath 'npm' -Arguments @('run', 'lint') -WorkingDirectory $reactProject
    }

    Invoke-External -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $reactProject
}
finally {
    foreach ($key in $viteEnvKeys) {
        [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], 'Process')
    }
}

Write-Step 'Copying React dist'
Invoke-RobocopyMirror -Source $reactDist -Destination $reactTarget

$deployedReactWebConfig = Join-Path $reactTarget 'web.config'
if ((Test-Path $deployedReactWebConfig) -and $DisableReactWebConfig) {
    Move-Item -Path $deployedReactWebConfig -Destination (Join-Path $reactTarget 'web.config.disabled') -Force
    Write-Warning 'React web.config was disabled after copy. Use this only when the host cannot use the built-in httpErrors fallback and you are replacing it with physical fallback routes or HashRouter.'
}

if ($DisableReactWebConfig -and $ReactPhysicalFallbackRoutes.Count -gt 0) {
    Write-Step 'Creating React physical route fallbacks'
    Write-ReactPhysicalFallbackRoutes -ReactTarget $reactTarget -Routes $ReactPhysicalFallbackRoutes
}

Write-Step 'Writing root landing page'
Write-RootLandingPage -RootPath $TargetRoot -BaseUrl $PublicBaseUrl

if ($PatchProductionSchema) {
    Write-Step 'Applying guarded production schema patch'
    Invoke-ProductionSchemaPatch -Server $SqlServer -Database $SqlDatabase -User $SqlUser
}

if (-not $SkipValidation) {
    Invoke-PostDeployValidation -BaseUrl $PublicBaseUrl -HasReactFallback:(-not $DisableReactWebConfig)
}

Write-Host "`nDeployment complete." -ForegroundColor Green
Write-Host "React: $(Join-Url $PublicBaseUrl 'React/')"
Write-Host "Client: $(Join-Url $PublicBaseUrl 'Client/')"
Write-Host "API:    $(Join-Url $PublicBaseUrl 'Service/swagger')"
