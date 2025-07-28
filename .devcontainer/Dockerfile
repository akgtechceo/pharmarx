FROM mcr.microsoft.com/devcontainers/base:debian

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    sudo \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create vscode user if it doesn't exist
RUN if ! id -u vscode >/dev/null 2>&1; then \
        groupadd --gid 1000 vscode && \
        useradd --uid 1000 --gid vscode --shell /bin/bash --create-home vscode && \
        echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/vscode && \
        chmod 0440 /etc/sudoers.d/vscode; \
    fi

# Set the default user
USER vscode
WORKDIR /workspaces 