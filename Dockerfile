# Multi-stage build for @profullstack/scanner
FROM ubuntu:22.04 as base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=18
ENV GO_VERSION=1.21.5

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs

# Install Go
RUN wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz

# Set Go environment
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin
ENV GOPATH=/root/go

# Install security tools
RUN apt-get update && apt-get install -y \
    nikto \
    wapiti \
    sqlmap \
    && rm -rf /var/lib/apt/lists/*

# Install Nuclei and httpx-toolkit
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    ln -s /root/go/bin/httpx /usr/local/bin/httpx-toolkit

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install Node.js dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Create scanner user for security
RUN useradd -m -s /bin/bash scanner \
    && chown -R scanner:scanner /app

# Switch to scanner user
USER scanner

# Set up scanner configuration directory
RUN mkdir -p /home/scanner/.config/scanner

# Expose port (if needed for web interface in future)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Scanner is healthy')" || exit 1

# Default command
CMD ["node", "bin/cli.js", "--help"]

# Production stage
FROM base as production

# Set production environment
ENV NODE_ENV=production

# Remove development dependencies
RUN pnpm prune --prod

# Final stage for development
FROM base as development

# Install development dependencies
RUN pnpm install

# Set development environment
ENV NODE_ENV=development

# Default to development stage
FROM development