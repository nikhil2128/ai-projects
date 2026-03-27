#!/usr/bin/env bash
#
# Build and deploy the Matrimonial app to GCP Cloud Run.
#
# Reads infrastructure config from Terraform outputs.
#
# Usage:
#   ./deploy/deploy.sh              # deploy latest build
#   ./deploy/deploy.sh --tag v1.2   # deploy a specific tag
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="${SCRIPT_DIR}/terraform"
cd "$APP_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Read Terraform outputs ────────────────────────────────────────────
if [ ! -d "${TF_DIR}/.terraform" ]; then
  error "Terraform not initialised. Run: cd deploy/terraform && terraform init && terraform apply"
fi

tf_out() { terraform -chdir="$TF_DIR" output -raw "$1" 2>/dev/null; }

GCP_PROJECT_ID="$(tf_out project_id)"
GCP_REGION="$(tf_out region)"
GCP_SERVICE_NAME="$(tf_out service_name)"
GCP_REPO="$(tf_out repo_name)"
GCP_DB_CONNECTION="$(tf_out db_connection_name)"
DATABASE_URL="$(tf_out database_url)"

TAG="${TAG:-latest}"
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag) TAG="$2"; shift 2 ;;
    *) error "Unknown flag: $1" ;;
  esac
done

IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GCP_REPO}/${GCP_SERVICE_NAME}:${TAG}"

# ── Build ────────────────────────────────────────────────────────────
info "Building Docker image..."
docker build -t "$IMAGE" .
ok "Image built: $IMAGE"

# ── Push ─────────────────────────────────────────────────────────────
info "Configuring Docker for Artifact Registry..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

info "Pushing image to Artifact Registry..."
docker push "$IMAGE"
ok "Image pushed."

# ── Deploy to Cloud Run ──────────────────────────────────────────────
info "Deploying to Cloud Run..."
gcloud run deploy "$GCP_SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$GCP_REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production,SERVE_STATIC=/app/public,DATABASE_SSL=disable,DB_POOL_MAX=5" \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
  --add-cloudsql-instances="${GCP_DB_CONNECTION}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "$GCP_SERVICE_NAME" \
  --region="$GCP_REGION" \
  --format="value(status.url)")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Service URL:${NC}  $SERVICE_URL"
echo -e "  ${CYAN}Health:${NC}       ${SERVICE_URL}/api/health"
echo -e "  ${CYAN}Image:${NC}        $IMAGE"
echo ""
