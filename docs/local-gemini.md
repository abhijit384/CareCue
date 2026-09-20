# Local Gemini Development Setup

To develop and test CareCue's AI features locally without deploying to AWS, follow these steps:

## 1. Get an API Key
1. Go to Google AI Studio (https://aistudio.google.com/)
2. Create a new API key.

## 2. Configure Local Environment
1. Copy the example environment file:
   ```bash
   cp infrastructure/local-env.example.json infrastructure/local-env.json
   ```
2. Edit `infrastructure/local-env.json` and paste your API key:
   ```json
   {
     "GEMINI_API_KEY": "AIzaSyYourApiKeyHere..."
   }
   ```
*(Note: `local-env.json` is added to `.gitignore` to prevent committing your key).*

## 3. Test Local Scripts
Run the provided scripts to verify your API key is working.

**Test Text Generation:**
```bash
python scripts/test_gemini_local.py
```

**Test Vision/Image Extraction:**
Create or download a sample medical report image (e.g. `report.jpg`), then run:
```bash
python scripts/test_gemini_image.py path/to/report.jpg
```

## Security Reminders
- **Never expose the GEMINI_API_KEY to the browser/frontend.**
- The frontend should only communicate with the backend, which holds the key.
- The `gemini_service.py` securely fetches the key via OS environment variables (in local dev) or AWS Secrets Manager (in production).
