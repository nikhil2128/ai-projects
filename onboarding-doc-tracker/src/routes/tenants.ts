import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { Tenant } from '../types';
import {
  createTenant,
  getTenant,
  updateTenant,
  deleteTenant,
  listTenants,
  CreateTenantInput,
} from '../services/tenant.service';

const router = Router();

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) {
    if (config.nodeEnv === 'production') {
      res.status(500).json({ error: 'API_KEY not configured' });
      return;
    }
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== config.apiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  next();
}

router.use('/api/tenants', requireApiKey);

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

router.post('/api/tenants', async (req: Request, res: Response) => {
  const body = req.body as Partial<CreateTenantInput>;

  const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    return;
  }

  try {
    const tenant = await createTenant(body as CreateTenantInput);
    res.status(201).json(sanitizeTenant(tenant));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/api/tenants', async (_req: Request, res: Response) => {
  try {
    const tenants = await listTenants();
    res.json(tenants.map(sanitizeTenant));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

router.get('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(sanitizeTenant(tenant));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

router.put('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const updated = await updateTenant(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(sanitizeTenant(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

router.delete('/api/tenants/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const deleted = await deleteTenant(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

function sanitizeTenant(tenant: Tenant) {
  const { azureClientSecret: _, ...safe } = tenant;
  return { ...safe, azureClientSecret: '********' };
}

export default router;
