# 🚀 Launch GitHub Codespace for Firebase Setup

Your **GitHub Codespaces** configuration is ready! Follow these steps to launch your cloud development environment:

## ⚡ **Quick Launch Steps**

### 1. **Push Your Code to GitHub** (If not already done)

```bash
# Add all files
git add .

# Commit the devcontainer configuration
git commit -m "Add GitHub Codespaces configuration for Firebase DevOps"

# Push to GitHub
git push origin main
```

### 2. **Launch Codespace**

**Option A: From GitHub Website**
1. Go to your repository on **GitHub.com**
2. Click the **Code** button (green button)
3. Select **Codespaces** tab
4. Click **"Create codespace on main"**

**Option B: From VS Code**
1. Install the **GitHub Codespaces** extension
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: **"Codespaces: Create New Codespace"**
4. Select your repository

**Option C: Direct URL**
```
https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=YOUR_REPO_ID
```

### 3. **Wait for Setup** (2-3 minutes)

The codespace will automatically:
- ✅ Build the development container
- ✅ Install all tools (Node.js, Firebase CLI, Google Cloud CLI, Terraform)
- ✅ Install project dependencies
- ✅ Configure environment

### 4. **Start Firebase Setup**

Once your codespace loads:

```bash
# 1. Configure your GCP project
code infra/terraform/terraform.tfvars

# 2. Authenticate with Google Cloud
gcloud auth login

# 3. Run Firebase setup
setup
```

## 🛠️ **What's Included**

Your codespace comes pre-configured with:

| Tool | Purpose |
|------|---------|
| 🟢 **Node.js 20** | JavaScript runtime |
| 🔥 **Firebase CLI** | Firebase management |
| ☁️ **Google Cloud CLI** | GCP management |
| 🏗️ **Terraform** | Infrastructure as Code |
| 🔧 **VS Code Extensions** | Firebase, Terraform, TypeScript |
| ⚡ **Port Forwarding** | Web app, API, Firebase emulators |

## 🌐 **Available Services**

Once running, you'll have access to:
- **Web App**: `https://xxx-5173.app.github.dev`
- **API Server**: `https://xxx-3001.app.github.dev`
- **Firebase Emulator UI**: `https://xxx-4000.app.github.dev`

## 🔧 **Quick Commands**

```bash
setup    # Run Firebase setup script
dev      # Start development environment
tf       # Terraform shortcut
fb       # Firebase shortcut
gc       # Google Cloud shortcut
```

## 💰 **Cost Information**

**GitHub Codespaces Free Tier:**
- ✅ **120 hours/month** free for personal accounts
- ✅ **2-core machines** are sufficient for development
- ✅ **Auto-suspend** after 30 minutes of inactivity

## 🆘 **Need Help?**

1. **Documentation**: Check `.devcontainer/README.md` in your codespace
2. **Setup Issues**: Run the `setup` command for guided configuration
3. **Tool Problems**: Check the post-startup output for diagnostics

---

## **🎯 Next Steps After Codespace Launch:**

1. **Configure GCP Project** → Edit `infra/terraform/terraform.tfvars`
2. **Authenticate** → Run `gcloud auth login`
3. **Setup Firebase** → Run `./infra/scripts/setup-firebase.sh`
4. **Start Developing** → Run `./infra/scripts/dev-workflow.sh`

**Ready to launch your Firebase DevOps environment in the cloud!** 🚀 