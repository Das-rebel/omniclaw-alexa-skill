# WhatsApp QR Cloud Service - Handover Document

**Created**: 2026-04-23
**Last Updated**: 2026-04-24
**Current Status**: ✅ **CONNECTED** on Compute Engine VM

---

## ✅ Working Service

| Detail | Value |
|--------|-------|
| **VM** | `omniclaw-whatsapp` (asia-south1-b) |
| **External IP** | `34.100.240.249` |
| **Port** | `9377` |
| **URL** | `http://34.100.240.249:9377` |
| **Phone** | `919003349852:10@s.whatsapp.net` |
| **User** | Subhajit |
| **Status** | Connected |

### Endpoints
```
GET  /health                        - Health check
GET  /whatsapp/status               - Connection status
POST /whatsapp/send                 - Send message {to, message}
GET  /whatsapp/contacts             - Get contacts
GET  /whatsapp/chats                - Get recent chats
GET  /whatsapp/qr                   - Get QR code (if not connected)
GET  /whatsapp/dashboard            - Web dashboard
```

### Quick Test
```bash
# Health
curl http://34.100.240.249:9377/health

# Status
curl http://34.100.240.249:9377/whatsapp/status

# Send message
curl -X POST http://34.100.240.249:9377/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "919XXXXXXXXX", "message": "Hello from OmniClaw!"}'
```

---

## Cloud Run Status (Not Working)

The Cloud Run deployment still fails with WhatsApp handshake errors (428/405).
Static IP setup via Cloud NAT was configured but did not resolve the issue.

### Cloud Run Infrastructure (Created)
- **Static IP**: `34.14.129.187` (IN_USE)
- **VPC**: `whatsapp-vpc`
- **NAT**: `whatsapp-nat`
- **VPC Connector**: `whatsapp-connector`

### Why Cloud Run Fails
WhatsApp actively blocks WebSocket connections from cloud provider IP ranges.
The noise protocol handshake completes but WhatsApp terminates with `428 Connection Terminated`.

---

## VM Setup Details

### VM: omniclaw-whatsapp (asia-south1-b)
- **Machine Type**: e2-micro
- **OS**: Ubuntu with Node.js v20
- **Service User**: `ubuntu`
- **Code Dir**: `/home/ubuntu/whatsapp-qr-cloud/`
- **Auth Dir**: `/home/ubuntu/whatsapp-qr-cloud/whatsapp_auth/`
- **Process**: `node index.js` (running since April 17)
- **Log**: `/home/ubuntu/whatsapp-qr-cloud/whatsapp.log`

### VM: omniclaw-whatsapp (asia-south1-a)
- **IP**: `34.47.155.166`
- **Status**: Idle (code deployed but not running)

### Firewall Rules
- `allow-whatsapp`: tcp:9377, tcp:80, tcp:443 (open to 0.0.0.0/0)
- `allow-ssh`: tcp:22 (open to 0.0.0.0/0)

---

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| 2x e2-micro VMs | ~$14 (or free tier) |
| Static IP (Cloud NAT) | ~$7 |
| Cloud NAT | ~$45-65 |
| VPC Connector | ~$15-30 |
| Cloud Run (min 1) | ~$5-15 |
| **Total** | **~$86-131/month** |

**Recommendation**: Delete unused Cloud Run infrastructure (NAT, VPC connector) to save ~$65-110/month since the VM approach works.

---

## Cleanup Commands (if desired)

```bash
# Delete Cloud NAT infrastructure (saves ~$65-110/month)
gcloud compute routers nats delete whatsapp-nat --router=whatsapp-nat-router --region=asia-south1
gcloud compute routers delete whatsapp-nat-router --region=asia-south1
gcloud compute networks vpc-access connectors delete whatsapp-connector --region=asia-south1
gcloud compute addresses delete whatsapp-static-ip --region=asia-south1
gcloud compute networks subnets delete whatsapp-subnet --region=asia-south1
gcloud compute networks delete whatsapp-vpc

# Delete idle VM in asia-south1-a
gcloud compute instances delete omniclaw-whatsapp --zone=asia-south1-a

# Scale down Cloud Run
gcloud run services update whatsapp-qr-cloud --region=asia-south1 --min-instances=0 --max-instances=0
```
