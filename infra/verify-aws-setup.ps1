# AWS Setup Verification Script (PowerShell)

Write-Host "🔍 Verifying AWS DynamoDB setup for CandleSalesAgent..." -ForegroundColor Cyan
Write-Host ""

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI installed: $($awsVersion.Split(' ')[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
Write-Host ""
Write-Host "📋 AWS Account Information:" -ForegroundColor Cyan
try {
    aws sts get-caller-identity --output table
    Write-Host "✅ AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
    exit 1
}

# Check table exists
Write-Host ""
Write-Host "📊 DynamoDB Table Status:" -ForegroundColor Cyan
try {
    $tableStatus = aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Table 'CandleSalesLeads' exists" -ForegroundColor Green
        aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 `
            --query "Table.{Name:TableName,Status:TableStatus,Arn:TableArn}" `
            --output table
    } else {
        Write-Host "❌ Table 'CandleSalesLeads' not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error checking table: $_" -ForegroundColor Red
    exit 1
}

# Test write/read
Write-Host ""
Write-Host "🧪 Testing table operations:" -ForegroundColor Cyan
$testId = "verify-$(Get-Date -Format 'yyyyMMddHHmmss')"
$timestamp = (Get-Date -Utc).ToString("yyyy-MM-ddTHH:mm:ssZ")

try {
    aws dynamodb put-item `
        --table-name CandleSalesLeads `
        --region ap-south-1 `
        --item "{\`"leadId\`":{\`"S\`":\`"$testId\`"},\`"phone\`":{\`"S\`":\`"+911234567890\`"},\`"status\`":{\`"S\`":\`"test\`"},\`"createdAt\`":{\`"S\`":\`"$timestamp\`"}}" `
        | Out-Null
    Write-Host "✅ Write operation successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Write operation failed: $_" -ForegroundColor Red
}

try {
    $result = aws dynamodb get-item `
        --table-name CandleSalesLeads `
        --region ap-south-1 `
        --key "{\`"leadId\`":{\`"S\`":\`"$testId\`"}}" `
        --query "Item.leadId.S" `
        --output text
    if ($result -eq $testId) {
        Write-Host "✅ Read operation successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Read operation failed: $_" -ForegroundColor Red
}

# Cleanup test item
try {
    aws dynamodb delete-item `
        --table-name CandleSalesLeads `
        --region ap-south-1 `
        --key "{\`"leadId\`":{\`"S\`":\`"$testId\`"}}" `
        | Out-Null
    Write-Host "✅ Cleanup successful" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Cleanup failed (test item may remain): $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ AWS setup verification complete!" -ForegroundColor Green

