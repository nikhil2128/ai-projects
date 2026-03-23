#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="content-cms-base-${ENVIRONMENT}"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  deploy-base         Build and deploy the base infrastructure stack
  deploy-tenant       Deploy a new tenant stack
  status              Check tenant provisioning status
  upload-template     Upload the tenant stack template to S3

Environment Variables:
  ENVIRONMENT         Target environment (default: dev)
  AWS_REGION          AWS region (default: us-east-1)

Examples:
  # Deploy the shared base infrastructure
  ENVIRONMENT=dev ./deploy.sh deploy-base

  # Deploy a new tenant (interactive prompts)
  ./deploy.sh deploy-tenant

  # Upload tenant-stack.yaml to S3 (required before tenant registration via API)
  ./deploy.sh upload-template
EOF
  exit 1
}

deploy_base() {
  echo "==> Building Lambda functions..."
  cd "$INFRA_DIR/lambda"
  npm ci
  cd "$INFRA_DIR"

  echo "==> Building SAM application..."
  sam build --template-file template.yaml --use-container || sam build --template-file template.yaml

  echo "==> Deploying base stack: ${STACK_NAME}..."
  sam deploy \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --parameter-overrides "Environment=${ENVIRONMENT}" \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

  echo ""
  echo "==> Base stack deployed successfully!"
  echo ""

  API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

  DEPLOYMENT_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DeploymentBucketName'].OutputValue" \
    --output text)

  echo "API URL:           ${API_URL}"
  echo "Deployment Bucket: ${DEPLOYMENT_BUCKET}"
  echo ""
  echo "Next steps:"
  echo "  1. Upload tenant template:  ./deploy.sh upload-template"
  echo "  2. Register tenants via API or:  ./deploy.sh deploy-tenant"
}

upload_template() {
  DEPLOYMENT_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DeploymentBucketName'].OutputValue" \
    --output text)

  echo "==> Uploading tenant-stack.yaml to s3://${DEPLOYMENT_BUCKET}/cloudformation/..."
  aws s3 cp "$INFRA_DIR/tenant-stack.yaml" \
    "s3://${DEPLOYMENT_BUCKET}/cloudformation/tenant-stack.yaml" \
    --region "$AWS_REGION"

  echo "==> Template uploaded."
}

deploy_tenant() {
  echo "==> Tenant Deployment"
  read -rp "Company Name: " COMPANY_NAME
  read -rp "Company Slug (leave blank to auto-generate): " COMPANY_SLUG
  read -rp "Admin Username: " ADMIN_USERNAME
  read -rp "Admin Display Name: " ADMIN_DISPLAY_NAME
  read -rsp "Admin Password: " ADMIN_PASSWORD
  echo ""

  if [ -z "$COMPANY_SLUG" ]; then
    COMPANY_SLUG=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
  fi

  TENANT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '-' | cut -c1-12)
  TENANT_STACK_NAME="cms-tenant-${TENANT_ID}-${ENVIRONMENT}"

  DEPLOYMENT_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DeploymentBucketName'].OutputValue" \
    --output text)

  CFN_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='TenantStackExecutionRoleArn'].OutputValue" \
    --output text)

  echo ""
  echo "==> Deploying tenant stack: ${TENANT_STACK_NAME}..."

  aws cloudformation create-stack \
    --stack-name "$TENANT_STACK_NAME" \
    --template-url "https://${DEPLOYMENT_BUCKET}.s3.${AWS_REGION}.amazonaws.com/cloudformation/tenant-stack.yaml" \
    --capabilities CAPABILITY_NAMED_IAM \
    --role-arn "$CFN_ROLE_ARN" \
    --region "$AWS_REGION" \
    --parameters \
      "ParameterKey=TenantId,ParameterValue=${TENANT_ID}" \
      "ParameterKey=CompanyName,ParameterValue=${COMPANY_NAME}" \
      "ParameterKey=CompanySlug,ParameterValue=${COMPANY_SLUG}" \
      "ParameterKey=Environment,ParameterValue=${ENVIRONMENT}" \
      "ParameterKey=AdminUsername,ParameterValue=${ADMIN_USERNAME}" \
      "ParameterKey=AdminDisplayName,ParameterValue=${ADMIN_DISPLAY_NAME}" \
      "ParameterKey=AdminPassword,ParameterValue=${ADMIN_PASSWORD}" \
    --tags \
      "Key=Service,Value=content-cms" \
      "Key=TenantId,Value=${TENANT_ID}" \
      "Key=Environment,Value=${ENVIRONMENT}"

  echo "==> Waiting for stack creation..."
  aws cloudformation wait stack-create-complete \
    --stack-name "$TENANT_STACK_NAME" \
    --region "$AWS_REGION"

  USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$TENANT_STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text)

  USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "$TENANT_STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
    --output text)

  TENANT_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$TENANT_STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='TenantExecutionRoleArn'].OutputValue" \
    --output text)

  # Set admin password to permanent
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_USERNAME" \
    --password "$ADMIN_PASSWORD" \
    --permanent \
    --region "$AWS_REGION"

  TENANT_REGISTRY_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='TenantRegistryTableName'].OutputValue" \
    --output text)

  # Register tenant in registry
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  aws dynamodb put-item \
    --table-name "$TENANT_REGISTRY_TABLE" \
    --region "$AWS_REGION" \
    --item "{
      \"tenantId\": {\"S\": \"${TENANT_ID}\"},
      \"slug\": {\"S\": \"${COMPANY_SLUG}\"},
      \"companyName\": {\"S\": \"${COMPANY_NAME}\"},
      \"userPoolId\": {\"S\": \"${USER_POOL_ID}\"},
      \"userPoolClientId\": {\"S\": \"${USER_POOL_CLIENT_ID}\"},
      \"tenantRoleArn\": {\"S\": \"${TENANT_ROLE_ARN}\"},
      \"modelsTable\": {\"S\": \"cms-${TENANT_ID}-models\"},
      \"entriesTable\": {\"S\": \"cms-${TENANT_ID}-entries\"},
      \"versionsTable\": {\"S\": \"cms-${TENANT_ID}-versions\"},
      \"settingsTable\": {\"S\": \"cms-${TENANT_ID}-settings\"},
      \"region\": {\"S\": \"${AWS_REGION}\"},
      \"status\": {\"S\": \"active\"},
      \"stackName\": {\"S\": \"${TENANT_STACK_NAME}\"},
      \"adminPasswordSet\": {\"BOOL\": true},
      \"createdAt\": {\"S\": \"${NOW}\"},
      \"updatedAt\": {\"S\": \"${NOW}\"}
    }"

  echo ""
  echo "==> Tenant deployed successfully!"
  echo ""
  echo "Tenant ID:         ${TENANT_ID}"
  echo "Company:           ${COMPANY_NAME} (${COMPANY_SLUG})"
  echo "User Pool ID:      ${USER_POOL_ID}"
  echo "Client ID:         ${USER_POOL_CLIENT_ID}"
  echo "Admin Username:    ${ADMIN_USERNAME}"
  echo "Stack:             ${TENANT_STACK_NAME}"
}

check_status() {
  read -rp "Tenant ID: " TENANT_ID
  TENANT_STACK_NAME="cms-tenant-${TENANT_ID}-${ENVIRONMENT}"

  aws cloudformation describe-stacks \
    --stack-name "$TENANT_STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].{Status:StackStatus,StatusReason:StackStatusReason}" \
    --output table
}

case "${1:-}" in
  deploy-base)     deploy_base ;;
  deploy-tenant)   deploy_tenant ;;
  upload-template) upload_template ;;
  status)          check_status ;;
  *)               usage ;;
esac
