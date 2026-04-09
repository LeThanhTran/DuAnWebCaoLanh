param(
    [string]$ApiProjectPath = "WardWebsite.API",
    [string]$FrontendProjectPath = "WardWebsite.Frontend"
)

$ErrorActionPreference = 'Stop'

Write-Output "[1/4] Build API (Release)"
Push-Location $ApiProjectPath
try {
    dotnet build -c Release | Out-Host
}
finally {
    Pop-Location
}

Write-Output "[2/4] Build Frontend"
Push-Location $FrontendProjectPath
try {
    npm run build | Out-Host
}
finally {
    Pop-Location
}

Write-Output "[3/4] API runtime smoke check (if port 5000 is listening)"
$listener = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    try {
        $swagger = Invoke-RestMethod -Method Get -Uri 'http://localhost:5000/swagger/v1/swagger.json'
        Write-Output "Swagger title: $($swagger.info.title)"
        Write-Output "Swagger bearer enabled: $($null -ne $swagger.components.securitySchemes.Bearer)"
    }
    catch {
        Write-Output "Warning: API is running but swagger check failed: $($_.Exception.Message)"
    }
}
else {
    Write-Output "Skip API smoke: no process listening on port 5000"
}

Write-Output "[4/4] Done"
