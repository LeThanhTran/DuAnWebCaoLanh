param(
    [string]$SourceConnectionString = "Server=.;Database=WardWebsite;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;",
    [string]$TargetConnectionString = "",
    [string]$SubscriptionId = "a0084493-feac-4969-b97c-c52a44072421",
    [string]$ResourceGroup = "rg-caolanhdemo-sea",
    [string]$WebAppName = "caolanhdemo-api-8521",
    [string[]]$IncludeTables = @(),
    [string[]]$ExcludeTables = @("__EFMigrationsHistory"),
    [switch]$SkipClearTarget,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Data

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

    throw "Azure CLI not found. Install Azure CLI first or provide -TargetConnectionString directly."
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

function Resolve-TargetConnectionString {
    param(
        [string]$ProvidedConnectionString,
        [string]$SubscriptionId,
        [string]$ResourceGroup,
        [string]$WebAppName
    )

    if (-not [string]::IsNullOrWhiteSpace($ProvidedConnectionString)) {
        return $ProvidedConnectionString
    }

    $script:AzCmdPath = Get-AzCmdPath
    & $script:AzCmdPath config set core.only_show_errors=true | Out-Null
    & $script:AzCmdPath config set core.disable_confirm_prompt=true | Out-Null

    Invoke-Az -AzArguments @("account", "show", "-o", "none") | Out-Null
    Invoke-Az -AzArguments @("account", "set", "--subscription", $SubscriptionId) | Out-Null

    $settingsJson = Invoke-Az -AzArguments @(
        "webapp", "config", "appsettings", "list",
        "--resource-group", $ResourceGroup,
        "--name", $WebAppName,
        "-o", "json"
    )

    $settings = $settingsJson | ConvertFrom-Json
    $conn = ($settings | Where-Object { $_.name -eq 'ConnectionStrings__DefaultConnection' } | Select-Object -First 1).value

    if ([string]::IsNullOrWhiteSpace($conn)) {
        throw "Could not resolve ConnectionStrings__DefaultConnection from Azure App Settings."
    }

    return $conn
}

function New-SqlConnection {
    param(
        [string]$ConnectionString
    )

    $connection = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)
    $connection.Open()
    return $connection
}

function Invoke-SqlQuery {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$Query,
        [hashtable]$Parameters
    )

    $command = $Connection.CreateCommand()
    $command.CommandText = $Query
    $command.CommandTimeout = 0

    if ($Parameters) {
        foreach ($key in $Parameters.Keys) {
            $null = $command.Parameters.AddWithValue("@$key", $Parameters[$key])
        }
    }

    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($command)
    $table = New-Object System.Data.DataTable
    $null = $adapter.Fill($table)

    $command.Dispose()
    return ,$table
}

function Invoke-SqlScalar {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$Query,
        [hashtable]$Parameters
    )

    $command = $Connection.CreateCommand()
    $command.CommandText = $Query
    $command.CommandTimeout = 0

    if ($Parameters) {
        foreach ($key in $Parameters.Keys) {
            $null = $command.Parameters.AddWithValue("@$key", $Parameters[$key])
        }
    }

    $result = $command.ExecuteScalar()
    $command.Dispose()
    return $result
}

function Invoke-SqlNonQuery {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$Query
    )

    $command = $Connection.CreateCommand()
    $command.CommandText = $Query
    $command.CommandTimeout = 0
    $affected = $command.ExecuteNonQuery()
    $command.Dispose()
    return $affected
}

function Get-UserTables {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection
    )

    $query = @"
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name;
"@

    return Invoke-SqlQuery -Connection $Connection -Query $query
}

function Get-SourceColumns {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$SchemaName,
        [string]$TableName
    )

    $query = @"
SELECT c.name AS ColumnName, c.column_id
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
INNER JOIN sys.columns c ON c.object_id = t.object_id
WHERE s.name = @SchemaName AND t.name = @TableName
ORDER BY c.column_id;
"@

    return Invoke-SqlQuery -Connection $Connection -Query $query -Parameters @{
        SchemaName = $SchemaName
        TableName = $TableName
    }
}

function Get-TargetInsertableColumns {
    param(
        [System.Data.SqlClient.SqlConnection]$Connection,
        [string]$SchemaName,
        [string]$TableName
    )

    $query = @"
SELECT c.name AS ColumnName, c.column_id, c.is_identity
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
INNER JOIN sys.columns c ON c.object_id = t.object_id
WHERE s.name = @SchemaName
  AND t.name = @TableName
  AND c.is_computed = 0
  AND c.system_type_id <> 189
ORDER BY c.column_id;
"@

    return Invoke-SqlQuery -Connection $Connection -Query $query -Parameters @{
        SchemaName = $SchemaName
        TableName = $TableName
    }
}

function Test-TableMatch {
    param(
        [string]$SchemaName,
        [string]$TableName,
        [string[]]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ([string]::IsNullOrWhiteSpace($pattern)) {
            continue
        }

        $normalized = $pattern.Trim() -replace '\]\s*\.\s*\[', '.'
        $normalized = $normalized.Trim('[', ']')

        if ($normalized.Contains('.')) {
            if (("$SchemaName.$TableName").Equals($normalized, [System.StringComparison]::OrdinalIgnoreCase)) {
                return $true
            }
        }
        else {
            if ($TableName.Equals($normalized, [System.StringComparison]::OrdinalIgnoreCase)) {
                return $true
            }
        }
    }

    return $false
}

function Get-SafeQualifiedTableName {
    param(
        [string]$SchemaName,
        [string]$TableName
    )

    $safeSchema = $SchemaName.Replace(']', ']]')
    $safeTable = $TableName.Replace(']', ']]')
    return "[$safeSchema].[$safeTable]"
}

$targetConnResolved = Resolve-TargetConnectionString `
    -ProvidedConnectionString $TargetConnectionString `
    -SubscriptionId $SubscriptionId `
    -ResourceGroup $ResourceGroup `
    -WebAppName $WebAppName

Write-Output "Source SQL: $SourceConnectionString"
Write-Output "Target SQL: resolved from parameters/app settings"

$sourceConnection = $null
$targetConnection = $null
$candidateTables = @()
$constraintsDisabled = $false

try {
    $sourceConnection = New-SqlConnection -ConnectionString $SourceConnectionString
    $targetConnection = New-SqlConnection -ConnectionString $targetConnResolved

    $sourceTables = Get-UserTables -Connection $sourceConnection
    $targetTables = Get-UserTables -Connection $targetConnection

    $targetSet = @{}
    foreach ($row in $targetTables.Rows) {
        $schemaName = [string]$row["SchemaName"]
        $tableName = [string]$row["TableName"]
        $key = ("{0}.{1}" -f $schemaName, $tableName).ToLowerInvariant()
        $targetSet[$key] = $true
    }

    foreach ($row in $sourceTables.Rows) {
        $schemaName = [string]$row["SchemaName"]
        $tableName = [string]$row["TableName"]
        $fullName = "{0}.{1}" -f $schemaName, $tableName
        $fullKey = $fullName.ToLowerInvariant()

        if (-not $targetSet.ContainsKey($fullKey)) {
            continue
        }

        if (Test-TableMatch -SchemaName $schemaName -TableName $tableName -Patterns $ExcludeTables) {
            continue
        }

        if ($IncludeTables.Count -gt 0 -and -not (Test-TableMatch -SchemaName $schemaName -TableName $tableName -Patterns $IncludeTables)) {
            continue
        }

        $candidateTables += [PSCustomObject]@{
            SchemaName = $schemaName
            TableName = $tableName
            FullName = $fullName
        }
    }

    if ($candidateTables.Count -eq 0) {
        throw "No matching tables were found between source and target."
    }

    Write-Output "Tables to sync: $($candidateTables.Count)"
    $candidateTables | ForEach-Object { Write-Output (" - {0}" -f $_.FullName) }

    if ($DryRun) {
        Write-Output "DryRun enabled. No data changes were made."
        return
    }

    Write-Output "[1/4] Disabling constraints"
    foreach ($table in $candidateTables) {
        $qualified = Get-SafeQualifiedTableName -SchemaName $table.SchemaName -TableName $table.TableName
        Invoke-SqlNonQuery -Connection $targetConnection -Query "ALTER TABLE $qualified NOCHECK CONSTRAINT ALL;" | Out-Null
    }
    $constraintsDisabled = $true

    if (-not $SkipClearTarget) {
        Write-Output "[2/4] Clearing target table data"
        foreach ($table in $candidateTables) {
            $qualified = Get-SafeQualifiedTableName -SchemaName $table.SchemaName -TableName $table.TableName
            Invoke-SqlNonQuery -Connection $targetConnection -Query "DELETE FROM $qualified;" | Out-Null
        }
    }
    else {
        Write-Output "[2/4] SkipClearTarget enabled. Existing rows will be kept and new rows will be appended."
    }

    Write-Output "[3/4] Copying rows"
    foreach ($table in $candidateTables) {
        $schemaName = $table.SchemaName
        $tableName = $table.TableName
        $qualified = Get-SafeQualifiedTableName -SchemaName $schemaName -TableName $tableName

        $rowCount = [int64](Invoke-SqlScalar -Connection $sourceConnection -Query "SELECT COUNT_BIG(1) FROM $qualified;")
        if ($rowCount -eq 0) {
            Write-Output " - $($table.FullName): 0 rows (skip)"
            continue
        }

        $sourceColumns = Get-SourceColumns -Connection $sourceConnection -SchemaName $schemaName -TableName $tableName
        $targetColumns = Get-TargetInsertableColumns -Connection $targetConnection -SchemaName $schemaName -TableName $tableName

        $targetColumnMap = @{}
        $identityColumnMap = @{}
        foreach ($col in $targetColumns.Rows) {
            $columnName = [string]$col["ColumnName"]
            $targetColumnMap[$columnName.ToLowerInvariant()] = $columnName
            if ([bool]$col["is_identity"]) {
                $identityColumnMap[$columnName.ToLowerInvariant()] = $true
            }
        }

        $selectedColumns = New-Object System.Collections.Generic.List[string]
        foreach ($sourceCol in $sourceColumns.Rows) {
            $sourceColumnName = [string]$sourceCol["ColumnName"]
            $sourceKey = $sourceColumnName.ToLowerInvariant()
            if ($targetColumnMap.ContainsKey($sourceKey)) {
                [void]$selectedColumns.Add($targetColumnMap[$sourceKey])
            }
        }

        if ($selectedColumns.Count -eq 0) {
            Write-Output " - $($table.FullName): no compatible columns (skip)"
            continue
        }

        $hasIdentity = $false
        foreach ($colName in $selectedColumns) {
            if ($identityColumnMap.ContainsKey($colName.ToLowerInvariant())) {
                $hasIdentity = $true
                break
            }
        }

        $safeColumnList = ($selectedColumns | ForEach-Object { "[{0}]" -f ($_.Replace(']', ']]')) }) -join ', '
        $selectSql = "SELECT $safeColumnList FROM $qualified;"

        $sourceCommand = $sourceConnection.CreateCommand()
        $sourceCommand.CommandText = $selectSql
        $sourceCommand.CommandTimeout = 0

        $identityEnabled = $false
        try {
            if ($hasIdentity) {
                Invoke-SqlNonQuery -Connection $targetConnection -Query "SET IDENTITY_INSERT $qualified ON;" | Out-Null
                $identityEnabled = $true
            }

            $reader = $sourceCommand.ExecuteReader()
            try {
                $bulkOptions = [System.Data.SqlClient.SqlBulkCopyOptions]::KeepIdentity
                if (-not $hasIdentity) {
                    $bulkOptions = [System.Data.SqlClient.SqlBulkCopyOptions]::Default
                }

                $bulkCopy = New-Object System.Data.SqlClient.SqlBulkCopy($targetConnection, $bulkOptions, $null)
                $bulkCopy.DestinationTableName = $qualified
                $bulkCopy.BatchSize = 5000
                $bulkCopy.BulkCopyTimeout = 0

                foreach ($columnName in $selectedColumns) {
                    $null = $bulkCopy.ColumnMappings.Add($columnName, $columnName)
                }

                $bulkCopy.WriteToServer($reader)
                $bulkCopy.Close()
            }
            finally {
                $reader.Close()
            }

            Write-Output " - $($table.FullName): copied $rowCount row(s)"
        }
        finally {
            if ($identityEnabled) {
                Invoke-SqlNonQuery -Connection $targetConnection -Query "SET IDENTITY_INSERT $qualified OFF;" | Out-Null
            }

            $sourceCommand.Dispose()
        }
    }

    Write-Output "[4/4] Re-enabling constraints"
    foreach ($table in $candidateTables) {
        $qualified = Get-SafeQualifiedTableName -SchemaName $table.SchemaName -TableName $table.TableName
        Invoke-SqlNonQuery -Connection $targetConnection -Query "ALTER TABLE $qualified WITH CHECK CHECK CONSTRAINT ALL;" | Out-Null
    }
    $constraintsDisabled = $false

    Write-Output "Done. Data sync from local SQL to Azure SQL completed."
}
finally {
    if ($constraintsDisabled -and $targetConnection -and $targetConnection.State -eq [System.Data.ConnectionState]::Open) {
        Write-Output "Attempting to re-enable constraints after failure..."
        foreach ($table in $candidateTables) {
            try {
                $qualified = Get-SafeQualifiedTableName -SchemaName $table.SchemaName -TableName $table.TableName
                Invoke-SqlNonQuery -Connection $targetConnection -Query "ALTER TABLE $qualified WITH CHECK CHECK CONSTRAINT ALL;" | Out-Null
            }
            catch {
                Write-Output "Warning: could not re-enable constraints for $($table.FullName): $($_.Exception.Message)"
            }
        }
    }

    if ($sourceConnection) {
        $sourceConnection.Dispose()
    }

    if ($targetConnection) {
        $targetConnection.Dispose()
    }
}
