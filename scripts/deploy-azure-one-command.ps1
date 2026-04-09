param(
    [string]$SubscriptionId = "a0084493-feac-4969-b97c-c52a44072421",
    [string]$ResourceGroup = "rg-caolanhdemo-sea",
    [string]$WebAppName = "caolanhdemo-api-8521",
    [switch]$NoOpenAfterDeploy,
    [switch]$SyncDataFromLocalSql,
    [switch]$SkipHealthCheck,
    [switch]$DryRun,
    [switch]$ForceCleanDeploy,
    [string]$AvatarStorageConnectionString = "",
    [string]$AvatarContainerName = "avatars",
    [string]$AvatarPathPrefix = "avatars"
)

$ErrorActionPreference = 'Stop'

function Get-AzCmdPath {
    $cmd = Get-Command az -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "$env:ProgramFiles\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "${env:ProgramFiles(x86)}\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "$env:LocalAppData\Programs\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "Azure CLI not found. Install Azure CLI first."
}

function Invoke-Az {
    param(
        [string[]]$AzArguments,
        [switch]$CaptureOutput
    )

    if ($CaptureOutput) {
        $result = & $script:AzCmdPath @AzArguments
        if ($LASTEXITCODE -ne 0) {
            throw "az $($AzArguments -join ' ') failed."
        }

        return $result
    }

    & $script:AzCmdPath @AzArguments
    if ($LASTEXITCODE -ne 0) {
        throw "az $($AzArguments -join ' ') failed."
    }
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$FriendlyName
    )

    if ($DryRun) {
        Write-Output "[DryRun] $FriendlyName => $FilePath $($Arguments -join ' ')"
        return
    }

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FriendlyName failed."
    }
}

function Test-RequiredPath {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path $Path)) {
        throw "$Label not found: $Path"
    }
}

function Get-HttpStatusWithRetry {
    param(
        [string]$Url,
        [int]$MaxAttempts = 8,
        [int]$TimeoutSec = 30
    )

    $lastError = "Unknown"

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $statusCode = (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec).StatusCode
            return [PSCustomObject]@{
                Success = $true
                StatusCode = $statusCode
                Attempt = $attempt
                ErrorMessage = ""
            }
        }
        catch {
            if ($_.Exception.Response) {
                $lastError = "HTTP $([int]$_.Exception.Response.StatusCode)"
            }
            else {
                $lastError = $_.Exception.Message
            }

            Write-Output "Health probe attempt $attempt/$MaxAttempts failed for ${Url}: $lastError"
        }
    }

    return [PSCustomObject]@{
        Success = $false
        StatusCode = 0
        Attempt = $MaxAttempts
        ErrorMessage = $lastError
    }
}

$script:AzCmdPath = Get-AzCmdPath
Write-Output "Using Azure CLI: $script:AzCmdPath"

if (-not $DryRun) {
    & $script:AzCmdPath config set core.only_show_errors=true | Out-Null
    & $script:AzCmdPath config set core.disable_confirm_prompt=true | Out-Null

    & $script:AzCmdPath account show -o none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Azure CLI is not logged in. Starting device code login..."
        & $script:AzCmdPath login --use-device-code -o none
        if ($LASTEXITCODE -ne 0) {
            throw "Azure login failed."
        }
    }

    Invoke-Az -AzArguments @("account", "set", "--subscription", $SubscriptionId)
    Invoke-Az -AzArguments @("webapp", "show", "--resource-group", $ResourceGroup, "--name", $WebAppName, "-o", "none")
}
else {
    Write-Output "[DryRun] Skip Azure login/account checks"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot "WardWebsite.Frontend"
$apiPath = Join-Path $repoRoot "WardWebsite.API"
$artifactPath = Join-Path $repoRoot "artifacts"
$publishPath = Join-Path $artifactPath "api-publish"
$zipPath = Join-Path $artifactPath "api-publish.zip"
$summaryPath = Join-Path $artifactPath "azure-deploy-summary.txt"

Test-RequiredPath -Path $frontendPath -Label "Frontend project path"
Test-RequiredPath -Path $apiPath -Label "API project path"

New-Item -ItemType Directory -Path $artifactPath -Force | Out-Null

Write-Output "[1/6] Build frontend"
Push-Location $frontendPath
try {
    if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
        Invoke-Checked -FilePath "npm" -Arguments @("install") -FriendlyName "npm install"
    }

    Invoke-Checked -FilePath "npm" -Arguments @("run", "build") -FriendlyName "Frontend build"
}
finally {
    Pop-Location
}

$distPath = Join-Path $frontendPath "dist"
$webRootPath = Join-Path $apiPath "wwwroot"
Test-RequiredPath -Path $distPath -Label "Frontend dist output"
New-Item -ItemType Directory -Path $webRootPath -Force | Out-Null

Write-Output "[2/6] Copy frontend dist to API wwwroot"
if (-not $DryRun) {
    foreach ($item in @("assets", "index.html", "robots.txt", "sitemap.xml")) {
        $target = Join-Path $webRootPath $item
        if (Test-Path $target) {
            Remove-Item -Path $target -Recurse -Force
        }
    }

    Copy-Item -Path (Join-Path $distPath "*") -Destination $webRootPath -Recurse -Force
    New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\avatars") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\media") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\forms") -Force | Out-Null
}
else {
    Write-Output "[DryRun] Skip copying dist files"
}

Write-Output "[3/6] Publish API"
if (-not $DryRun) {
    if (Test-Path $publishPath) {
        Remove-Item -Path $publishPath -Recurse -Force
    }

    if (Test-Path $zipPath) {
        Remove-Item -Path $zipPath -Force
    }
}

Push-Location $apiPath
try {
    Invoke-Checked -FilePath "dotnet" -Arguments @("publish", "-c", "Release", "-o", $publishPath) -FriendlyName "API publish"
}
finally {
    Pop-Location
}

Write-Output "[4/6] Package publish output"
if (-not $DryRun) {
    $tarCmd = Get-Command tar -ErrorAction SilentlyContinue
    if ($tarCmd) {
        & $tarCmd.Source -a -c -f $zipPath -C $publishPath .
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to package publish output with tar."
        }
    }
    else {
        Compress-Archive -Path (Join-Path $publishPath "*") -DestinationPath $zipPath -Force
    }
}
else {
    Write-Output "[DryRun] Skip zip packaging"
}

if ($SyncDataFromLocalSql) {
    Write-Output "[Optional] Sync local SQL data to Azure SQL"
    $syncScriptPath = Join-Path $PSScriptRoot "sync-local-sql-to-azure.ps1"
    Test-RequiredPath -Path $syncScriptPath -Label "Sync script"

    $syncArgs = @(
        "-ExecutionPolicy", "Bypass",
        "-File", $syncScriptPath,
        "-SubscriptionId", $SubscriptionId,
        "-ResourceGroup", $ResourceGroup,
        "-WebAppName", $WebAppName
    )

    Invoke-Checked -FilePath "powershell" -Arguments $syncArgs -FriendlyName "Data sync"
}

$cleanDeployValue = if ($ForceCleanDeploy) { "true" } else { "false" }

if (-not $DryRun -and -not [string]::IsNullOrWhiteSpace($AvatarStorageConnectionString)) {
    Write-Output "[Optional] Configure avatar storage to Azure Blob"

    $avatarSettings = @(
        "AvatarStorage__Provider=AzureBlob",
        "AvatarStorage__AzureBlob__ConnectionString=$AvatarStorageConnectionString",
        "AvatarStorage__AzureBlob__ContainerName=$AvatarContainerName",
        "AvatarStorage__AzureBlob__PathPrefix=$AvatarPathPrefix"
    )

    $avatarSettingsArgs = @(
        "webapp", "config", "appsettings", "set",
        "--resource-group", $ResourceGroup,
        "--name", $WebAppName,
        "--settings"
    )
    $avatarSettingsArgs += $avatarSettings
    $avatarSettingsArgs += @("-o", "none")

    Invoke-Az -AzArguments $avatarSettingsArgs
}
elseif ($DryRun -and -not [string]::IsNullOrWhiteSpace($AvatarStorageConnectionString)) {
    Write-Output "[DryRun] Skip avatar storage app settings update"
}

Write-Output "[5/6] Deploy to Azure Web App"
if (-not $DryRun) {
    if (-not $ForceCleanDeploy) {
        Write-Output "Deploy mode uses --clean false to preserve uploaded files under wwwroot/uploads."
    }

    Invoke-Az -AzArguments @(
        "webapp", "deploy",
        "--resource-group", $ResourceGroup,
        "--name", $WebAppName,
        "--src-path", $zipPath,
        "--type", "zip",
        "--clean", $cleanDeployValue,
        "--track-status", "false",
        "-o", "none"
    )
}
else {
    Write-Output "[DryRun] Skip Azure deploy"
}

$appUrl = "https://$WebAppName.azurewebsites.net"
$swaggerUrl = "$appUrl/swagger"
$healthApi = "$appUrl/api/articles?page=1&pageSize=10"

Write-Output "[6/6] Post-deploy summary"
if (-not $DryRun) {
    $conn = ""
    try {
        $settingsJson = Invoke-Az -AzArguments @(
            "webapp", "config", "appsettings", "list",
            "--resource-group", $ResourceGroup,
            "--name", $WebAppName,
            "-o", "json"
        ) -CaptureOutput
        $settings = $settingsJson | ConvertFrom-Json
        $conn = ($settings | Where-Object { $_.name -eq 'ConnectionStrings__DefaultConnection' } | Select-Object -First 1).value
    }
    catch {
        Write-Output "Warning: Could not read app settings for summary file."
    }

    @(
        "APP_URL=$appUrl",
        "SWAGGER_URL=$swaggerUrl",
        "API_SAMPLE_URL=$healthApi",
        "RESOURCE_GROUP=$ResourceGroup",
        "WEB_APP_NAME=$WebAppName",
        "SUBSCRIPTION_ID=$SubscriptionId",
        "CONNECTION_STRING=$conn"
    ) | Set-Content -Path $summaryPath -Encoding UTF8

    if (-not $SkipHealthCheck) {
        $homeProbe = Get-HttpStatusWithRetry -Url $appUrl
        $swaggerProbe = Get-HttpStatusWithRetry -Url $swaggerUrl
        $apiProbe = Get-HttpStatusWithRetry -Url $healthApi

        if ($homeProbe.Success -and $swaggerProbe.Success -and $apiProbe.Success) {
            Write-Output "Health check => Home:$($homeProbe.StatusCode) Swagger:$($swaggerProbe.StatusCode) API:$($apiProbe.StatusCode)"
        }
        else {
            Write-Output "Warning: Health check failed. Home=$($homeProbe.StatusCode) Swagger=$($swaggerProbe.StatusCode) API=$($apiProbe.StatusCode)."
            Write-Output "Last errors => Home:'$($homeProbe.ErrorMessage)' Swagger:'$($swaggerProbe.ErrorMessage)' API:'$($apiProbe.ErrorMessage)'"
        }
    }

    if (-not $NoOpenAfterDeploy) {
        Start-Process $appUrl
    }
}

Write-Output "Done"
Write-Output "APP URL: $appUrl"
Write-Output "SWAGGER: $swaggerUrl"
Write-Output "Summary: $summaryPath"
