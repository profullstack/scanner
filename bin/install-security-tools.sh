#!/bin/bash

# Script to install security tools for @profullstack/scanner
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
INSTALL_ZAP=false
INSTALL_WAPITI=false
INSTALL_NUCLEI=false
INSTALL_SQLMAP=false

# Function to print messages
print_message() {
  echo -e "${BOLD}${2}${1}${RESET}"
}

# Function to print usage information
print_usage() {
  print_message "Usage: $0 [OPTIONS]" "${BLUE}"
  print_message "Options:" "${BLUE}"
  print_message "  --all         Install all security tools (default)" "${BLUE}"
  print_message "  --nikto       Install only Nikto" "${BLUE}"
  print_message "  --zap         Install only OWASP ZAP CLI" "${BLUE}"
  print_message "  --wapiti      Install only Wapiti" "${BLUE}"
  print_message "  --nuclei      Install only Nuclei" "${BLUE}"
  print_message "  --sqlmap      Install only SQLMap" "${BLUE}"
  print_message "  --force       Force reinstall even if tools are already installed" "${BLUE}"
  print_message "  --help        Display this help message" "${BLUE}"
  print_message "" ""
  print_message "Examples:" "${BLUE}"
  print_message "  $0 --all                    # Install all tools" "${BLUE}"
  print_message "  $0 --nikto --nuclei         # Install only Nikto and Nuclei" "${BLUE}"
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
    zap-cli)
      if command_exists zap-cli; then
        ZAP_VERSION=$(zap-cli --version 2>/dev/null || echo "ZAP CLI (version unknown)")
        print_message "ZAP CLI is installed: ${ZAP_VERSION}" "${GREEN}"
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
  print_message "Installing security tools on Ubuntu/Debian..." "${BLUE}"
  
  # Update package list
  sudo apt-get update
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    print_message "Installing Nikto..." "${BLUE}"
    sudo apt-get install -y nikto
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    print_message "Installing Wapiti..." "${BLUE}"
    sudo apt-get install -y wapiti
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    print_message "Installing SQLMap..." "${BLUE}"
    sudo apt-get install -y sqlmap
  fi
  
  # Install Python and pip if needed for ZAP CLI
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ]; then
    print_message "Installing Python and pip for ZAP CLI..." "${BLUE}"
    sudo apt-get install -y python3 python3-pip
    print_message "Installing ZAP CLI..." "${BLUE}"
    pip3 install zapcli
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      print_message "Installing Go for Nuclei..." "${BLUE}"
      sudo apt-get install -y golang-go
    fi
    print_message "Installing Nuclei..." "${BLUE}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    
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
  sudo yum install -y epel-release
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    print_message "Installing Nikto..." "${BLUE}"
    sudo yum install -y nikto
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    print_message "Installing Wapiti..." "${BLUE}"
    sudo yum install -y wapiti
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    print_message "Installing SQLMap..." "${BLUE}"
    sudo yum install -y sqlmap
  fi
  
  # Install Python and pip if needed for ZAP CLI
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ]; then
    print_message "Installing Python and pip for ZAP CLI..." "${BLUE}"
    sudo yum install -y python3 python3-pip
    print_message "Installing ZAP CLI..." "${BLUE}"
    pip3 install zapcli
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      print_message "Installing Go for Nuclei..." "${BLUE}"
      sudo yum install -y golang
    fi
    print_message "Installing Nuclei..." "${BLUE}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    
    # Add Go bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/go/bin:"* ]]; then
      echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
      export PATH=$PATH:$HOME/go/bin
    fi
  fi
}

# Function to install tools on Arch Linux
install_tools_arch() {
  print_message "Installing security tools on Arch Linux..." "${BLUE}"
  
  # Update package database
  sudo pacman -Sy
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    print_message "Installing Nikto..." "${BLUE}"
    sudo pacman -S --needed nikto
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    print_message "Installing Wapiti..." "${BLUE}"
    sudo pacman -S --needed wapiti
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    print_message "Installing SQLMap..." "${BLUE}"
    sudo pacman -S --needed sqlmap
  fi
  
  # Install Python and pip if needed for ZAP CLI
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ]; then
    print_message "Installing Python and pip for ZAP CLI..." "${BLUE}"
    sudo pacman -S --needed python python-pip
    print_message "Installing ZAP CLI..." "${BLUE}"
    pip install zapcli
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      print_message "Installing Go for Nuclei..." "${BLUE}"
      sudo pacman -S --needed go
    fi
    print_message "Installing Nuclei..." "${BLUE}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    
    # Add Go bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/go/bin:"* ]]; then
      echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
      export PATH=$PATH:$HOME/go/bin
    fi
  fi
}

# Function to install tools on macOS
install_tools_macos() {
  print_message "Installing security tools on macOS..." "${BLUE}"
  
  if ! command_exists brew; then
    print_message "Homebrew is not installed. Please install Homebrew first:" "${YELLOW}"
    print_message "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  brew update
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NIKTO" = true ]; then
    print_message "Installing Nikto..." "${BLUE}"
    brew install nikto
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_WAPITI" = true ]; then
    print_message "Installing Wapiti..." "${BLUE}"
    brew install wapiti
  fi
  
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_SQLMAP" = true ]; then
    print_message "Installing SQLMap..." "${BLUE}"
    brew install sqlmap
  fi
  
  # Install Python and pip if needed for ZAP CLI
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_ZAP" = true ]; then
    print_message "Installing Python for ZAP CLI..." "${BLUE}"
    brew install python
    print_message "Installing ZAP CLI..." "${BLUE}"
    pip3 install zapcli
  fi
  
  # Install Go if needed for Nuclei
  if [ "$INSTALL_ALL" = true ] || [ "$INSTALL_NUCLEI" = true ]; then
    if ! check_go; then
      print_message "Installing Go for Nuclei..." "${BLUE}"
      brew install go
    fi
    print_message "Installing Nuclei..." "${BLUE}"
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
    
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
      print_message "Installing ZAP CLI..." "${BLUE}"
      pip install zapcli
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
    --zap)
      INSTALL_ALL=false
      INSTALL_ZAP=true
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
    tools_to_check=("nikto" "zap-cli" "wapiti" "nuclei" "sqlmap")
  else
    [ "$INSTALL_NIKTO" = true ] && tools_to_check+=("nikto")
    [ "$INSTALL_ZAP" = true ] && tools_to_check+=("zap-cli")
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
  tools_to_verify=("nikto" "zap-cli" "wapiti" "nuclei" "sqlmap")
else
  [ "$INSTALL_NIKTO" = true ] && tools_to_verify+=("nikto")
  [ "$INSTALL_ZAP" = true ] && tools_to_verify+=("zap-cli")
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