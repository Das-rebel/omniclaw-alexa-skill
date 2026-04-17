#!/bin/bash
# Deploy WhatsApp QR Cloud to Google Cloud Run

set -e

PROJECT_ID="omniclaw-enhanced"
SERVICE_NAME="omniclaw-whatsapp-qr"
REGION="asia-south1"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "🔨 Building Docker image..."
gcloud builds submit --tag $IMAGE --project $PROJECT_ID

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 9377 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 300 \
  --concurrency 80 \
  --project $PROJECT_ID

echo "✅ Deployed! Getting URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "WhatsApp Service URL: $SERVICE_URL"
echo ""
echo "To update your cloud function with this URL, run:"
echo "gcloud functions deploy alexa_handler --set-env-vars WHATSAPP_SERVICE_URL=$SERVICE_URL --region $REGION --project $PROJECT_ID"
