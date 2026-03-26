#!/usr/bin/env bash
#
# One-time GCP infrastructure setup for the Matrimonial app.
#
# Resources created (cost-optimised for low initial traffic):
#   - Artifact Registry repository          (~$0.10/GB/month)
#   - Cloud SQL PostgreSQL (db-f1-micro)    (~$7-10/month, can scale up)
#   - Cloud Run service                     (scales to zero = $0 at idle)
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - A GCP project with billing enabled
#
# Usage:
#   ./deploy/setup-gcp.sh                          # interactive prompts
#   PROJECT_ID=my-proj REGION=asia-south1 ./deploy/setup-gcp.sh  # env vars
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Configuration ────────────────────────────────────────────────────
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -z "$PROJECT_ID" ]; then
  echo -n "Enter GCP Project ID: "
  read -r PROJECT_ID
fi

REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-matrimonial}"
DB_INSTANCE_NAME="${DB_INSTANCE_NAME:-matrimonial-db}"
DB_NAME="${DB_NAME:-matrimonial}"
DB_USER="${DB_USER:-matrimonial_app}"
REPO_NAME="${REPO_NAME:-matrimonial}"

echo ""
info "Configuration:"
echo -e "  Project:       ${CYAN}${PROJECT_ID}${NC}"
echo -e "  Region:        ${CYAN}${REGION}${NC}"
echo -e "  Service:       ${CYAN}${SERVICE_NAME}${NC}"
echo -e "  DB Instance:   ${CYAN}${DB_INSTANCE_NAME}${NC}"
echo -e "  DB Name:       ${CYAN}${DB_NAME}${NC}"
echo ""
echo -n "Proceed? (y/N) "
read -r confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 0

gcloud config set project "$PROJECT_ID"

# ── Enable APIs ──────────────────────────────────────────────────────
info "Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  --quiet

ok "APIs enabled."

# ── Artifact Registry ────────────────────────────────────────────────
info "Creating Artifact Registry repository..."
if gcloud artifacts repositories describe "$REPO_NAME" \
     --location="$REGION" --format="value(name)" 2>/dev/null; then
  warn "Repository '$REPO_NAME' already exists, skipping."
else
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Matrimonial app Docker images"
  ok "Artifact Registry repository created."
fi

# ── Cloud SQL ────────────────────────────────────────────────────────
info "Creating Cloud SQL PostgreSQL instance (db-f1-micro)..."
info "This may take 5-10 minutes..."

if gcloud sql instances describe "$DB_INSTANCE_NAME" --format="value(name)" 2>/dev/null; then
  warn "SQL instance '$DB_INSTANCE_NAME' already exists, skipping creation."
else
  gcloud sql instances create "$DB_INSTANCE_NAME" \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-type=HDD \
    --storage-size=10 \
    --storage-auto-increase \
    --availability-type=zonal \
    --no-assign-ip \
    --network=default \
    --quiet
  ok "Cloud SQL instance created."
fi

DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

info "Creating database and user..."
gcloud sql databases create "$DB_NAME" \
  --instance="$DB_INSTANCE_NAME" 2>/dev/null || warn "Database may already exist."

gcloud sql users create "$DB_USER" \
  --instance="$DB_INSTANCE_NAME" \
  --password="$DB_PASSWORD" 2>/dev/null || warn "User may already exist (password not changed)."

# ── Store DB password in Secret Manager ──────────────────────────────
SECRET_NAME="${SERVICE_NAME}-db-password"
info "Storing database password in Secret Manager..."
echo -n "$DB_PASSWORD" | gcloud secrets create "$SECRET_NAME" \
  --data-file=- --replication-policy=automatic 2>/dev/null \
  || echo -n "$DB_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" --data-file=-

ok "Secret stored as '$SECRET_NAME'."

# ── Get Cloud SQL connection name ────────────────────────────────────
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE_NAME" \
  --format="value(connectionName)")

# ── Grant Cloud Run SA access to Cloud SQL and Secrets ───────────────
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

info "Granting IAM roles to Cloud Run service account..."
for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="$role" \
    --quiet >/dev/null 2>&1
done
ok "IAM roles granted."

# ── Create initial Cloud Run service (placeholder) ───────────────────
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

info "Creating .env.production for reference..."
cat > "$(dirname "$0")/../.env.production" <<EOF
# GCP Production Environment (auto-generated by setup-gcp.sh)
# DO NOT commit this file.
GCP_PROJECT_ID=${PROJECT_ID}
GCP_REGION=${REGION}
GCP_SERVICE_NAME=${SERVICE_NAME}
GCP_DB_INSTANCE=${DB_INSTANCE_NAME}
GCP_DB_CONNECTION=${CONNECTION_NAME}
GCP_REPO=${REPO_NAME}
DATABASE_URL=${DATABASE_URL}
DATABASE_SSL=disable
DB_POOL_MAX=5
EOF

ok ".env.production written (add to .gitignore!)."

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  GCP Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Project:${NC}          $PROJECT_ID"
echo -e "  ${CYAN}Region:${NC}           $REGION"
echo -e "  ${CYAN}SQL Instance:${NC}     $DB_INSTANCE_NAME"
echo -e "  ${CYAN}SQL Connection:${NC}   $CONNECTION_NAME"
echo -e "  ${CYAN}Registry:${NC}         ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo -e "  ${CYAN}DB Password:${NC}      stored in Secret Manager as '${SECRET_NAME}'"
echo ""
echo -e "  Next steps:"
echo -e "    1. Run ${CYAN}./deploy/deploy.sh${NC} to build and deploy"
echo -e "    2. Or push to trigger Cloud Build: ${CYAN}./deploy/cloudbuild.yaml${NC}"
echo ""

# ── Monthly Cost Estimate ────────────────────────────────────────────
echo -e "  ${YELLOW}Estimated monthly cost (low traffic):${NC}"
echo -e "    Cloud SQL db-f1-micro:    ~\$7-10/mo"
echo -e "    Cloud Run (scales to 0):  ~\$0-5/mo"
echo -e "    Artifact Registry:        ~\$0.10/GB"
echo -e "    Secret Manager:           ~\$0.06/secret"
echo -e "    ${GREEN}Total:                    ~\$8-16/mo${NC}"
echo ""
echo -e "  ${YELLOW}Scaling up:${NC}"
echo -e "    Cloud SQL → db-g1-small (~\$25/mo) or db-custom for more resources"
echo -e "    Cloud Run auto-scales based on traffic (pay per request)"
echo ""
