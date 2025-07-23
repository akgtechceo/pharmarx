# PharmaRx Firebase DevOps Development Container
FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

# Install system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        curl \
        wget \
        gnupg2 \
        lsb-release \
        apt-transport-https \
        ca-certificates \
        jq \
        git \
        zip \
        unzip \
        python3 \
        python3-pip \
        build-essential

# Install Google Cloud CLI
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - \
    && apt-get update \
    && apt-get -y install google-cloud-cli \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.8.3
RUN wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | tee /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update \
    && apt-get -y install terraform \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Firebase CLI globally
RUN npm install -g firebase-tools@latest

# Install additional useful tools
RUN npm install -g @google-cloud/functions-framework \
    && npm install -g typescript \
    && npm install -g tsx \
    && npm install -g vitest

# Install gcloud components
RUN gcloud components install firebase

# Create directories for Firebase emulators
RUN mkdir -p /home/vscode/.cache/firebase/emulators \
    && chown -R vscode:vscode /home/vscode/.cache

# Set up workspace directory
WORKDIR /workspace

# Switch to vscode user
USER vscode

# Create .bashrc aliases for common commands
RUN echo 'alias tf="terraform"' >> ~/.bashrc \
    && echo 'alias fb="firebase"' >> ~/.bashrc \
    && echo 'alias gc="gcloud"' >> ~/.bashrc \
    && echo 'alias dev="./infra/scripts/dev-workflow.sh"' >> ~/.bashrc \
    && echo 'alias setup="./infra/scripts/setup-firebase.sh"' >> ~/.bashrc

# Set environment variables for development
ENV NODE_ENV=development
ENV FIREBASE_EMULATOR_HUB=localhost:4400
ENV FIRESTORE_EMULATOR_HOST=localhost:8080
ENV FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
ENV FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199

# Display versions on container start
RUN echo 'echo "🚀 PharmaRx Firebase DevOps Environment Ready!"' >> ~/.bashrc \
    && echo 'echo "📋 Installed tools:"' >> ~/.bashrc \
    && echo 'echo "  Node.js: $(node --version)"' >> ~/.bashrc \
    && echo 'echo "  npm: $(npm --version)"' >> ~/.bashrc \
    && echo 'echo "  Firebase CLI: $(firebase --version | head -1)"' >> ~/.bashrc \
    && echo 'echo "  Google Cloud CLI: $(gcloud --version | head -1)"' >> ~/.bashrc \
    && echo 'echo "  Terraform: $(terraform --version | head -1)"' >> ~/.bashrc \
    && echo 'echo ""' >> ~/.bashrc \
    && echo 'echo "🔧 Quick commands:"' >> ~/.bashrc \
    && echo 'echo "  setup    - Run Firebase setup script"' >> ~/.bashrc \
    && echo 'echo "  dev      - Start development environment"' >> ~/.bashrc \
    && echo 'echo "  tf       - Terraform shortcut"' >> ~/.bashrc \
    && echo 'echo "  fb       - Firebase shortcut"' >> ~/.bashrc \
    && echo 'echo "  gc       - Google Cloud shortcut"' >> ~/.bashrc 