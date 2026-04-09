param(
    [string]$SubscriptionId = "a0084493-feac-4969-b97c-c52a44072421",
    [string]$Location = "southeastasia",
    [string]$Prefix = "caolanhdemo",
    [string]$ResourceGroup = "",
    [string]$SqlAdminUser = "sqladmincl",
    [PSCredential]$SqlAdminCredential = $null,
    [string]$JwtSecret = "",
    [string]$AvatarStorageAccountName = "",
    [string]$AvatarContainerName = "avatars",
    [switch]$SkipAvatarBlobSetup,
    [switch]$ForceCleanDeploy
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
        [string[]]$AzArguments
    )

    & $script:AzCmdPath @AzArguments
    if ($LASTEXITCODE -ne 0) {
        throw "az $($AzArguments -join ' ') failed."
    }
}

function New-RandomPassword {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789_-'
    $buffer = New-Object char[] 24
    $random = [System.Random]::new()
    for ($i = 0; $i -lt $buffer.Length; $i++) {
        $buffer[$i] = $chars[$random.Next(0, $chars.Length)]
    }

    return -join $buffer
}

function New-JwtSecret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Convert-SecureStringToPlainText {
    param(
        [SecureString]$Value
    )

    if ($null -eq $Value) {
        return ""
    }

    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$FriendlyName
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FriendlyName failed."
    }
}

$AzCmdPath = Get-AzCmdPath
Write-Output "Using Azure CLI: $AzCmdPath"

& $AzCmdPath config set core.only_show_errors=true | Out-Null
& $AzCmdPath config set core.disable_confirm_prompt=true | Out-Null

& $AzCmdPath account show -o none 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI is not logged in. Run: az login --use-device-code"
}

Invoke-Az -AzArguments @("account", "set", "--subscription", $SubscriptionId) | Out-Null
Write-Output "Using subscription context:"
Invoke-Az -AzArguments @("account", "show", "--query", "{name:name,id:id,user:user.name}", "-o", "table")

if ([string]::IsNullOrWhiteSpace($ResourceGroup)) {
    $ResourceGroup = "rg-$Prefix-sea"
}

$sqlAdminSecretPlainText = ""
if ($null -ne $SqlAdminCredential) {
    $credentialUser = $SqlAdminCredential.UserName
    if (-not [string]::IsNullOrWhiteSpace($credentialUser)) {
        if (-not [string]::IsNullOrWhiteSpace($SqlAdminUser) -and $SqlAdminUser -ne $credentialUser) {
            Write-Output "Info: -SqlAdminCredential username overrides -SqlAdminUser."
        }

        $SqlAdminUser = $credentialUser
    }

    $sqlAdminSecretPlainText = Convert-SecureStringToPlainText -Value $SqlAdminCredential.Password
}

if ([string]::IsNullOrWhiteSpace($sqlAdminSecretPlainText)) {
    $sqlAdminSecretPlainText = New-RandomPassword
}

if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = New-JwtSecret
}

$suffix = Get-Random -Minimum 1000 -Maximum 9999
$prefixSafe = ($Prefix.ToLower() -replace '[^a-z0-9-]', '')
$prefixSql = ($Prefix.ToLower() -replace '[^a-z0-9]', '')

if ($prefixSafe.Length -lt 3) {
    $prefixSafe = 'warddemo'
}

if ($prefixSql.Length -lt 3) {
    $prefixSql = 'warddemo'
}

$sqlSuffix = Get-Random -Minimum 10000 -Maximum 99999
$sqlServerName = "$prefixSql$sqlSuffix"
if ($sqlServerName.Length -gt 60) {
    $sqlServerName = $sqlServerName.Substring(0, 60)
}

$appServicePlan = "asp-$prefixSafe-$suffix"
$webAppName = "$prefixSafe-api-$suffix"
$webAppName = $webAppName.ToLower()

if ($webAppName.Length -gt 58) {
    $webAppName = $webAppName.Substring(0, 58)
}

$dbName = "WardWebsiteDb"
$avatarStorageConnectionString = ""
$avatarStorageAccount = ""

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot "WardWebsite.Frontend"
$apiPath = Join-Path $repoRoot "WardWebsite.API"
$artifactPath = Join-Path $repoRoot "artifacts"
$publishPath = Join-Path $artifactPath "api-publish"
$zipPath = Join-Path $artifactPath "api-publish.zip"
$summaryPath = Join-Path $artifactPath "azure-deploy-summary.txt"

New-Item -ItemType Directory -Path $artifactPath -Force | Out-Null

Write-Output "[1/10] Building frontend"
Push-Location $frontendPath
try {
    Invoke-Checked -FilePath "npm" -Arguments @("run", "build") -FriendlyName "Frontend build"
}
finally {
    Pop-Location
}

$distPath = Join-Path $frontendPath "dist"
$webRootPath = Join-Path $apiPath "wwwroot"
New-Item -ItemType Directory -Path $webRootPath -Force | Out-Null

foreach ($item in @("assets", "index.html", "robots.txt", "sitemap.xml")) {
    $target = Join-Path $webRootPath $item
    if (Test-Path $target) {
        Remove-Item -Path $target -Recurse -Force
    }
}

Write-Output "[2/10] Copying frontend build to API wwwroot"
Copy-Item -Path (Join-Path $distPath "*") -Destination $webRootPath -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\avatars") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\media") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $webRootPath "uploads\forms") -Force | Out-Null

Write-Output "[3/10] Publishing API"
if (Test-Path $publishPath) {
    Remove-Item -Path $publishPath -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Push-Location $apiPath
try {
    Invoke-Checked -FilePath "dotnet" -Arguments @("publish", "-c", "Release", "-o", $publishPath) -FriendlyName "API publish"
}
finally {
    Pop-Location
}

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

Write-Output "[4/10] Creating resource group"
Invoke-Az -AzArguments @("group", "create", "--name", $ResourceGroup, "--location", $Location, "-o", "none") | Out-Null

Write-Output "[5/10] Creating Azure SQL server and database"
Invoke-Az -AzArguments @("sql", "server", "create", "--name", $sqlServerName, "--resource-group", $ResourceGroup, "--location", $Location, "--admin-user", $SqlAdminUser, "--admin-password", $sqlAdminSecretPlainText, "-o", "none") | Out-Null
Invoke-Az -AzArguments @("sql", "server", "firewall-rule", "create", "--resource-group", $ResourceGroup, "--server", $sqlServerName, "--name", "AllowAzureServices", "--start-ip-address", "0.0.0.0", "--end-ip-address", "0.0.0.0", "-o", "none") | Out-Null

try {
    $currentIp = (Invoke-RestMethod -Uri "https://api.ipify.org").ToString().Trim()
    if ($currentIp) {
        Invoke-Az -AzArguments @("sql", "server", "firewall-rule", "create", "--resource-group", $ResourceGroup, "--server", $sqlServerName, "--name", "AllowCurrentClient", "--start-ip-address", $currentIp, "--end-ip-address", $currentIp, "-o", "none") | Out-Null
    }
}
catch {
    Write-Output "Warning: Could not add current client IP firewall rule."
}

Invoke-Az -AzArguments @("sql", "db", "create", "--resource-group", $ResourceGroup, "--server", $sqlServerName, "--name", $dbName, "--service-objective", "Basic", "--backup-storage-redundancy", "Local", "-o", "none") | Out-Null

Write-Output "[6/10] Creating App Service plan and Web App"
Invoke-Az -AzArguments @("appservice", "plan", "create", "--name", $appServicePlan, "--resource-group", $ResourceGroup, "--location", $Location, "--sku", "B1", "--is-linux", "-o", "none") | Out-Null
Invoke-Az -AzArguments @("webapp", "create", "--name", $webAppName, "--resource-group", $ResourceGroup, "--plan", $appServicePlan, "--runtime", "DOTNETCORE:8.0", "-o", "none") | Out-Null

if (-not $SkipAvatarBlobSetup) {
    Write-Output "[7/10] Creating Storage account for avatars"

    if ([string]::IsNullOrWhiteSpace($AvatarStorageAccountName)) {
        $storageBase = "$prefixSql$(Get-Random -Minimum 10000 -Maximum 99999)"
        if ($storageBase.Length -gt 22) {
            $storageBase = $storageBase.Substring(0, 22)
        }

        $AvatarStorageAccountName = "${storageBase}sa"
    }

    $AvatarStorageAccountName = ($AvatarStorageAccountName.ToLower() -replace '[^a-z0-9]', '')
    if ($AvatarStorageAccountName.Length -lt 3 -or $AvatarStorageAccountName.Length -gt 24) {
        throw "AvatarStorageAccountName must be 3-24 lowercase letters or numbers."
    }

    $AvatarContainerName = ($AvatarContainerName.ToLower() -replace '[^a-z0-9-]', '')
    if ([string]::IsNullOrWhiteSpace($AvatarContainerName)) {
        $AvatarContainerName = "avatars"
    }

    $avatarStorageAccount = $AvatarStorageAccountName

    Invoke-Az -AzArguments @(
        "storage", "account", "create",
        "--name", $avatarStorageAccount,
        "--resource-group", $ResourceGroup,
        "--location", $Location,
        "--sku", "Standard_LRS",
        "--kind", "StorageV2",
        "--allow-blob-public-access", "true",
        "-o", "none"
    ) | Out-Null

    $avatarStorageKey = (& $AzCmdPath storage account keys list --resource-group $ResourceGroup --account-name $avatarStorageAccount --query "[0].value" -o tsv).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($avatarStorageKey)) {
        throw "Failed to retrieve storage account key for avatar storage."
    }

    Invoke-Az -AzArguments @(
        "storage", "container", "create",
        "--name", $AvatarContainerName,
        "--account-name", $avatarStorageAccount,
        "--account-key", $avatarStorageKey,
        "--public-access", "blob",
        "-o", "none"
    ) | Out-Null

    $avatarStorageConnectionString = (& $AzCmdPath storage account show-connection-string --name $avatarStorageAccount --resource-group $ResourceGroup --query connectionString -o tsv).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($avatarStorageConnectionString)) {
        throw "Failed to retrieve avatar storage connection string."
    }
}
else {
    Write-Output "[7/10] Skip avatar blob setup (using local avatar storage)"
}

$connectionString = "Server=tcp:$sqlServerName.database.windows.net,1433;Initial Catalog=$dbName;Persist Security Info=False;User ID=$SqlAdminUser;Password=$sqlAdminSecretPlainText;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

Write-Output "[8/10] Applying app settings"
$appSettings = @(
    "ASPNETCORE_ENVIRONMENT=Production",
    "ConnectionStrings__DefaultConnection=$connectionString",
    "Jwt__Secret=$JwtSecret",
    "Jwt__Issuer=WardWebsite",
    "Jwt__Audience=WardWebsiteUsers",
    "Swagger__Enabled=true",
    "Security__RequireHttps=true",
    "Security__SeedDefaultUsers=true",
    "Cors__AllowedOrigins__0=https://$webAppName.azurewebsites.net",
    "AvatarStorage__LocalBaseUrl=https://$webAppName.azurewebsites.net"
)

if (-not [string]::IsNullOrWhiteSpace($avatarStorageConnectionString)) {
    $appSettings += @(
        "AvatarStorage__Provider=AzureBlob",
        "AvatarStorage__AzureBlob__ConnectionString=$avatarStorageConnectionString",
        "AvatarStorage__AzureBlob__ContainerName=$AvatarContainerName",
        "AvatarStorage__AzureBlob__PathPrefix=avatars"
    )
}
else {
    $appSettings += "AvatarStorage__Provider=Local"
}

$appSettingsArgs = @("webapp", "config", "appsettings", "set", "--resource-group", $ResourceGroup, "--name", $webAppName, "--settings")
$appSettingsArgs += $appSettings
$appSettingsArgs += @("-o", "none")
Invoke-Az -AzArguments $appSettingsArgs | Out-Null

$cleanDeployValue = if ($ForceCleanDeploy) { "true" } else { "false" }

Write-Output "[9/10] Deploying package"
if (-not $ForceCleanDeploy) {
    Write-Output "Deploy mode uses --clean false to preserve uploaded files under wwwroot/uploads."
}
Invoke-Az -AzArguments @("webapp", "deploy", "--resource-group", $ResourceGroup, "--name", $webAppName, "--src-path", $zipPath, "--type", "zip", "--clean", $cleanDeployValue, "--track-status", "false", "-o", "none") | Out-Null

Write-Output "[10/10] Final summary"
$appUrl = "https://$webAppName.azurewebsites.net"
$avatarStorageMode = if ([string]::IsNullOrWhiteSpace($avatarStorageConnectionString)) { "Local" } else { "AzureBlob" }

@(
    "APP_URL=$appUrl",
    "RESOURCE_GROUP=$ResourceGroup",
    "LOCATION=$Location",
    "WEB_APP_NAME=$webAppName",
    "APP_SERVICE_PLAN=$appServicePlan",
    "SQL_SERVER=$sqlServerName",
    "SQL_DATABASE=$dbName",
    "SQL_ADMIN_USER=$SqlAdminUser",
    "SQL_ADMIN_PASSWORD=<REDACTED>",
    "SUBSCRIPTION_ID=$SubscriptionId",
    "AVATAR_STORAGE_MODE=$avatarStorageMode",
    "AVATAR_STORAGE_ACCOUNT=$avatarStorageAccount",
    "AVATAR_CONTAINER=$AvatarContainerName"
) | Set-Content -Path $summaryPath -Encoding UTF8

Write-Output "Deployment completed."
Write-Output "APP URL: $appUrl"
Write-Output "Summary file: $summaryPath"
