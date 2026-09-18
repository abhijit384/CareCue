# CareCue AWS Cost Safety & Zero-Idle-Cost Architecture

## Executive Summary
CareCue is engineered to operate on AWS with a **$0 Idle Cost Baseline**. When no users are active, all compute, database, and storage resources scale down to zero cost, preventing surprise bills on personal or hackathon AWS accounts.

---

## 1. Resource Breakdown & Billing Modes

| Resource | AWS Service | Billing Mode | Idle Cost | Max Bounded Usage | Cost Safety Control |
|---|---|---|---|---|---|
| **API Gateway** | AWS HTTP API (v2) | Per Request | **$0.00** | $1.00 per 1M requests | Request throttling (100 RPS / 200 burst) |
| **Compute** | AWS Lambda (Python 3.12) | Per Request / ms | **$0.00** | $0.20 per 1M requests | 512MB RAM, 10–60s max execution timeouts |
| **Primary Database** | Amazon DynamoDB | `PAY_PER_REQUEST` | **$0.00** | $0.25 per 1M writes | No provisioned RCU/WCU; 30-day auto-purge TTL |
| **Document Storage** | Amazon S3 | Ephemeral Storage | **$0.00** | $0.023 per GB/mo | 7-day automatic lifecycle expiration rule |
| **Foundation Models** | Amazon Bedrock | On-Demand Tokens | **$0.00** | Claude 3 Haiku / Claude 3.5 Sonnet | Capped at 1,200 max tokens per request; temperature 0.1 |
| **Independent Verification** | Google Gemini (GenAI SDK) | Free-Tier API | **$0.00** | 15 RPM / 1,500 RPD | Capped at 5 verification requests per session; circuit breaker on 429 |
| **Secrets Manager** | AWS Secrets Manager | Per Secret Month | ~$0.40/mo | 1 secret (`carecue/dev/gemini`) | In-memory key caching avoids repeated API calls |

---

## 2. Technical Cost-Safety Mechanisms

### 1. DynamoDB On-Demand Billing (`PAY_PER_REQUEST`)
```yaml
CareCueSessionsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub "carecue-sessions-${Environment}"
    BillingMode: PAY_PER_REQUEST
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
```
- No pre-allocated capacity units.
- Inactive periods incur **$0.00**.

### 2. S3 Ephemeral Auto-Expiration
```yaml
LifecycleConfiguration:
  Rules:
    - Id: ExpireUserDocumentsAfter7Days
      Status: Enabled
      ExpirationInDays: 7
```
- Uploaded PDFs are automatically deleted by AWS after 7 days.
- Eliminates storage creep over time.

### 3. Bedrock Token Limiting
```python
response = client.converse(
    modelId=self.model_id,
    inferenceConfig={
        "maxTokens": 1200,
        "temperature": 0.1,
        "topP": 0.9,
    }
)
```
- Hard-capped at 1,200 output tokens.
- Deterministic parsing fallback prevents infinite retry loops.

### 4. Gemini Request Capping & Circuit Breaker
```python
MAX_REQUESTS_PER_SESSION = 5
MAX_INPUT_CHAR_SIZE = 4000
MAX_OUTPUT_TOKENS = 1000
```
- Enforces a maximum of 5 verification requests per user session.
- Immediate circuit breaker activates on rate limits or network issues, reverting to local consensus calculation without user interruption.

---

## 3. Account Safety Guarantees

- **No Paid Upgrades**: Does not require upgrading the AWS Free Plan.
- **No AutoPay**: Relies strictly on Free Tier allowances and initial credits.
- **Clean Teardown**: The entire stack can be removed in a single command (`sam delete --stack-name carecue-backend-dev`), deleting all Lambda functions, API Gateway, DynamoDB table, and S3 bucket.
