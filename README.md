# Splitwise Backend

A Node.js backend for a splitwise expense sharing application built with Express, MongoDB, and JWT authentication.

## Features

- User registration and authentication
- Group management (create, add/remove members)
- Expense tracking and splitting
- Balance calculations and settlements
- JWT-based authentication

## Local Development

### Prerequisites

- Node.js 18+ 
- MongoDB
- Docker (optional)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB URI and JWT secret

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:8080`

## Docker Deployment

### Local Docker

1. Build the Docker image:
   ```bash
   npm run docker:build
   ```

2. Run the container:
   ```bash
   npm run docker:run
   ```

### Docker Compose (with MongoDB)

1. Start all services:
   ```bash
   npm run docker:compose
   ```

This will start both the backend and a MongoDB instance.

## Google Cloud Platform Deployment

### Prerequisites

1. Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Authenticate with GCP:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

### Deployment Steps

#### Option 1: Using the Deployment Script (Recommended)

1. Update the project variables in `deploy-gcp.ps1` (Windows) or `deploy-gcp.sh` (Linux/Mac)
2. Create your `.env` file with production values
3. Run the deployment script:
   
   **Windows PowerShell:**
   ```powershell
   .\deploy-gcp.ps1
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x deploy-gcp.sh
   ./deploy-gcp.sh
   ```

#### Option 2: Manual Deployment

1. **Build and push the Docker image:**
   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/splitwise-backend .
   docker push gcr.io/YOUR_PROJECT_ID/splitwise-backend
   ```

2. **Create secrets in Secret Manager:**
   ```bash
   echo -n "your-mongodb-uri" | gcloud secrets create mongodb-uri --data-file=-
   echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy splitwise-backend \
     --image gcr.io/YOUR_PROJECT_ID/splitwise-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-secrets MONGODB_URI=mongodb-uri:latest \
     --set-secrets JWT_SECRET=jwt-secret:latest \
     --memory 512Mi \
     --cpu 1 \
     --max-instances 10 \
     --port 8080
   ```

### Environment Variables

For GCP deployment, make sure to set these environment variables:

- `MONGODB_URI`: Your MongoDB connection string (can be MongoDB Atlas)
- `JWT_SECRET`: A secure random string for JWT token signing
- `NODE_ENV`: Set to "production"

## API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /login` - Login user

### Groups
- `GET /get-groups` - Get user's groups
- `POST /create-group` - Create a new group
- `GET /get-group-by-id` - Get group details
- `POST /add-member` - Add member to group
- `POST /remove-member` - Remove member from group

### Expenses
- `POST /add-expense` - Add expense to group
- `GET /get-expenses` - Get group expenses and balances

## Database

The application uses MongoDB with two main collections:
- `users` - User information
- `groups` - Group information including members and expenses

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- CORS is enabled for cross-origin requests
- Environment variables are used for sensitive configuration

## Monitoring and Logs

When deployed to GCP Cloud Run, you can monitor your application using:
- Google Cloud Console
- Cloud Run logs
- Cloud Monitoring

Access logs with:
```bash
gcloud logs tail --project=YOUR_PROJECT_ID
```


1. User clicks "Login with Company Account" on Auth0 page
   ↓
2. Auth0 shows your custom login form (email/password)
   ↓  
3. User enters credentials
   ↓
4. Auth0 executes YOUR login script
   ↓
5. Your script calls YOUR authentication API
   ↓
6. Your API queries YOUR secure cloud database
   ↓
7. Your API returns user data to Auth0
   ↓
8. Auth0 creates JWT with your user data
   ↓
9. JWT sent to your frontend (same as Gmail/Facebook flow!)
   ↓
10. Your existing middleware validates token (no changes needed!)
