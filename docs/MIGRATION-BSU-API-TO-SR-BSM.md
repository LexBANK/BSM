# Migration Guide: bsu-api → SR.BSM

## Overview

This guide helps you migrate from the legacy `bsu-api` service configuration to the new **SR.BSM** (Strategic Resources - Business Service Management) configuration.

## What Changed

### Service Name
- **Old**: `bsu-api`
- **New**: `SR.BSM`

### Region
- **Old**: Frankfurt (or variable)
- **New**: Virginia

### Domains
- **Old**: Limited domain support
- **New**: Multiple domains:
  - corehub.nexus
  - www.corehub.nexus
  - lexprim.com
  - www.lexprim.com

### Auto Deploy
- **Old**: On (automatic deployment on git push)
- **New**: Off (manual deployment control)

### Environment Variables
**New variables added**:
- `SR.BSM.env` - Service-specific configuration
- `RENDER_DEPLOY_HOOK` - Webhook URL for programmatic deployments

**Updated variables**:
- `CORS_ORIGINS` - Now includes corehub.nexus domains

## Migration Steps

### Step 1: Backup Current Configuration

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Select your current service (`bsu-api`)
3. Go to Environment tab
4. Export/copy all current environment variables to a secure location

### Step 2: Update Environment Variables

Add new variables in Render Environment:

```bash
# New required variable
SR.BSM.env=production

# Get deployment webhook URL from Render Settings
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxxxx?key=xxxxx

# Update CORS_ORIGINS to include new domains
CORS_ORIGINS=https://www.lexdo.uk,https://lexdo.uk,https://lexprim.com,https://www.lexprim.com,https://corehub.nexus,https://www.corehub.nexus
```

### Step 3: Update Service Settings

In Render Dashboard → Settings:

1. **Service Name**: Update to `SR.BSM`
2. **Region**: Change to `Virginia` (will require redeployment)
3. **Auto Deploy**: Disable (set to Off)

**Note**: Changing the region may cause a brief service interruption.

### Step 4: Configure Custom Domains

Add custom domains in Settings → Custom Domains:

1. Add `corehub.nexus`
2. Add `www.corehub.nexus`
3. Add `lexprim.com` (if not already configured)
4. Add `www.lexprim.com` (if not already configured)

For each domain, update DNS records as instructed by Render.

### Step 5: Update DNS Configuration

#### For corehub.nexus domains

In your DNS provider (Cloudflare recommended):

```
Type: CNAME
Name: corehub.nexus (or @)
Target: sr-bsm.onrender.com
Proxy: ✓ Proxied

Type: CNAME
Name: www.corehub.nexus (or www)
Target: sr-bsm.onrender.com
Proxy: ✓ Proxied
```

#### Update existing domains

Ensure all existing domains point to the correct Render service URL.

### Step 6: Update GitHub Webhooks

If using GitHub webhooks:

1. Go to GitHub repository Settings → Webhooks
2. Update existing webhook URL to use new domain:
   - **Old**: `https://sr-bsm.onrender.com/webhook/github`
   - **New**: `https://corehub.nexus/webhook/github`

### Step 7: Manual Deployment

Since auto-deploy is now disabled:

1. Go to Render Dashboard
2. Click "Manual Deploy"
3. Select branch `main`
4. Click "Deploy"

### Step 8: Verify Deployment

```bash
# Test health endpoint
curl https://corehub.nexus/api/health

# Test agents endpoint
curl https://corehub.nexus/api/agents

# Test all domains
curl https://www.corehub.nexus/api/health
curl https://lexprim.com/api/health
curl https://www.lexprim.com/api/health
```

### Step 9: Update Local Environment

Update your local `.env` file (development only):

```bash
# Update CORS_ORIGINS
CORS_ORIGINS=https://www.lexdo.uk,https://lexdo.uk,https://lexprim.com,https://www.lexprim.com,https://corehub.nexus,https://www.corehub.nexus
```

### Step 10: Update PM2 Configuration (if self-hosting)

If using PM2 for process management:

```bash
# Stop old process
pm2 stop bsu-api
pm2 delete bsu-api

# Start with new name
pm2 start src/server.js --name SR.BSM
pm2 save

# Monitor
pm2 status
pm2 logs SR.BSM
```

## Rollback Plan

If you need to rollback to the old configuration:

### Render Service Rollback

1. Go to Render Dashboard → Deploys
2. Find the last successful deployment before migration
3. Click "Rollback to this version"

### Environment Variables Rollback

1. Remove new variables:
   - `SR.BSM.env`
   - `RENDER_DEPLOY_HOOK`

2. Restore old `CORS_ORIGINS`:
```bash
CORS_ORIGINS=https://www.lexdo.uk,https://lexdo.uk,https://lexprim.com,https://www.lexprim.com
```

### Service Settings Rollback

1. **Service Name**: Revert to `bsu-api`
2. **Auto Deploy**: Re-enable (set to On)
3. **Region**: Change back to Frankfurt (if needed)

## Testing Checklist

After migration, verify:

- [ ] Health endpoint responds: `curl https://corehub.nexus/api/health`
- [ ] Agents endpoint responds: `curl https://corehub.nexus/api/agents`
- [ ] All domains respond correctly (corehub.nexus, lexprim.com, etc.)
- [ ] CORS works for all frontend domains
- [ ] GitHub webhooks deliver successfully
- [ ] Admin endpoints accessible with correct token
- [ ] Chat functionality works end-to-end
- [ ] No console errors in frontend
- [ ] SSL certificates valid for all domains
- [ ] Response times acceptable
- [ ] No 500 errors in logs

## Common Issues

### Issue: CORS errors after migration

**Cause**: `CORS_ORIGINS` not updated with new domains

**Fix**:
```bash
# In Render Environment
CORS_ORIGINS=https://www.lexdo.uk,https://lexdo.uk,https://lexprim.com,https://www.lexprim.com,https://corehub.nexus,https://www.corehub.nexus

# Redeploy service
```

### Issue: Webhook 404 errors

**Cause**: GitHub webhook still using old URL

**Fix**:
1. Update webhook URL in GitHub to use new domain
2. Test webhook delivery in GitHub webhook settings

### Issue: Service name not changed in logs

**Cause**: Service name cached or not properly updated

**Fix**:
1. Redeploy service manually
2. Check Render logs for correct service name

### Issue: DNS propagation delays

**Cause**: DNS changes take time to propagate globally

**Fix**:
- Wait 24-48 hours for full DNS propagation
- Use DNS checker tools to verify propagation
- Clear local DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (macOS)

### Issue: Manual deployment confusion

**Cause**: Auto-deploy now disabled

**Fix**:
- Use "Manual Deploy" button in Render dashboard
- Or trigger via webhook: `curl -X POST $RENDER_DEPLOY_HOOK`
- Set up CI/CD automation if needed

## Best Practices

1. **Test in development first**: Update local environment before production
2. **Schedule migration**: Choose low-traffic time window
3. **Monitor closely**: Watch logs for 24 hours after migration
4. **Keep backup**: Export all environment variables before changes
5. **Document changes**: Keep migration log for reference
6. **Notify team**: Inform team members of domain and configuration changes

## Performance Considerations

### Region Change Impact

Moving from Frankfurt to Virginia may affect latency for European users:

**Before**: ~50ms RTT for EU users  
**After**: ~100-150ms RTT for EU users

**Mitigation options**:
- Use CDN (Cloudflare) for static assets
- Enable Cloudflare caching for API responses where appropriate
- Consider multi-region deployment if latency is critical

### Domain Impact

Multiple custom domains have minimal performance impact:
- Render handles domain routing efficiently
- SSL termination overhead negligible
- No additional latency expected

## Support

If you encounter issues during migration:

1. **Check logs**: Render Dashboard → Logs
2. **Review documentation**: [SR.BSM Deployment Guide](./SR-BSM-DEPLOYMENT.md)
3. **Test endpoints**: Use curl commands from this guide
4. **GitHub Issues**: [Open an issue](https://github.com/LexBANK/BSM/issues)
5. **Rollback**: Use rollback plan if needed

## Related Documentation

- [SR.BSM Deployment Guide](./SR-BSM-DEPLOYMENT.md)
- [Render Deployment (Arabic)](./RENDER-DEPLOYMENT-AR.md)
- [GitHub Webhook Setup](./GITHUB-WEBHOOK-SETUP.md)
- [Environment Variables Reference](../.env.example)

---

**Migration Version**: 1.0  
**Last Updated**: 2026-02-13  
**Prepared by**: BSU Autonomous Architect
