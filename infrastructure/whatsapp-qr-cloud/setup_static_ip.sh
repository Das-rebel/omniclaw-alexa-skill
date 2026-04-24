#!/bin/bash
# Setup Static IP for Cloud Run via Cloud NAT
# This routes all Cloud Run outbound traffic through a static IP

set -e

PROJECT_ID="omniclaw-personal-assistant"
REGION="asia-south1"
VPC_NAME="whatsapp-vpc"
SUBNET_NAME="whatsapp-subnet"
ROUTER_NAME="whatsapp-nat-router"
NAT_NAME="whatsapp-nat"
STATIC_IP_NAME="whatsapp-static-ip"
CONNECTOR_NAME="whatsapp-connector"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Static IP Setup for WhatsApp QR Cloud"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Reserve static IP address
echo ""
echo "📌 Step 1: Reserving static IP address..."
gcloud compute addresses create $STATIC_IP_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  2>/dev/null || echo "IP may already exist"

STATIC_IP=$(gcloud compute addresses describe $STATIC_IP_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(address)")
echo "✅ Static IP reserved: $STATIC_IP"

# 2. Create custom VPC
echo ""
echo "📌 Step 2: Creating custom VPC network..."
gcloud compute networks create $VPC_NAME \
  --subnet-mode=custom \
  --bgp-routing-mode=regional \
  --project=$PROJECT_ID \
  2>/dev/null || echo "VPC may already exist"
echo "✅ VPC created: $VPC_NAME"

# 3. Create subnet
echo ""
echo "📌 Step 3: Creating subnet..."
gcloud compute networks subnets create $SUBNET_NAME \
  --network=$VPC_NAME \
  --region=$REGION \
  --range=10.0.0.0/28 \
  --enable-private-ip-google-access \
  --project=$PROJECT_ID \
  2>/dev/null || echo "Subnet may already exist"
echo "✅ Subnet created: $SUBNET_NAME"

# 4. Create Cloud Router
echo ""
echo "📌 Step 4: Creating Cloud Router..."
gcloud compute routers create $ROUTER_NAME \
  --network=$VPC_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  2>/dev/null || echo "Router may already exist"
echo "✅ Router created: $ROUTER_NAME"

# 5. Create NAT with static IP
echo ""
echo "📌 Step 5: Creating Cloud NAT with static IP..."
gcloud compute routers nats create $NAT_NAME \
  --router=$ROUTER_NAME \
  --region=$REGION \
  --auto-allocate-nat-external-ips=false \
  --nat-external-ip-pool-names=$STATIC_IP_NAME \
  --enable-udp-mapping \
  --enable-dynamic-portmap \
  --project=$PROJECT_ID \
  2>/dev/null || echo "NAT may already exist, updating..."
echo "✅ NAT configured with static IP: $STATIC_IP"

# 6. Create Serverless VPC Access connector
echo ""
echo "📌 Step 6: Creating VPC Access connector..."
gcloud compute networks vpc-access connectors create $CONNECTOR_NAME \
  --region=$REGION \
  --subnet=$SUBNET_NAME \
  --subnet-project=$PROJECT_ID \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-medium \
  --project=$PROJECT_ID \
  2>/dev/null || echo "Connector may already exist"
echo "✅ VPC Access connector created: $CONNECTOR_NAME"

CONNECTOR_URI=$(gcloud compute networks vpc-access connectors describe $CONNECTOR_NAME \
  --region=$REGION \
  --format="value(name)" \
  --project=$PROJECT_ID)
echo "📍 Connector URI: $CONNECTOR_URI"

# 7. Configure firewall rules (allow internal traffic)
echo ""
echo "📌 Step 7: Configuring firewall rules..."
gcloud compute firewall-rules create allow-internal-whatsapp \
  --network=$VPC_NAME \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/28 \
  --target-tags=whatsapp-vm \
  --project=$PROJECT_ID \
  2>/dev/null || echo "Firewall rule may already exist"
echo "✅ Firewall rules configured"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Static IP Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Static IP Address: $STATIC_IP"
echo "VPC Connector: $CONNECTOR_URI"
echo ""
echo "Next: Redeploy Cloud Run service with VPC connector:"
echo ""
echo "  gcloud run services update whatsapp-qr-cloud \\"
echo "    --region=$REGION \\"
echo "    --vpc-connector=$CONNECTOR_NAME \\"
echo "    --vpc-egress=all-traffic"
echo ""
