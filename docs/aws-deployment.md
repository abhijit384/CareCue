# CareCue — AWS Deployment & Infrastructure Guide

> Step-by-step deployment guide for CareCue Serverless Architecture using AWS SAM

---

## 1. Prerequisites

1. **AWS CLI**: Installed and configured with credentials:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, Default region (e.g. us-east-1)
   ```
2. **AWS SAM CLI**: Installed (`sam --version`).
3. **Python 3.12+**: For Lambda runtime packaging.
4. **Bedrock Model Access**: In the AWS Management Console:
   - Navigate to **Amazon Bedrock** → **Model access**.
   - Ensure access is granted for **Anthropic Claude 3 Haiku** or **Amazon Nova Micro**.

---

## 2. Infrastructure Deployment (AWS SAM)

From the project root:

```bash
cd infrastructure

# Build SAM artifacts
sam build

# Deploy with guided wizard (first time)
sam deploy --guided

# Wizard prompts:
# Stack Name [carecue-backend-dev]: carecue-backend-dev
# AWS Region [us-east-1]: us-east-1
# Parameter Environment [dev]: dev
# Parameter BedrockModelId [anthropic.claude-3-5-sonnet-20241022-v2:0]: <Enter>
# Parameter GeminiSecretName [carecue/dev/gemini]: carecue/dev/gemini
# Confirm changes before deploy [Y/n]: n
# Allow SAM CLI IAM role creation [Y/n]: Y
# Disable rollback [y/N]: N
# Save arguments to configuration file [Y/n]: Y
```

### Outputs
Once deployed, SAM outputs:
- `HttpApiUrl`: The public API Gateway endpoint, e.g., `https://<api-id>.execute-api.us-east-1.amazonaws.com/dev`.
- `DocumentsBucketName`: Private S3 bucket name (`carecue-documents-dev-*`).
- `SessionsTableName`: DynamoDB table name (`carecue-sessions-dev`).
- `GeminiSecretConnected`: Connected Secrets Manager secret (`carecue/dev/gemini`).

---

## 3. Connecting Frontend to Live AWS Backend

1. Navigate to the `frontend/` directory.
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Update `.env.local` with your deployed `HttpApiUrl`:
   ```env
   VITE_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com
   VITE_ENABLE_LIVE_AWS=true
   ```
4. Restart the Vite dev server:
   ```bash
   npm run dev
   ```

---

## 4. Local Testing with SAM Local

To test the backend locally without deploying to AWS:

```bash
cd infrastructure
sam local start-api --port 3001
```

Set in `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3001
VITE_ENABLE_LIVE_AWS=true
```

---

## 5. Teardown & Deletion

To completely delete all AWS resources when finished:

```bash
sam delete --stack-name carecue-backend --region us-east-1 --no-prompts
```
