# PharmaRx Firebase DevOps - GitHub Codespaces

This directory contains the **GitHub Codespaces** configuration for the **PharmaRx** project, providing a complete cloud-based development environment with all necessary tools pre-installed.

## 🚀 Quick Start

### 1. Launch Codespace

**From GitHub Web Interface:**
1. Go to your PharmaRx repository on GitHub
2. Click the **Code** button (green button)
3. Select **Codespaces** tab
4. Click **Create codespace on main**

**From VS Code:**
1. Install the **GitHub Codespaces** extension
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run **Codespaces: Create New Codespace**
4. Select your PharmaRx repository

**From GitHub CLI:**
```bash
gh codespace create --repo your-username/PharmaRx
```

### 2. Wait for Environment Setup

The codespace will automatically:
- ✅ Install all required tools (Node.js, Firebase CLI, Google Cloud CLI, Terraform)
- ✅ Install project dependencies
- ✅ Configure development environment
- ✅ Set up Firebase emulator configuration
- ✅ Create helpful command aliases

### 3. Configure Your Project

Once the codespace is ready:

1. **Configure Terraform variables:**
   ```bash
   # Edit with your actual GCP project details
   code infra/terraform/terraform.tfvars
   ```

2. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth login
   ```

3. **Set up Firebase infrastructure:**
   ```bash
   ./infra/scripts/setup-firebase.sh
   ```

## 🛠️ Pre-installed Tools

Your codespace comes with these tools ready to use:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime |
| **npm** | Latest | Package manager |
| **Firebase CLI** | Latest | Firebase management |
| **Google Cloud CLI** | Latest | GCP management |
| **Terraform** | 1.8.3 | Infrastructure as Code |
| **jq** | Latest | JSON processing |
| **TypeScript** | Latest | Type-safe JavaScript |
| **Git** | Latest | Version control |

## 🔧 Quick Commands

Your codespace includes helpful aliases:

```bash
# Firebase setup and deployment
setup           # Run Firebase setup script
dev             # Start development environment

# Tool shortcuts
tf              # Terraform shortcut
fb              # Firebase shortcut  
gc              # Google Cloud shortcut

# Check tool versions
node --version
npm --version
firebase --version
gcloud --version
terraform --version
```

## 🌐 Port Forwarding

The following ports are automatically forwarded:

| Port | Service | URL |
|------|---------|-----|
| **5173** | Web App (Vite) | `https://xxx-5173.app.github.dev` |
| **3001** | API Server | `https://xxx-3001.app.github.dev` |
| **4000** | Firebase Emulator UI | `https://xxx-4000.app.github.dev` |
| **8080** | Firestore Emulator | `localhost:8080` |
| **9099** | Auth Emulator | `localhost:9099` |
| **9199** | Storage Emulator | `localhost:9199` |

## 📁 Workspace Structure

```
/workspace/                 # Your project root
├── .devcontainer/         # Codespace configuration
│   ├── devcontainer.json  # Main configuration
│   ├── Dockerfile         # Container definition
│   ├── setup.sh          # Post-create setup
│   └── post-start.sh     # Startup script
├── apps/                  # Application code
├── infra/                 # Infrastructure code
└── docs/                  # Documentation
```

## 🔐 Authentication & Security

### Google Cloud Authentication

Your codespace provides secure authentication:

1. **Interactive Login:**
   ```bash
   gcloud auth login
   ```
   This opens a browser for OAuth authentication.

2. **Application Default Credentials:**
   ```bash
   gcloud auth application-default login
   ```
   This sets up credentials for Terraform and other tools.

### Firebase Authentication

```bash
# Login to Firebase
firebase login

# Use specific project
firebase use your-project-id
```

### Environment Variables

The codespace automatically sets:

```bash
NODE_ENV=development
FIREBASE_EMULATOR_HUB=localhost:4400
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

## 🧪 Firebase Emulators

Firebase emulators are pre-configured and ready to use:

### Start Emulators
```bash
firebase emulators:start
```

### Emulator Services
- **Firestore**: http://localhost:8080
- **Authentication**: http://localhost:9099  
- **Storage**: http://localhost:9199
- **Emulator UI**: http://localhost:4000

### Emulator Data Persistence

Emulator data is stored in:
```bash
/workspace/.firebase/
```

## 📦 Package Management

### Install Dependencies
```bash
# Root dependencies
npm install

# Application-specific
npm install --workspace=apps/web
npm install --workspace=apps/api
```

### Development Scripts
```bash
# Start web app
npm run dev --workspace=apps/web

# Start API server  
npm run dev --workspace=apps/api

# Run tests
npm test --workspace=apps/web
npm test --workspace=apps/api
```

## 🐛 Troubleshooting

### Common Issues

**1. "gcloud not authenticated"**
```bash
gcloud auth list
gcloud auth login
```

**2. "Firebase project not configured"**
```bash
firebase projects:list
firebase use --add
```

**3. "Ports not accessible"**
Check the **Ports** tab in VS Code and ensure ports are public.

**4. "Emulators won't start"**
```bash
firebase emulators:kill
firebase emulators:start --debug
```

**5. "Terraform authentication failed"**
```bash
gcloud auth application-default login
```

### Debug Commands

```bash
# Check environment
echo $NODE_ENV
env | grep FIREBASE

# Check tool installations
which node firebase gcloud terraform

# Check network connectivity
curl -I https://firebase.googleapis.com
curl -I https://googleapis.com
```

### Logs and Monitoring

```bash
# View Firebase logs
firebase emulators:export ./backup
firebase emulators:start --debug

# View application logs
tail -f logs/app.log
```

## 🔄 Codespace Lifecycle

### Suspend/Resume
Codespaces automatically suspend after 30 minutes of inactivity and resume quickly when you return.

### Rebuild Container
If you modify `.devcontainer/` files:
```bash
# Command Palette: Codespaces: Rebuild Container
```

### Delete Codespace
When finished:
1. Go to GitHub → Settings → Codespaces
2. Delete unused codespaces to avoid charges

## 💰 Cost Optimization

### Free Tier
- **Personal accounts**: 120 hours/month free
- **2-core machines**: Sufficient for development

### Best Practices
1. **Stop codespaces** when not in use
2. **Use 2-core machines** for development
3. **Delete old codespaces** regularly
4. **Use prebuilds** for faster startup

## 🆘 Support

### Documentation
- [GitHub Codespaces Docs](https://docs.github.com/en/codespaces)
- [Firebase Setup Guide](../docs/firebase-setup.md)

### Getting Help
1. Check the **post-start.sh** output for environment status
2. Run `setup` command for guided setup
3. Check repository issues for common problems

---

**🎉 Ready to start developing!** Your Firebase DevOps environment is fully configured and ready for development. 