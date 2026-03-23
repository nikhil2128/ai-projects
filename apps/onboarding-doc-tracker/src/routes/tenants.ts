import { Router, Request, Response } from 'express';
import { Tenant, CreateTenantInput } from '../types';
import {
  createTenant,
  getTenant,
  updateTenant,
  deleteTenant,
  listTenants,
} from '../services/tenant.service';
import { requireApiKey, auditLog, sanitizeErrorMessage } from '../middleware/security';
import {
  validateTenantInput,
  pickAllowedFields,
  isValidUUID,
  ValidationError,
} from '../utils/sanitize';

const router = Router();

const ALLOWED_FIELDS = [
  'companyName',
  'receivingEmail',
  'hrEmail',
  'hrUserId',
  'azureTenantId',
  'azureClientId',
  'azureClientSecret',
  'oneDriveRootFolder',
  'sesFromEmail',
];

const REQUIRED_FIELDS: (keyof CreateTenantInput)[] = [
  'companyName',
  'receivingEmail',
  'hrEmail',
  'hrUserId',
  'azureTenantId',
  'azureClientId',
  'azureClientSecret',
  'oneDriveRootFolder',
  'sesFromEmail',
];

router.use('/api/tenants', requireApiKey);

router.post('/api/tenants', async (req: Request, res: Response) => {
  try {
    const body = pickAllowedFields(req.body as Record<string, unknown>, ALLOWED_FIELDS);

    const missing = REQUIRED_FIELDS.filter((f) => !body[f as string]);
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    validateTenantInput(body as Record<string, unknown>);

    const tenant = await createTenant(body as unknown as CreateTenantInput);
    auditLog('api.tenant.created', { tenantId: tenant.tenantId }, req);
    res.status(201).json(sanitizeTenant(tenant));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: status === 500 ? sanitizeErrorMessage(error) : message });
  }
});

router.get('/api/tenants', async (_req: Request, res: Response) => {
  try {
    const tenants = await listTenants();
    res.json(tenants.map(sanitizeTenant));
  } catch (error) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

router.get('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  if (!isValidUUID(req.params.id)) {
    res.status(400).json({ error: 'Invalid tenant ID format' });
    return;
  }

  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(sanitizeTenant(tenant));
  } catch (error) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

router.put('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  if (!isValidUUID(req.params.id)) {
    res.status(400).json({ error: 'Invalid tenant ID format' });
    return;
  }

  try {
    const body = pickAllowedFields(req.body as Record<string, unknown>, ALLOWED_FIELDS);
    validateTenantInput(body as Record<string, unknown>);

    const updated = await updateTenant(req.params.id, body);
    if (!updated) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    auditLog('api.tenant.updated', { tenantId: req.params.id }, req);
    res.json(sanitizeTenant(updated));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: status === 500 ? sanitizeErrorMessage(error) : message });
  }
});

router.delete('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  if (!isValidUUID(req.params.id)) {
    res.status(400).json({ error: 'Invalid tenant ID format' });
    return;
  }

  try {
    const deleted = await deleteTenant(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    auditLog('api.tenant.deleted', { tenantId: req.params.id }, req);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

function sanitizeTenant(tenant: Tenant) {
  const { azureClientSecretArn: _, ...safe } = tenant;
  return { ...safe, azureClientSecret: '********' };
}

export default router;
