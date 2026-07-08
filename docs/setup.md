# Setup & Deployment

This guide covers how to run the AXON Decision Engine locally, test it with AI agents, and deploy it to a production environment.

## 1. Local Development Environment

### Prerequisites
- **Node.js**: `v18.17.0` or higher.
- **Package Manager**: `npm`, `yarn`, or `pnpm`.
- **Google Gemini API Key**: Acquired via [Google AI Studio](https://aistudio.google.com/).
- **(Optional) Firebase Account**: For persistent cloud storage. If not provided, AXON falls back to a functional browser `localStorage` layer.

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/obadadallo95/axon-decision-engine.git
   cd axon-decision-engine
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` at the root of your project:
   ```env
   # [REQUIRED] The Gemini Engine credentials
   GEMINI_API_KEY=your_gemini_api_key

   # [OPTIONAL] API Key required when hitting /api/decide externally.
   # If omitted, external clients can hit the API without Auth (Useful for local testing).
   AXON_API_KEY=your_secure_random_key
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

---

## 2. Testing the Engine Locally

To ensure the decision kernel is running properly, open a new terminal and fire a test curl command to your local instance:

```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AXON_API_KEY}" \
  -d '{
    "prompt": "Run an update on all database schemas via Prisma",
    "policies": [
      {
        "id": "1",
        "title": "DB Protection",
        "description": "Database schema modifications require human review."
      }
    ]
  }'
```

You should receive a structured JSON response containing:
```json
{
  "decision": "ESCALATE_TO_HUMAN",
  "reasonEn": "The policy 'DB Protection' strictly mandates human review for database schema modifications.",
  ...
}
```

---

## 3. Production Deployment

AXON is built on Next.js App Router and deploys seamlessly to Vercel, or any Node-compatible hosting provider (Render, Railway, AWS Amplify).

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the project in Vercel.
3. In the Vercel Dashboard, go to **Settings > Environment Variables**.
4. Add `GEMINI_API_KEY` and `AXON_API_KEY`.
5. Deploy.

### Building as a Docker Container or Standard Node App
If deploying to a traditional VPS or Container Registry:
```bash
# Build the Next.js optimized payload
npm run build

# Start the production server
npm start
```
*Note: Ensure your environment variables are injected into the container environment prior to running `npm start`.*
