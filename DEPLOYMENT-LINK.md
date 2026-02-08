# BSM Nexus - Live Deployment Link

## 🌐 Live Website

**BSM Nexus Control Interface is now live at:**

### 🚀 **[https://corehub.nexus](https://corehub.nexus)**

---

## About the Deployment

The BSM Nexus platform is deployed using GitHub Pages with Cloudflare DNS management:

- **Domain:** `corehub.nexus`
- **Hosting:** GitHub Pages
- **DNS Management:** Cloudflare
- **Deployment Source:** `docs/` directory from the `main` branch
- **Auto-Deploy:** Triggered on every push to `docs/**` in the main branch

## Features Available

The live website provides:

1. **BSM Nexus Control Interface** - Modern chat interface in Arabic/English
2. **Agent Management System** - View and interact with AI agents
3. **Real-time Chat** - GPT-4 powered conversational interface
4. **System Monitoring** - View system status and activity

## Technical Details

### DNS Configuration

The domain is configured via the `docs/CNAME` file:
```
corehub.nexus
```

### Cloudflare Setup

Cloudflare manages DNS records for the domain. For DNS configuration details, see:
- `dns/DNS-RECORD-TYPES.md` - DNS record types reference
- `dns/GITHUB-PAGES-VERIFICATION.md` - GitHub Pages verification guide
- `dns/lexdo-uk-zone.txt` - Zone configuration example

### Deployment Workflow

The site is automatically deployed using GitHub Actions:
- **Workflow:** `.github/workflows/pages.yml`
- **Trigger:** Push to `docs/**` on main branch or manual workflow dispatch
- **Status:** Check [Actions tab](https://github.com/LexBANK/BSM/actions/workflows/pages.yml)

## Local Development

To test the interface locally:

```bash
# Serve the docs directory
cd docs
python3 -m http.server 8000

# Visit http://localhost:8000
```

## Documentation

For more information, see:
- [README.md](README.md) - Platform overview and API endpoints
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [docs/README.md](docs/README.md) - Documentation index

---

**Last Updated:** 2026-02-08  
**Status:** ✅ Live and Active
