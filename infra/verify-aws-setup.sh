#!/bin/bash
# AWS Setup Verification Script

echo "🔍 Verifying AWS DynamoDB setup for CandleSalesAgent..."
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    exit 1
fi
echo "✅ AWS CLI installed: $(aws --version | cut -d' ' -f1)"

# Check AWS credentials
echo ""
echo "📋 AWS Account Information:"
aws sts get-caller-identity --output table || {
    echo "❌ AWS credentials not configured"
    exit 1
}

# Check table exists
echo ""
echo "📊 DynamoDB Table Status:"
if aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 &> /dev/null; then
    echo "✅ Table 'CandleSalesLeads' exists"
    aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1 \
        --query "Table.{Name:TableName,Status:TableStatus,Arn:TableArn}" \
        --output table
else
    echo "❌ Table 'CandleSalesLeads' not found"
    exit 1
fi

# Test write/read
echo ""
echo "🧪 Testing table operations:"
TEST_ID="verify-$(date +%s)"
aws dynamodb put-item \
    --table-name CandleSalesLeads \
    --region ap-south-1 \
    --item "{\"leadId\":{\"S\":\"$TEST_ID\"},\"phone\":{\"S\":\"+911234567890\"},\"status\":{\"S\":\"test\"},\"createdAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
    &> /dev/null && echo "✅ Write operation successful"

aws dynamodb get-item \
    --table-name CandleSalesLeads \
    --region ap-south-1 \
    --key "{\"leadId\":{\"S\":\"$TEST_ID\"}}" \
    --query "Item.leadId.S" \
    --output text | grep -q "$TEST_ID" && echo "✅ Read operation successful"

# Cleanup test item
aws dynamodb delete-item \
    --table-name CandleSalesLeads \
    --region ap-south-1 \
    --key "{\"leadId\":{\"S\":\"$TEST_ID\"}}" \
    &> /dev/null && echo "✅ Cleanup successful"

echo ""
echo "✨ AWS setup verification complete!"

