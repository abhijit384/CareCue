# CareCue — AWS Architecture

> Simple enough to finish. Real enough to matter.

---

## 1. Architecture Philosophy

This architecture is designed for a **hackathon**: it must be buildable in a compressed timeline while demonstrating genuine, production-quality AWS usage. Every service included has a clear job. Nothing is added for appearance.

### Constraints

- Must be fully deployable from scratch during the hackathon
- Must use real AWS services (not mocked)
- Must be serverless (no EC2, no ECS, no EKS)
- Must keep costs within free-tier / minimal usage
- Must demonstrate Amazon Bedrock as the primary AI engine

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER (React SPA)                      │
│                     Hosted on AWS Amplify Hosting                 │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AMAZON API GATEWAY (REST)                   │
│                                                                  │
│  Routes:                                                         │
│  POST /sessions              → Create care session               │
│  POST /sessions/{id}/upload  → Upload document                   │
│  POST /sessions/{id}/analyze → Trigger analysis pipeline         │
│  GET  /sessions/{id}/results → Get analysis results              │
│  POST /sessions/{id}/brief   → Generate doctor visit brief       │
│  GET  /sessions              → List sessions (history)           │
│  DELETE /sessions/{id}       → Delete session                    │
│  POST /care-guidance         → Care guidance query               │
│                                                                  │
│  CORS: Configured for Amplify domain only                        │
│  Throttling: 100 req/s burst, 50 req/s sustained                 │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        AWS LAMBDA FUNCTIONS                      │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ session-handler  │  │ analyze-handler  │  │ guidance-handler │ │
│  │                  │  │                  │  │                  │ │
│  │ • Create session │  │ • Extract text   │  │ • Process query  │ │
│  │ • List sessions  │  │ • Privacy gate   │  │ • Bedrock call   │ │
│  │ • Delete session │  │ • Bedrock call   │  │ • Gemini verify  │ │
│  │ • Get results    │  │ • Gemini verify  │  │ • Return results │ │
│  └────────┬─────────┘  │ • Store results  │  └────────┬─────────┘ │
│           │            └────────┬─────────┘           │           │
│           │                     │                     │           │
│  ┌────────┴─────────┐  ┌───────┴──────────┐          │           │
│  │ upload-handler    │  │ brief-handler    │          │           │
│  │                   │  │                  │          │           │
│  │ • Validate file   │  │ • Compile brief  │          │           │
│  │ • Store in S3     │  │ • Format output  │          │           │
│  │ • Return presigned│  │ • Store in S3    │          │           │
│  └───────────────────┘  └──────────────────┘          │           │
│                                                       │           │
└───────────────────────────┬───────────────────────────┘           │
                            │                                       │
              ┌─────────────┼────────────────────┐                  │
              ▼             ▼                    ▼                  │
┌────────────────┐ ┌────────────────┐ ┌─────────────────┐          │
│   AMAZON S3    │ │  DYNAMODB      │ │ AMAZON BEDROCK  │          │
│                │ │                │ │                  │          │
│ • Documents    │ │ • Sessions     │ │ • Claude 3.5    │          │
│   (encrypted)  │ │ • Results      │ │   Sonnet        │          │
│ • Briefs       │ │ • Metadata     │ │ • Analysis      │          │
│   (generated)  │ │                │ │ • Extraction    │          │
│ • Temp uploads │ │ Table:         │ │ • Safety check  │          │
│                │ │ carecue-       │ │                  │          │
│ Bucket:        │ │ sessions       │ └─────────────────┘          │
│ carecue-docs   │ │                │                              │
└────────────────┘ │ PK: sessionId  │ ┌─────────────────┐          │
                   │ SK: itemType   │ │ SECRETS MANAGER  │          │
                   └────────────────┘ │                  │◄─────────┘
                                      │ • Gemini API Key │
                                      │ (server-side     │
                                      │  access only)    │
                                      └─────────────────┘

                   ┌────────────────┐
                   │  CLOUDWATCH    │
                   │                │
                   │ • Lambda logs  │
                   │ • API Gateway  │
                   │   access logs  │
                   │ • Custom       │
                   │   metrics      │
                   │ • Alarms       │
                   └────────────────┘
```

---

## 3. Service Details

### 3.1 AWS Amplify Hosting

| Aspect | Configuration |
|--------|--------------|
| **Purpose** | Host the React SPA (static build) |
| **Source** | GitHub repository, main branch |
| **Build** | `npm run build` → `dist/` or `build/` directory |
| **Custom domain** | Optional (Amplify provides a default URL) |
| **Environment vars** | `VITE_API_URL` pointing to API Gateway endpoint |
| **SSL** | Automatic via Amplify |

### 3.2 Amazon API Gateway

| Aspect | Configuration |
|--------|--------------|
| **Type** | REST API (not HTTP API — need request validation) |
| **Auth** | API Key for hackathon (Cognito is stretch goal) |
| **CORS** | Allow Amplify domain origin only |
| **Throttling** | 100 burst / 50 sustained |
| **Request validation** | Body validation on POST endpoints |
| **Logging** | Access logs to CloudWatch |
| **Stage** | Single `prod` stage |

### 3.3 AWS Lambda Functions

Five Lambda functions, each with a focused responsibility:

| Function | Runtime | Memory | Timeout | Description |
|----------|---------|--------|---------|-------------|
| `session-handler` | Node.js 20.x | 256 MB | 10s | CRUD for sessions + history |
| `upload-handler` | Node.js 20.x | 512 MB | 30s | File validation, S3 upload, presigned URL |
| `analyze-handler` | Node.js 20.x | 1024 MB | 120s | Text extraction, privacy gateway, Bedrock + Gemini |
| `guidance-handler` | Node.js 20.x | 512 MB | 60s | Care Guidance Q&A flow |
| `brief-handler` | Node.js 20.x | 512 MB | 30s | Compile + format Doctor Visit Brief |

**Why separate functions:**

- Isolation of concerns (upload doesn't need Bedrock permissions)
- Independent scaling and timeout configuration
- Least-privilege IAM per function
- The `analyze-handler` needs 120s for the dual-AI flow — other functions don't

### 3.4 Amazon S3

| Aspect | Configuration |
|--------|--------------|
| **Bucket** | `carecue-docs-{account-id}` |
| **Encryption** | SSE-S3 (AES-256) at rest |
| **Access** | Private. No public access. |
| **Lifecycle** | Objects expire after 24 hours (hackathon: keep simple) |
| **Structure** | `uploads/{sessionId}/{filename}` and `briefs/{sessionId}/brief.json` |
| **Presigned URLs** | Used for temporary document access (15-minute expiry) |

### 3.5 Amazon DynamoDB

| Aspect | Configuration |
|--------|--------------|
| **Table** | `carecue-sessions` |
| **Billing** | On-demand (pay-per-request) |
| **Encryption** | AWS-managed encryption at rest |

**Schema:**

| PK | SK | Attributes |
|----|-----|------------|
| `sessionId` | `META` | type, createdAt, documentName, status |
| `sessionId` | `RESULTS` | insights[], verificationStatuses[], summary |
| `sessionId` | `BRIEF` | briefContent, generatedAt |
| `sessionId` | `PRIVACY` | minimizedFields[], originalFieldCount |

**Access patterns:**

| Pattern | Key Condition |
|---------|--------------|
| Get session | PK = sessionId |
| Get results | PK = sessionId, SK = RESULTS |
| List all sessions | Scan (acceptable for hackathon scale) |
| Delete session | PK = sessionId (delete all SKs) |

### 3.6 Amazon Bedrock

| Aspect | Configuration |
|--------|--------------|
| **Model** | Claude 3.5 Sonnet (via Bedrock) |
| **Usage** | Document analysis, insight extraction, safety checks |
| **Region** | us-east-1 (broadest model availability) |
| **Guardrails** | Custom guardrail for medical safety (no diagnosis, no Rx) |

**Prompt architecture:**

```
System: You are a medical document analysis assistant. You help users
understand medical documents. You NEVER diagnose conditions or
recommend treatments. You always suggest consulting a healthcare
professional.

User: [extracted document text]

Instructions:
1. Identify key findings (values, ranges, observations)
2. For each finding, provide:
   - The exact source text
   - A plain-language explanation
   - Whether it is within/outside reference ranges
   - What a healthcare professional might want to discuss
3. Flag any values that need special attention
4. Output as structured JSON

Safety rules:
- Never state a diagnosis
- Never recommend medication
- Always suggest professional consultation
- If emergency symptoms detected, flag immediately
```

### 3.7 AWS Secrets Manager

| Secret | Purpose |
|--------|---------|
| `carecue/gemini-api-key` | Google Gemini API key (accessed by Lambda only) |

- Cached in Lambda memory on cold start (avoid per-request Secret fetches)
- Never exposed in environment variables, never in frontend code
- Rotatable via Secrets Manager without redeployment

### 3.8 Amazon CloudWatch

| Component | Logging |
|-----------|---------|
| Lambda functions | Function logs (sanitized — no raw documents, no PII) |
| API Gateway | Access logs (request ID, status, latency) |
| Custom metrics | Analysis duration, verification agreement rate, error rate |
| Alarms | Lambda error rate > 5%, Bedrock throttling |

---

## 4. Data Flow: Full Analysis Pipeline

```
1. Client uploads file
   Browser → API Gateway → upload-handler → S3
   Response: { sessionId, uploadStatus }

2. Client triggers analysis
   Browser → API Gateway → analyze-handler
   
   analyze-handler:
   a. Fetch document from S3
   b. Extract text (PDF parsing in Lambda)
   c. Run Privacy Gateway:
      - Scan for PII patterns (names, DOB, SSN, phone, address)
      - Create minimized payload (PII → placeholders)
      - Store minimization record in DynamoDB
   d. Call Amazon Bedrock:
      - Send full extracted text (within AWS, same account)
      - Receive structured analysis JSON
   e. Prepare verification payload:
      - Take Bedrock's key claims
      - Combine with privacy-minimized source data
      - Strip any remaining PII
   f. Call Gemini (via HTTPS):
      - Send structured verification request
      - Receive agreement/disagreement per claim
   g. Compute verification statuses:
      - Compare Bedrock and Gemini responses
      - Assign: Consistent / Needs Review / Safety Redirect
   h. Store results in DynamoDB
   i. Return results to client

3. Client generates brief
   Browser → API Gateway → brief-handler
   brief-handler:
   a. Fetch results from DynamoDB
   b. Compile Doctor Visit Brief (JSON structure)
   c. Store brief in S3
   d. Return brief content + presigned URL
```

---

## 5. Gemini Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Lambda (analyze-handler)                                   │
│                                                             │
│  1. Bedrock produces analysis:                              │
│     [                                                       │
│       { claim: "Hemoglobin 11.2 is below range",           │
│         value: "11.2", range: "12.0-17.5",                 │
│         source: "CBC Panel" },                              │
│       ...                                                   │
│     ]                                                       │
│                                                             │
│  2. Privacy-minimized verification payload:                 │
│     {                                                       │
│       "claims": [                                           │
│         { "claim": "Hemoglobin 11.2 is below range",       │
│           "value": "11.2",                                  │
│           "referenceRange": "12.0-17.5",                    │
│           "category": "Hematology" }                        │
│       ],                                                    │
│       "context": "Adult blood panel analysis",              │
│       "note": "Verify clinical accuracy of claims"          │
│     }                                                       │
│     // NO names, dates, addresses, or document metadata     │
│                                                             │
│  3. Fetch Gemini API key from Secrets Manager               │
│                                                             │
│  4. POST to Gemini API:                                     │
│     "Given these medical claims and values,                 │
│      independently assess whether each claim is             │
│      clinically reasonable. Do not diagnose."               │
│                                                             │
│  5. Gemini returns per-claim assessment:                    │
│     [                                                       │
│       { "claimIndex": 0,                                    │
│         "assessment": "consistent",                         │
│         "reasoning": "11.2 is indeed below 12.0-17.5" }    │
│     ]                                                       │
│                                                             │
│  6. Lambda merges into final results                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Points

- The Gemini request contains **claims + values + ranges** — not the original document
- No patient name, no dates, no addresses, no document headers
- The API key is fetched from Secrets Manager, never from the browser
- If Gemini is unavailable, results are returned with Bedrock analysis only (graceful degradation)

---

## 6. IAM Policies (Least Privilege)

### analyze-handler

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::carecue-docs-*/uploads/*"
},
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:UpdateItem"
  ],
  "Resource": "arn:aws:dynamodb:*:*:table/carecue-sessions"
},
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel"
  ],
  "Resource": "arn:aws:bedrock:*:*:model/anthropic.claude-3-5-sonnet-*"
},
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue"
  ],
  "Resource": "arn:aws:secretsmanager:*:*:secret:carecue/gemini-api-key-*"
}
```

### upload-handler

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::carecue-docs-*/uploads/*"
},
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:UpdateItem"
  ],
  "Resource": "arn:aws:dynamodb:*:*:table/carecue-sessions"
}
```

### session-handler

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:DeleteItem",
    "dynamodb:Scan",
    "dynamodb:Query"
  ],
  "Resource": "arn:aws:dynamodb:*:*:table/carecue-sessions"
},
{
  "Effect": "Allow",
  "Action": [
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::carecue-docs-*/*"
}
```

---

## 7. Infrastructure as Code

### Recommended: AWS SAM (Serverless Application Model)

```yaml
# template.yaml (simplified)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Environment:
      Variables:
        TABLE_NAME: !Ref SessionsTable
        BUCKET_NAME: !Ref DocumentsBucket

Resources:
  # API
  CareCueApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowOrigin: "'https://main.AMPLIFY_APP_ID.amplifyapp.com'"
        AllowMethods: "'GET,POST,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"

  # Lambda Functions
  AnalyzeFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: analyze.handler
      MemorySize: 1024
      Timeout: 120
      Policies:
        - S3ReadPolicy: { BucketName: !Ref DocumentsBucket }
        - DynamoDBCrudPolicy: { TableName: !Ref SessionsTable }
        - Statement:
            - Effect: Allow
              Action: bedrock:InvokeModel
              Resource: '*'
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:carecue/*'
      Events:
        Analyze:
          Type: Api
          Properties:
            Path: /sessions/{id}/analyze
            Method: post
            RestApiId: !Ref CareCueApi

  # Storage
  DocumentsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LifecycleConfiguration:
        Rules:
          - Status: Enabled
            ExpirationInDays: 1

  SessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: carecue-sessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: itemType
          AttributeType: S
      KeySchema:
        - AttributeName: sessionId
          KeyType: HASH
        - AttributeName: itemType
          KeyType: RANGE
      SSESpecification:
        SSEEnabled: true
```

---

## 8. Cost Estimate (Hackathon)

| Service | Expected Usage | Estimated Cost |
|---------|---------------|---------------|
| Amplify Hosting | Static site, minimal traffic | Free tier |
| API Gateway | < 1000 requests during hackathon | Free tier |
| Lambda | < 1000 invocations, < 100 GB-seconds | Free tier |
| S3 | < 100 MB stored, < 1 day retention | ~$0.01 |
| DynamoDB | < 1000 read/write units | Free tier |
| Bedrock (Claude 3.5 Sonnet) | ~50 analysis calls, ~5K input tokens each | ~$5–10 |
| Secrets Manager | 1 secret | ~$0.40/month |
| CloudWatch | Basic logs | Free tier |
| **Total** | | **~$6–11** |

---

## 9. Deployment Checklist

1. ☐ Create S3 bucket with encryption + lifecycle
2. ☐ Create DynamoDB table
3. ☐ Store Gemini API key in Secrets Manager
4. ☐ Enable Amazon Bedrock model access (Claude 3.5 Sonnet)
5. ☐ Deploy Lambda functions via SAM
6. ☐ Create API Gateway with routes + CORS
7. ☐ Connect Amplify to GitHub repo
8. ☐ Set Amplify environment variables
9. ☐ Deploy frontend build
10. ☐ Verify end-to-end flow
11. ☐ Configure CloudWatch alarms

---

## 10. Stretch Goals (If Time Permits)

| Goal | Service | Complexity |
|------|---------|-----------|
| User authentication | Amazon Cognito | Medium — adds auth flow to frontend + API |
| Image OCR for photographed reports | Amazon Textract | Low — single API call from analyze-handler |
| Async processing with status polling | Step Functions + EventBridge | Medium |
| Custom domain | Route 53 + ACM | Low |
| CI/CD pipeline | Amplify auto-deploy from GitHub | Already included |
