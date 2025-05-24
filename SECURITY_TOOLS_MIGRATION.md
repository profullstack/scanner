# Security Tools Migration Guide

## Overview
This document outlines the migration from outdated security tools to modern, actively maintained alternatives in the @profullstack/scanner project.

## Migration Summary

### ❌ Removed (Outdated)
- **zap-cli** - Last updated 11 years ago, incompatible with Python 3.13

### ✅ Added (Modern Alternatives)

| Tool | Version | Purpose | Why Better |
|------|---------|---------|------------|
| **Nuclei** | v3.4.4 | Template-based vulnerability scanner | 10,000+ templates, actively maintained, fast |
| **httpx-toolkit** | v1.7.0 | HTTP probe and discovery | Modern HTTP toolkit, great for reconnaissance |
| **Nikto** | v2.5.0 | Web server scanner | Well-established, regularly updated |
| **Nmap** | v7.95 | Network discovery and security auditing | Industry standard, constantly updated |
| **SQLMap** | Latest | SQL injection testing | Comprehensive SQL injection tool |

## Installation

### Quick Install (All Tools)
```bash
./bin/install-security-tools.sh --all
```

### Selective Install
```bash
# Install only modern core tools
./bin/install-security-tools.sh --nuclei --httpx

# Install specific tools
./bin/install-security-tools.sh --nikto --nuclei --httpx
```

## Usage Examples

### Replace zap-cli workflows with modern alternatives:

#### Old zap-cli workflow:
```bash
# This no longer works due to Python 3.13 compatibility issues
zap-cli quick-scan https://example.com
```

#### New modern workflow:
```bash
# Discovery and reconnaissance
httpx-toolkit -u https://example.com -tech-detect

# Comprehensive vulnerability scanning
nuclei -u https://example.com -s medium,high,critical

# Web server specific checks
nikto -h https://example.com

# Network-level scanning
nmap -sC -sV example.com
```

## Platform Support

### Arch Linux (Current)
- Uses `yay` AUR helper for modern tools
- Installs `nuclei`, `nuclei-templates`, `httpx-bin`
- Fallback to `pacman` for standard tools

### Ubuntu/Debian
- Downloads latest releases from GitHub
- Uses `apt` for standard tools
- Go-based tools installed via `go install`

### macOS
- Uses Homebrew for all tools
- Creates compatibility aliases where needed

### Windows (WSL)
- Uses Chocolatey package manager
- Python tools via pip in virtual environments

## Benefits of Migration

1. **Compatibility**: All tools work with Python 3.13 and modern systems
2. **Performance**: Modern tools are significantly faster
3. **Templates**: Nuclei provides 10,000+ vulnerability detection templates
4. **Maintenance**: All tools are actively maintained and updated
5. **Features**: Better output formats (JSON, JSONL, HTML, Markdown, SARIF)

## Troubleshooting

If you encounter issues with the old zap-cli:
1. Uninstall it: `pipx uninstall zapcli` or `pip uninstall zapcli`
2. Install modern alternatives: `./bin/install-security-tools.sh --all`
3. Update your scanning workflows to use the new tools

## Configuration Files

The installation script automatically:
- Adds tools to PATH
- Creates necessary symlinks
- Installs templates and dependencies
- Provides troubleshooting guidance

For manual PATH configuration:
```bash
export PATH=$PATH:$HOME/.local/bin:$HOME/go/bin