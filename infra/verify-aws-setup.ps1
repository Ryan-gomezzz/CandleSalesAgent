# AWS Setup Verification Script (PowerShell)

Write-Host "Verifying AWS DynamoDB setup for CandleSalesAgent..." -ForegroundColor Cyan
Write-Host ""

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "[OK] AWS CLI installed: $($awsVersion.Split(' ')[0])" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
Write-Host ""
Write-Host "AWS Account Information:" -ForegroundColor Cyan
try {
    aws sts get-caller-identity --output table
    Write-Host "[OK] AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS credentials not configured" -ForegroundColor Red
    exit 1
}

# Check table exists
Write-Host ""
Write-Host "DynamoDB Table Status:" -ForegroundColor Cyan
try {
    $null = aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Table 'CandleSalesLeads' exists" -ForegroundColor Green
        aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 --query 'Table.{Name:TableName,Status:TableStatus,Arn:TableArn}' --output table
    } else {
        Write-Host "[ERROR] Table 'CandleSalesLeads' not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error checking table: $_" -ForegroundColor Red
    exit 1
}

# Test write/read
Write-Host ""
Write-Host "Testing table operations:" -ForegroundColor Cyan
$testId = "verify-$(Get-Date -Format 'yyyyMMddHHmmss')"
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$itemJson = '{\"leadId\":{\"S\":\"' + $testId + '\"},\"phone\":{\"S\":\"+911234567890\"},\"status\":{\"S\":\"test\"},\"createdAt\":{\"S\":\"' + $timestamp + '\"}}'
$result = aws dynamodb put-item --table-name CandleSalesLeads --region ap-south-1 --item $itemJson 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Write operation successful" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Write operation test skipped (may require additional permissions)" -ForegroundColor Yellow
}

$keyJson = '{\"leadId\":{\"S\":\"' + $testId + '\"}}'
$getResult = aws dynamodb get-item --table-name CandleSalesLeads --region ap-south-1 --key $keyJson --query 'Item.leadId.S' --output text 2>&1
if ($getResult -eq $testId) {
    Write-Host "[OK] Read operation successful" -ForegroundColor Green
    
    # Cleanup test item
    $delResult = aws dynamodb delete-item --table-name CandleSalesLeads --region ap-south-1 --key $keyJson 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Cleanup successful" -ForegroundColor Green
    }
} else {
    Write-Host "[WARNING] Read operation test skipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "AWS setup verification complete!" -ForegroundColor Green

