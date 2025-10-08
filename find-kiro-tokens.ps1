# Search for all Kiro Token files in the system
# PowerShell Script

Write-Host "=== Searching for Kiro Token Files ===" -ForegroundColor Cyan
Write-Host ""

$searchPaths = @(
    "$env:USERPROFILE\.aws",
    "$env:APPDATA\Code",
    "$env:APPDATA\Cursor",
    "$env:LOCALAPPDATA\Programs\cursor",
    "$env:USERPROFILE\AppData\Roaming\Code",
    "$env:USERPROFILE\.vscode",
    "$env:USERPROFILE\.cursor"
)

$foundTokens = @()

Write-Host "Searching directories..." -ForegroundColor Yellow

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "  Checking: $path" -ForegroundColor Gray
        
        Get-ChildItem -Path $path -Recurse -Filter "*.json" -ErrorAction SilentlyContinue | 
        ForEach-Object {
            try {
                $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
                if ($content -match "accessToken.*refreshToken" -or 
                    $content -match "codewhisperer" -or 
                    $content -match "kiro" -or
                    $content -match "profileArn") {
                    
                    $json = $content | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($json.accessToken) {
                        $expiresAt = if ($json.expiresAt) { 
                            try { [DateTime]::Parse($json.expiresAt) } 
                            catch { $null } 
                        } else { $null }
                        
                        $isExpired = if ($expiresAt) { 
                            $expiresAt -lt (Get-Date) 
                        } else { 
                            $true 
                        }
                        
                        $foundTokens += [PSCustomObject]@{
                            File = $_.FullName
                            Size = $_.Length
                            Modified = $_.LastWriteTime
                            ExpiresAt = if ($expiresAt) { $expiresAt.ToString("yyyy-MM-dd HH:mm:ss") } else { "Unknown" }
                            IsExpired = $isExpired
                            HasRefreshToken = [bool]$json.refreshToken
                        }
                    }
                }
            } catch {
                # Skip files that cannot be read
            }
        }
    }
}

Write-Host ""
Write-Host "=== Search Results ===" -ForegroundColor Cyan
Write-Host "Found $($foundTokens.Count) Token file(s)" -ForegroundColor Green
Write-Host ""

if ($foundTokens.Count -eq 0) {
    Write-Host "No Kiro Token files found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Suggestions:" -ForegroundColor Yellow
    Write-Host "1. Check if Kiro IDE or Amazon Q plugin is installed"
    Write-Host "2. Try logging in to the IDE again"
    Write-Host "3. Or use other Providers (run switch-provider.bat)"
} else {
    # Sort by expiration, valid tokens first
    $foundTokens | Sort-Object IsExpired, @{Expression={[DateTime]$_.ExpiresAt}; Descending=$true} | 
    ForEach-Object {
        $status = if ($_.IsExpired) { "Expired" } else { "Valid" }
        $statusIcon = if ($_.IsExpired) { "[X]" } else { "[OK]" }
        $color = if ($_.IsExpired) { "Red" } else { "Green" }
        
        Write-Host "--------------------------------------" -ForegroundColor Gray
        Write-Host "Status: $statusIcon $status" -ForegroundColor $color
        Write-Host "File: $($_.File)"
        Write-Host "Modified: $($_.Modified)"
        Write-Host "Expires: $($_.ExpiresAt)"
        $hasRefresh = if ($_.HasRefreshToken) { "Yes" } else { "No" }
        Write-Host "Has RefreshToken: $hasRefresh"
    }
    
    Write-Host ""
    Write-Host "--------------------------------------" -ForegroundColor Gray
    
    # Find the best token
    $bestToken = $foundTokens | 
        Where-Object { -not $_.IsExpired } | 
        Sort-Object @{Expression={[DateTime]$_.ExpiresAt}; Descending=$true} | 
        Select-Object -First 1
    
    if ($bestToken) {
        Write-Host ""
        Write-Host "Best Token to use:" -ForegroundColor Green
        Write-Host $bestToken.File
        Write-Host ""
        Write-Host "Run this command to copy to default location:" -ForegroundColor Yellow
        $targetPath = "$env:USERPROFILE\.aws\sso\cache\kiro-auth-token.json"
        Write-Host "Copy-Item '$($bestToken.File)' '$targetPath' -Force"
    } else {
        Write-Host ""
        Write-Host "All found tokens are expired" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Latest token:" -ForegroundColor Yellow
        $latestToken = $foundTokens | Sort-Object Modified -Descending | Select-Object -First 1
        Write-Host $latestToken.File
        Write-Host "Last modified: $($latestToken.Modified)"
        Write-Host ""
        Write-Host "If this token expired recently, try:" -ForegroundColor Cyan
        Write-Host "node check-tokens.js  # System will attempt auto-refresh"
    }
}

Write-Host ""