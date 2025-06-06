#!/bin/bash

# Script to install modern security tools for @profullstack/scanner
# Replaces outdated tools like zap-cli with actively maintained alternatives
# Tools: Nuclei, httpx-toolkit, Nikto, Nmap, SQLMap, Wapiti
# Supports: macOS, Linux (Ubuntu/Debian, CentOS/RHEL, Arch), Windows (via WSL)

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Default settings
FORCE_REINSTALL=false
INSTALL_ALL=true
INSTALL_NIKTO=false
INSTALL_HTTPX=false
INSTALL_WAPITI=false
INSTALL_NUCLEI=false
INSTALL_SQLMAP=false

# Function to print messages
print_message() {
  echo -e "${BOLD}${2}${1}${RESET}"
}

# Function to run command and show it
run_command() {
  local cmd="$1"
  local description="$2"
  
  if [ -n "$description" ]; then
    print_message "$description" "${BLUE}"
  fi
  
  print_message "Running: $cmd" "${YELLOW}"
  
  if eval "$cmd"; then
    print_message "✓ Command succeeded" "${GREEN}"
    return 0
  else
    print_message "✗ Command failed with exit code $?" "${RED}"
    return 1
  fi
}

# Function to print usage information
print_usage() {
  print_message "Usage: $0 [OPTIONS]" "${BLUE}"
  print_message "Options:" "${BLUE}"
  print_message "  --all         Install all security tools (default)" "${BLUE}"
  print_message "  --nikto       Install only Nikto" "${BLUE}"
  print_message "  --httpx       Install only httpx-toolkit" "${BLUE}"
  print_message "  --wapiti      Install only Wapiti" "${BLUE}"
  print_message "  --nuclei      Install only Nuclei" "${BLUE}"
  print_message "  --sqlmap      Install only SQLMap" "${BLUE}"
  print_message "  --force       Force reinstall even if tools are already installed" "${BLUE}"
  print_message "  --help        Display this help message" "${BLUE}"
  print_message "" ""
  print_message "Examples:" "${BLUE}"
  print_message "  $0 --all                    # Install all tools" "${BLUE}"
  print_message "  $0 --nikto --nuclei         # Install only Nikto and Nuclei" "${BLUE}"
  print_message "  $0 --httpx --nuclei         # Install only httpx-toolkit and Nuclei" "${BLUE}"
  print_message "  $0 --force --all            # Force reinstall all tools" "${BLUE}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if Go is installed
check_go() {
  if command_exists go; then
    GO_VERSION=$(go version | awk '{print $3}')
    print_message "Go is installed: ${GO_VERSION}" "${GREEN}"
    return 0
  else
    print_message "Go is not installed. Required for Nuclei." "${YELLOW}"
    return 1
  fi
}

# Function to check if Python/pip is installed
check_python() {
  if command_exists python3 && command_exists pip3; then
    PYTHON_VERSION=$(python3 --version)
    print_message "Python is installed: ${PYTHON_VERSION}" "${GREEN}"
    return 0
  elif command_exists python && command_exists pip; then
    PYTHON_VERSION=$(python --version)
    print_message "Python is installed: ${PYTHON_VERSION}" "${GREEN}"
    return 0
  else
    print_message "Python/pip is not installed. Required for ZAP CLI." "${YELLOW}"
    return 1
  fi
}

# Function to check if a tool is installed
check_tool() {
  local tool=$1
  case $tool in
    nikto)
      if command_exists nikto; then
        NIKTO_VERSION=$(nikto -Version 2>/dev/null | head -n 1 || echo "Nikto (version unknown)")
        print_message "Nikto is installed: ${NIKTO_VERSION}" "${GREEN}"
        return 0
      fi
      ;;
    httpx-toolkit)
      if command_exists httpx-toolkit; then
        HTTPX_VERSION=$(httpx-toolkit -version 2>/dev/null | grep "Current Version" | awk '{print $3}' || echo "httpx-toolkit (version unknown)")
        print_message "httpx-toolkit is installed: ${HTTPX_VERSION}" "${GREEN}"
        return 0
      fi
      ;;
    wapiti)
      if command_exists wapiti; then
        WAPITI_VERSION=$(wapiti --version 2>/dev/null | head -n 1 || echo "Wapiti (version unknown)")
        print_message "Wapiti is installed: ${WAPITI_VERSION}" "${GREEN}"
        return 0
      fi
      ;;
    nuclei)
      if command_exists nuclei; then
        NUCLEI_VERSION=$(nuclei -version 2>/dev/null || echo "Nuclei (version unknown)")
        print_message "Nuclei is installed: ${NUCLEI_VERSION}" "${GREEN}"
        return 0
      fi
      ;;
    sqlmap)
      if command_exists sqlmap; then
        SQLMAP_VERSION=$(sqlmap --version 2>/dev/null | head -n 1 || echo "SQLMap (version unknown)")
        print_message "SQLMap is installed: ${SQLMAP_VERSION}" "${GREEN}"
        return 0
      fi
      ;;
  esac
  return 1
}

# Function to install tools on Ubuntu/Debian
install_tools_debian() {
  print_message "Installing modern security tools on Ubuntu/Debian..." "${BLUE}"
  
  # Update package list
  run_command "sudo apt-get update" "Updating package list"
  
  # Install base requirements
  run_command "sudo apt-get install -y curl wget nmap" "Installing base requirements"
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    run_command "sudo apt-get install -y nikto" "Installing Nikto"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_HTTPX" = true ]; then
    print_message "Installing httpx-toolkit..." "${BLUE}"
    
    # Install Go-based httpx-toolkit
    run_command "wget -O /tmp/httpx.tar.gz https://github.com/projectdiscovery/httpx/releases/latest/download/httpx_*_linux_amd64.tar.gz" "Downloading httpx-toolkit"
    run_command "tar -xzf /tmp/httpx.tar.gz -C /tmp/" "Extracting httpx-toolkit"
    run_command "sudo mv /tmp/httpx /usr/local/bin/httpx-toolkit" "Installing httpx-toolkit"
    run_command "sudo chmod +x /usr/local/bin/httpx-toolkit" "Making httpx-toolkit executable"
    
    # Install Python-based httpx in virtual environment
    print_message "Installing Python httpx in virtual environment..." "${BLUE}"
    run_command "python3 -m venv myenv" "Creating Python virtual environment"
    run_command "source myenv/bin/activate && pip install httpx && deactivate" "Installing httpx in virtual environment"
    print_message "Python httpx installed in myenv/ directory. Activate with: source myenv/bin/activate" "${GREEN}"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    run_command "sudo apt-get install -y wapiti" "Installing Wapiti"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    run_command "sudo apt-get install -y sqlmap" "Installing SQLMap"
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      run_command "sudo apt-get install -y golang-go" "Installing Go for Nuclei"
    fi
    run_command "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" "Installing Nuclei"
    
    # Add Go bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/go/bin:"* ]]; then
      echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
      export PATH=$PATH:$HOME/go/bin
    fi
  fi
}

# Function to install tools on CentOS/RHEL
install_tools_centos() {
  print_message "Installing security tools on CentOS/RHEL..." "${BLUE}"
  
  # Enable EPEL repository
  run_command "sudo yum install -y epel-release" "Enabling EPEL repository"
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    run_command "sudo yum install -y nikto" "Installing Nikto"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    run_command "sudo yum install -y wapiti" "Installing Wapiti"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    run_command "sudo yum install -y sqlmap" "Installing SQLMap"
  fi
  
  # Install Python and pip if needed for ZAP CLI
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      run_command "sudo yum install -y golang" "Installing Go for Nuclei"
    fi
    run_command "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" "Installing Nuclei"
    
    # Add Go bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/go/bin:"* ]]; then
      echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
      export PATH=$PATH:$HOME/go/bin
    fi
  fi
}

# Function to install tools on Arch Linux
install_tools_arch() {
  print_message "Installing modern security tools on Arch Linux..." "${BLUE}"
  
  # Check if yay is available for AUR packages
  if ! command_exists yay; then
    print_message "yay AUR helper not found. Installing yay first..." "${YELLOW}"
    run_command "sudo pacman -S --needed --noconfirm base-devel git" "Installing base-devel and git"
    run_command "git clone https://aur.archlinux.org/yay.git /tmp/yay" "Cloning yay repository"
    run_command "cd /tmp/yay && makepkg -si --noconfirm" "Building and installing yay"
  fi
  
  # Update package database
  run_command "sudo pacman -Sy" "Updating package database"
  
  # Install base requirements
  run_command "sudo pacman -S --needed --noconfirm python python-pipx nmap" "Installing base requirements"
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    run_command "sudo pacman -S --needed --noconfirm nikto" "Installing Nikto"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_HTTPX" = true ]; then
    print_message "Installing httpx-toolkit from AUR..." "${BLUE}"
    run_command "yay -S --needed --noconfirm httpx-bin" "Installing httpx-toolkit"
    
    # Install Python-based httpx in virtual environment
    print_message "Installing Python httpx in virtual environment..." "${BLUE}"
    run_command "python -m venv myenv" "Creating Python virtual environment"
    run_command "source myenv/bin/activate && pip install httpx && deactivate" "Installing httpx in virtual environment"
    print_message "Python httpx installed in myenv/ directory. Activate with: source myenv/bin/activate" "${GREEN}"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    # Try package manager first, then pipx as fallback
    if ! run_command "sudo pacman -S --needed --noconfirm wapiti" "Installing Wapiti from pacman"; then
      print_message "Wapiti not available in pacman, trying pipx..." "${YELLOW}"
      if ! run_command "pipx install wapiti3" "Installing Wapiti via pipx"; then
        print_message "Trying manual virtual environment for Wapiti..." "${YELLOW}"
        run_command "python -m venv ~/.local/venv/wapiti" "Creating virtual environment for Wapiti"
        run_command "~/.local/venv/wapiti/bin/pip install wapiti3" "Installing Wapiti in virtual environment"
        
        # Create symlink
        mkdir -p ~/.local/bin
        run_command "ln -sf ~/.local/venv/wapiti/bin/wapiti ~/.local/bin/wapiti" "Creating symlink for Wapiti"
      fi
    fi
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    run_command "sudo pacman -S --needed --noconfirm sqlmap" "Installing SQLMap"
  fi
  
  # Install Nuclei from AUR (modern approach)
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    print_message "Installing Nuclei and templates from AUR..." "${BLUE}"
    run_command "yay -S --needed --noconfirm nuclei nuclei-templates" "Installing Nuclei and templates"
  fi
  
  # Ensure ~/.local/bin is in PATH for pipx and manual installs
  if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
    export PATH=$PATH:$HOME/.local/bin
    print_message "Added ~/.local/bin to PATH in ~/.bashrc" "${GREEN}"
  fi
  
  # Ensure pipx bin directory is in PATH
  if command_exists pipx; then
    PIPX_BIN_DIR=$(pipx environment --value PIPX_BIN_DIR 2>/dev/null || echo "$HOME/.local/bin")
    if [[ ":$PATH:" != *":$PIPX_BIN_DIR:"* ]]; then
      echo "export PATH=\$PATH:$PIPX_BIN_DIR" >> ~/.bashrc
      export PATH=$PATH:$PIPX_BIN_DIR
      print_message "Added pipx bin directory to PATH in ~/.bashrc" "${GREEN}"
    fi
  fi
  
  print_message "Note: You may need to restart your terminal or run 'source ~/.bashrc' for PATH changes to take effect." "${YELLOW}"
}

# Function to install tools on macOS
install_tools_macos() {
  print_message "Installing modern security tools on macOS..." "${BLUE}"
  
  if ! command_exists brew; then
    print_message "Homebrew is not installed. Please install Homebrew first:" "${YELLOW}"
    print_message "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  run_command "brew update" "Updating Homebrew"
  
  # Install base requirements
  run_command "brew install nmap" "Installing base requirements"
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    run_command "brew install nikto" "Installing Nikto"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_HTTPX" = true ]; then
    print_message "Installing httpx-toolkit..." "${BLUE}"
    run_command "brew install httpx" "Installing httpx-toolkit via Homebrew"
    # Create alias for consistency
    run_command "ln -sf /opt/homebrew/bin/httpx /opt/homebrew/bin/httpx-toolkit" "Creating httpx-toolkit alias"
    
    # Install Python-based httpx in virtual environment
    print_message "Installing Python httpx in virtual environment..." "${BLUE}"
    run_command "python3 -m venv myenv" "Creating Python virtual environment"
    run_command "source myenv/bin/activate && pip install httpx && deactivate" "Installing httpx in virtual environment"
    print_message "Python httpx installed in myenv/ directory. Activate with: source myenv/bin/activate" "${GREEN}"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    run_command "brew install wapiti" "Installing Wapiti"
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    run_command "brew install sqlmap" "Installing SQLMap"
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      run_command "brew install go" "Installing Go for Nuclei"
    fi
    run_command "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" "Installing Nuclei"
    
    # Add Go bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/go/bin:"* ]]; then
      echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.zshrc
      export PATH=$PATH:$HOME/go/bin
    fi
  fi
}

# Function to install tools on Windows (via Chocolatey)
install_tools_windows() {
  print_message "Installing security tools on Windows..." "${BLUE}"
  
  if ! command_exists choco; then
    print_message "Chocolatey is not installed. Please install Chocolatey first:" "${YELLOW}"
    print_message "  Run PowerShell as Administrator and execute:" "${YELLOW}"
    print_message "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    print_message "Installing Nikto..." "${BLUE}"
    choco install nikto -y
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    print_message "Installing SQLMap..." "${BLUE}"
    choco install sqlmap -y
  fi
  
  # Install Python and pip if needed for ZAP CLI and Wapiti
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    print_message "Installing Python..." "${BLUE}"
    choco install python -y
    
    if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ]; then
    fi
    
    if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
      print_message "Installing Wapiti..." "${BLUE}"
      pip install wapiti3
    fi
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      print_message "Installing Go for Nuclei..." "${BLUE}"
      choco install golang -y
    fi
    print_message "Installing Nuclei..." "${BLUE}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_HTTPX" = true ]; then
    # Install Python-based httpx in virtual environment
    print_message "Installing Python httpx in virtual environment..." "${BLUE}"
    run_command "python -m venv myenv" "Creating Python virtual environment"
    run_command "myenv\\Scripts\\activate.bat && pip install httpx && deactivate" "Installing httpx in virtual environment"
    print_message "Python httpx installed in myenv/ directory. Activate with: myenv\\Scripts\\activate.bat" "${GREEN}"
  fi
  
  print_message "You may need to restart your terminal for the changes to take effect." "${YELLOW}"
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --all)
      INSTALL_ALL=true
      shift
      ;;
    --nikto)
      INSTALL_ALL=false
      INSTALL_NIKTO=true
      shift
      ;;
    --httpx)
      INSTALL_ALL=false
      INSTALL_HTTPX=true
      shift
      ;;
    --wapiti)
      INSTALL_ALL=false
      INSTALL_WAPITI=true
      shift
      ;;
    --nuclei)
      INSTALL_ALL=false
      INSTALL_NUCLEI=true
      shift
      ;;
    --sqlmap)
      INSTALL_ALL=false
      INSTALL_SQLMAP=true
      shift
      ;;
    --force)
      FORCE_REINSTALL=true
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      # Unknown option
      print_message "Unknown option: $arg" "${RED}"
      print_usage
      exit 1
      ;;
  esac
done

# Main script execution
print_message "Security Tools Installation Script for @profullstack/scanner" "${BOLD}"
echo ""

# Check if tools are already installed (unless force flag is set)
if [ "$FORCE_REINSTALL" = false ]; then
  print_message "Checking for existing installations..." "${BLUE}"
  
  tools_to_check=()
  if [ "$INSTALL_ALL" = true ]; then
    tools_to_check=("nikto" "httpx-toolkit" "wapiti" "nuclei" "sqlmap")
  else
    [ "$INSTALL_NIKTO" = true ] && tools_to_check+=("nikto")
    [ "$INSTALL_HTTPX" = true ] && tools_to_check+=("httpx-toolkit")
    [ "$INSTALL_WAPITI" = true ] && tools_to_check+=("wapiti")
    [ "$INSTALL_NUCLEI" = true ] && tools_to_check+=("nuclei")
    [ "$INSTALL_SQLMAP" = true ] && tools_to_check+=("sqlmap")
  fi
  
  all_installed=true
  for tool in "${tools_to_check[@]}"; do
    if ! check_tool "$tool"; then
      all_installed=false
    fi
  done
  
  if [ "$all_installed" = true ]; then
    print_message "All requested tools are already installed!" "${GREEN}"
    exit 0
  fi
else
  print_message "Force flag detected. Proceeding with installation regardless of existing tools." "${YELLOW}"
fi

# Detect operating system and install tools
OS="$(uname -s)"
case "${OS}" in
  Darwin*)
    print_message "Detected macOS system." "${BLUE}"
    install_tools_macos
    ;;
  Linux*)
    # Check for specific Linux distributions
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID_LIKE" == *"debian"* ]]; then
        print_message "Detected Ubuntu/Debian system." "${BLUE}"
        install_tools_debian
      elif [[ "$ID" == "centos" || "$ID" == "rhel" || "$ID" == "fedora" || "$ID_LIKE" == *"rhel"* ]]; then
        print_message "Detected CentOS/RHEL/Fedora system." "${BLUE}"
        install_tools_centos
      elif [[ "$ID" == "arch" || "$ID_LIKE" == *"arch"* ]]; then
        print_message "Detected Arch Linux system." "${BLUE}"
        install_tools_arch
      else
        print_message "Unsupported Linux distribution: $ID" "${YELLOW}"
        print_message "Please install security tools manually." "${YELLOW}"
        exit 1
      fi
    else
      print_message "Unable to determine Linux distribution." "${YELLOW}"
      print_message "Please install security tools manually." "${YELLOW}"
      exit 1
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    print_message "Detected Windows system." "${BLUE}"
    install_tools_windows
    ;;
  *)
    print_message "Unsupported operating system: ${OS}" "${RED}"
    print_message "Please install security tools manually." "${YELLOW}"
    exit 1
    ;;
esac

# Final check
print_message "Verifying installations..." "${BLUE}"
echo ""

tools_to_verify=()
if [ "$INSTALL_ALL" = true ]; then
  tools_to_verify=("nikto" "httpx-toolkit" "wapiti" "nuclei" "sqlmap")
else
  [ "$INSTALL_NIKTO" = true ] && tools_to_verify+=("nikto")
  [ "$INSTALL_HTTPX" = true ] && tools_to_verify+=("httpx-toolkit")
  [ "$INSTALL_WAPITI" = true ] && tools_to_verify+=("wapiti")
  [ "$INSTALL_NUCLEI" = true ] && tools_to_verify+=("nuclei")
  [ "$INSTALL_SQLMAP" = true ] && tools_to_verify+=("sqlmap")
fi

all_working=true
for tool in "${tools_to_verify[@]}"; do
  if check_tool "$tool"; then
    print_message "✓ $tool is working" "${GREEN}"
  else
    print_message "✗ $tool is not working properly" "${RED}"
    
    # Show troubleshooting info
    case $tool in
      httpx-toolkit)
        print_message "  Troubleshooting httpx-toolkit:" "${YELLOW}"
        print_message "  - For Arch Linux, try: yay -S httpx-bin" "${YELLOW}"
        print_message "  - Check if /usr/bin is in your PATH: echo \$PATH" "${YELLOW}"
        print_message "  - Try running: httpx-toolkit -version" "${YELLOW}"
        print_message "  - Note: Binary is installed as 'httpx-toolkit' to avoid conflicts" "${YELLOW}"
        ;;
      wapiti)
        print_message "  Troubleshooting Wapiti:" "${YELLOW}"
        print_message "  - For Arch Linux, try: pipx install wapiti3" "${YELLOW}"
        print_message "  - Check if ~/.local/bin is in your PATH: echo \$PATH" "${YELLOW}"
        print_message "  - Manual virtual environment:" "${YELLOW}"
        print_message "    python -m venv ~/.local/venv/wapiti" "${YELLOW}"
        print_message "    ~/.local/venv/wapiti/bin/pip install wapiti3" "${YELLOW}"
        print_message "    ln -sf ~/.local/venv/wapiti/bin/wapiti ~/.local/bin/wapiti" "${YELLOW}"
        ;;
      nuclei)
        print_message "  Troubleshooting Nuclei:" "${YELLOW}"
        print_message "  - Check if ~/go/bin is in your PATH: echo \$PATH" "${YELLOW}"
        print_message "  - Try: export PATH=\$PATH:\$HOME/go/bin" "${YELLOW}"
        print_message "  - Reinstall: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" "${YELLOW}"
        ;;
    esac
    
    print_message "  General PATH troubleshooting:" "${YELLOW}"
    print_message "  - Restart your terminal or run: source ~/.bashrc" "${YELLOW}"
    print_message "  - Check current PATH: echo \$PATH" "${YELLOW}"
    print_message "  - Manually add to PATH: export PATH=\$PATH:\$HOME/.local/bin:\$HOME/go/bin" "${YELLOW}"
    
    all_working=false
  fi
done

echo ""
if [ "$all_working" = true ]; then
  print_message "All security tools are now ready to use with @profullstack/scanner!" "${GREEN}"
  print_message "You can test the installation by running: scanner tools --check" "${GREEN}"
  exit 0
else
  print_message "Some tools may not be working properly. Please check the installation manually." "${YELLOW}"
  exit 1
fi