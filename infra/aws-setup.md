# AWS Setup Summary

## DynamoDB Table Created

**Table Name:** `CandleSalesLeads`
**Region:** `ap-south-1` (Mumbai)
**Table ARN:** `arn:aws:dynamodb:ap-south-1:381492072674:table/CandleSalesLeads`
**Status:** ✅ ACTIVE
**Billing Mode:** Pay-per-request (on-demand)

### Schema
- **Primary Key:** `leadId` (String, HASH)

### Table Structure
The table supports flexible attributes for lead data:
- `leadId` (required, string)
- `name` (optional, string)
- `phone` (required, string)
- `consent` (boolean)
- `consentTimestamp` (string, ISO 8601)
- `status` (string, e.g., "queued", "completed", "failed")
- `vapiCallId` (string, optional)
- `events` (map/list, optional)
- `transcription` (string, optional)
- `createdAt` (string, ISO 8601)
- `updatedAt` (string, ISO 8601)

## AWS Configuration

**Current AWS Account:** `381492072674`
**IAM User:** `aisalesagent-deploy`
**AWS Region:** `ap-south-1`

## IAM Permissions

The IAM policy document for required DynamoDB permissions is located at:
`infra/iam-policy.json`

### Required Permissions
- `dynamodb:PutItem` - Create new leads
- `dynamodb:GetItem` - Retrieve lead by ID
- `dynamodb:UpdateItem` - Update lead status and events
- `dynamodb:Query` - Query leads
- `dynamodb:Scan` - List all leads (for admin)
- `dynamodb:DescribeTable` - Table metadata

## Environment Variables

Update your `.env` file with:

```bash
USE_DYNAMODB=true
DYNAMODB_TABLE=CandleSalesLeads
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

Or use IAM roles (recommended for production deployments on AWS infrastructure).

## Verify Setup

Test the table connection:

```bash
aws dynamodb describe-table --table-name CandleSalesLeads --region ap-south-1
```

Or run the Node.js test:

```bash
cd server
node -e "const db = require('./lib/db'); db.getLeads().then(console.log).catch(console.error);"
```

## Next Steps

1. ✅ DynamoDB table created and active
2. ✅ AWS credentials configured
3. ⬜ Verify IAM permissions are sufficient (or attach `infra/iam-policy.json`)
4. ⬜ Test application connection to DynamoDB
5. ⬜ Configure webhook URL for production deployment

