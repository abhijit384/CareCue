# CareCue — AWS Cost Safety & Budget Plan

> **Account Model**: Serverless Pay-Per-Use · Zero Idle Costs · Free Tier Safe

---

## 1. Cost Safety Architecture Overview

CareCue is engineered to guarantee **$0.00 in fixed or recurring idle costs**. The prototype uses exclusively serverless, on-demand primitives that scale to zero when not actively serving requests.

| Service | Architecture Choice | Cost Characteristics | Free Tier Allowance |
|---------|---------------------|----------------------|---------------------|
| **AWS Lambda** | Python 3.12 Serverless Functions | $0.00 when idle; $0.20 per 1M requests | 1,000,000 requests/month free |
| **Amazon DynamoDB** | `PAY_PER_REQUEST` (On-Demand) | $0.00 provisioned capacity; pay only per write/read | 25 GB storage + 2.5M reads/writes free |
| **Amazon S3** | Private Standard Bucket + Auto-Expiring Lifecycle | $0.023 / GB / month; files auto-delete after 7 days | 5 GB standard storage free |
| **Amazon API Gateway** | HTTP API (v2) | $1.00 per 1M requests | 1,000,000 requests/month free |
| **Amazon Bedrock** | On-Demand Converse API (Claude 3 Haiku / Nova Micro) | ~$0.00025 per document analysis; capped tokens | Pay-as-you-go against AWS credits |

---

## 2. Resource Specifications & Guardrails

### 2.1 Amazon S3 (`CareCueDocumentsBucket`)
- **Bucket Policy**: `BlockPublicAcls: true`, `BlockPublicPolicy: true`, `IgnorePublicAcls: true`, `RestrictPublicBuckets: true`.
- **Encryption**: AES-256 server-side encryption enabled by default (`aws:kms` or `AES256`).
- **Lifecycle Rule**: All objects in `sessions/` expire and are permanently deleted after **7 days**, preventing storage accumulation.
- **Max File Size**: Pre-signed URLs enforce a strict 20 MB file size limit.

### 2.2 Amazon DynamoDB (`CareCueSessionsTable`)
- **Billing Mode**: `PAY_PER_REQUEST` (On-Demand).
- **Partition Key**: `sessionId` (String).
- **Time To Live (TTL)**: Optional TTL attribute `expiresAt` set to 30 days.
- **Zero Provisioned Capacity**: No RCU or WCU minimums configured.

### 2.3 Amazon Bedrock Cost Guardrails
- **Model Choice**: Default to `anthropic.claude-3-haiku-20240307-v1:0` or `amazon.nova-micro-v1:0` (the lowest-cost foundational models available).
- **Token Cap**: Maximum output tokens hard-capped at **1,024 tokens** per call.
- **Deduplication**: If a session ID already has a completed analysis stored in DynamoDB, the backend serves the cached analysis rather than reinvoking Bedrock.
- **Single Document Budget**:
  - Input: ~1,500 tokens $\times$ \$0.00025 / 1k = \$0.000375
  - Output: ~800 tokens $\times$ \$0.00125 / 1k = \$0.001000
  - **Estimated cost per complete analysis**: **~$0.0014 (approx. 1/7th of a cent)**.

---

## 3. Teardown & Deletion Commands

To delete all provisioned AWS resources and ensure zero lingering costs:

```bash
# 1. Delete SAM Stack (removes API Gateway, Lambdas, Roles, and DynamoDB table)
sam delete --stack-name carecue-backend --region us-east-1 --no-prompts

# 2. Empty and delete S3 document bucket (if retaining bucket policy was set)
aws s3 rm s3://carecue-documents-<YOUR_ACCOUNT_ID> --recursive
aws s3 rb s3://carecue-documents-<YOUR_ACCOUNT_ID>
```

---

## 4. Monitoring & Budget Alerts

To configure an AWS Billing Alert so you receive an email if total spend exceeds $10:

```bash
aws budgets create-budget \
  --account-id <YOUR_ACCOUNT_ID> \
  --budget '{
    "BudgetName": "CareCue-Safety-Budget",
    "BudgetLimit": { "Amount": "10", "Unit": "USD" },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }]
  }]'
```
