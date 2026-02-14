# CI/CD Pipeline — Image Annotator

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions                              │
│                                                                 │
│  PR / Push ──► CI Workflow ──► Lint + Type-check + Unit Tests   │
│                                                                 │
│  Push main ──► Deploy Workflow ──► Build ──► Deploy to TEST     │
│  Push v* tag ──► Deploy Workflow ──► Build ──► Deploy to PROD   │
│  Manual ──────► Deploy Workflow ──► Build ──► Deploy to ENV     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────── AWS Architecture ────────────────────────────┐
│                                                                 │
│   CloudFront CDN                                                │
│   ├── / ──────────► S3 (Frontend static assets)                 │
│   ├── /api/* ─────► ALB ──► ECS Fargate (Backend containers)    │
│   └── /socket.io/* ► ALB ──► ECS Fargate (WebSocket)            │
│                                                                 │
│   ECS Fargate                                                   │
│   ├── Pulls image from ECR                                      │
│   ├── Reads secrets from Secrets Manager                        │
│   └── Connects to RDS PostgreSQL (private subnet)               │
│                                                                 │
│   S3 Uploads Bucket ◄── Backend (image storage)                 │
│                                                                 │
│   VPC                                                           │
│   ├── Public subnets:  ALB, NAT Gateway                         │
│   └── Private subnets: ECS tasks, RDS                           │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS account with admin access
- GitHub repository
- Terraform >= 1.5.0
- Node.js 20.x
- Docker

---

## 1. Bootstrap Terraform State Backend

Run **once** to create the S3 bucket and DynamoDB table for Terraform state:

```bash
cd image-annotator/infra/bootstrap
terraform init
terraform apply
```

## 2. Configure GitHub Environments

Create two GitHub Environments in your repository settings: **test** and **prod**.

### Environment Variables (`vars.*`)

| Variable                     | Test Example             | Prod Example             |
|------------------------------|--------------------------|--------------------------|
| `AWS_REGION`                 | `us-east-1`             | `us-east-1`             |
| `CLOUDFRONT_DISTRIBUTION_ID` | *(from Terraform output)* | *(from Terraform output)* |
| `VITE_API_URL`               | *(CloudFront domain)*    | *(custom domain or CF)*  |

### Environment Secrets (`secrets.*`)

| Secret                | Description                                     |
|-----------------------|-------------------------------------------------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for GitHub Actions OIDC (from Terraform output) |
| `JWT_SECRET`          | Secure random string for JWT signing            |
| `DB_USERNAME`         | RDS master username                             |

> **Security Note:** Secrets are injected at deploy-time via OIDC and Secrets Manager. No long-lived AWS credentials are stored in GitHub.

### Recommended: Add Protection Rules to `prod`

- Require manual approval for production deployments
- Restrict deployments to the `main` branch and `v*` tags

## 3. Deploy Infrastructure

```bash
cd image-annotator/infra

# Initialize Terraform for test
terraform init -backend-config="key=test/terraform.tfstate"

# Plan and apply for test
terraform plan -var-file=environments/test.tfvars -var="jwt_secret=YOUR_SECRET" -var="db_username=app_admin"
terraform apply -var-file=environments/test.tfvars -var="jwt_secret=YOUR_SECRET" -var="db_username=app_admin"

# For prod, re-init with prod state key
terraform init -backend-config="key=prod/terraform.tfstate" -reconfigure
terraform plan -var-file=environments/prod.tfvars -var="jwt_secret=YOUR_SECRET" -var="db_username=app_admin"
terraform apply -var-file=environments/prod.tfvars -var="jwt_secret=YOUR_SECRET" -var="db_username=app_admin"
```

After applying, note the outputs and configure them in GitHub Environment variables.

## 4. CI Pipeline (Automatic)

Runs on every PR and push to `main`:

| Job                | What it does                          |
|--------------------|---------------------------------------|
| `backend-lint`     | ESLint on backend source              |
| `backend-typecheck`| TypeScript compiler check             |
| `backend-test`     | Vitest unit tests                     |
| `frontend-lint`    | ESLint on frontend source             |
| `frontend-typecheck`| TypeScript compiler check            |
| `frontend-test`    | Vitest unit tests                     |
| `backend-build`    | Docker image build verification       |
| `frontend-build`   | Vite production build + artifact upload|

## 5. Deploy Pipeline

| Trigger                | Target Environment |
|------------------------|--------------------|
| Push to `main`         | **test**           |
| Push `v*` tag          | **prod**           |
| Manual `workflow_dispatch` | **chosen env** |

### Deploy Jobs

- **deploy-backend**: Build Docker image → Push to ECR → Update ECS task → Rolling deploy
- **deploy-frontend**: Build static assets → Sync to S3 → Invalidate CloudFront cache
- **deploy-infra**: Terraform plan + apply (only when `infra/` files change or manual trigger)

---

## AWS Resources Created

| Resource              | Purpose                                      |
|-----------------------|----------------------------------------------|
| VPC                   | Network isolation with public/private subnets |
| Internet Gateway      | Public internet access for ALB                |
| NAT Gateway           | Outbound access for private subnets           |
| S3 (frontend)         | Static asset hosting for React SPA            |
| S3 (uploads)          | Image file storage for backend                |
| CloudFront            | CDN + unified routing (frontend + API)        |
| ECR                   | Docker image registry                         |
| ECS Fargate           | Serverless container orchestration            |
| ALB                   | Load balancer with health checks              |
| RDS PostgreSQL        | Managed database (Multi-AZ in prod)           |
| Secrets Manager       | DATABASE_URL and JWT_SECRET storage           |
| IAM (OIDC)           | Keyless GitHub Actions authentication         |
| Security Groups       | Network-level access control                  |
| CloudWatch Logs       | Container log aggregation                     |

## Security Highlights

- **No long-lived AWS credentials**: GitHub Actions uses OIDC federation to assume an IAM role
- **Secrets Manager**: Database URL and JWT secret injected into containers at runtime
- **Private subnets**: ECS tasks and RDS are not publicly accessible
- **S3 encryption**: All buckets use server-side encryption (AES-256)
- **S3 public access blocked**: Frontend bucket only accessible via CloudFront OAC
- **ECR image scanning**: Vulnerability scanning enabled on push
- **Immutable image tags**: ECR configured to prevent tag overwriting
- **Non-root containers**: Both Dockerfiles run as non-root users
- **Security groups**: Principle of least privilege (RDS only accepts ECS traffic)
- **Deletion protection**: Enabled on RDS and ALB in production
- **Sensitive Terraform variables**: Marked `sensitive = true` to prevent logging

## Local Development

```bash
# Backend
cd image-annotator/backend
npm install
npm run lint          # ESLint
npm test              # Vitest
npm run build         # TypeScript compilation

# Frontend
cd image-annotator/frontend
npm install
npm run lint          # ESLint
npm test              # Vitest
npm run build         # Vite production build
```
