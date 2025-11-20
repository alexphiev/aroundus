#!/bin/bash
# Install Overture Maps Python CLI and dependencies in virtual environment

VENV_DIR="venv_overture"

echo "🐍 Setting up Python virtual environment for Overture Maps..."

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required but not installed"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "📁 Creating Python virtual environment: $VENV_DIR"
    python3 -m venv "$VENV_DIR"
    
    if [ ! -d "$VENV_DIR" ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
else
    echo "♻️ Using existing virtual environment: $VENV_DIR"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing overturemaps CLI..."
pip install overturemaps

echo "📦 Installing DuckDB..."
pip install duckdb

echo "📦 Installing GeoPandas..."
pip install geopandas

echo "📦 Installing PyArrow..."
pip install pyarrow

# Verify installation
echo "🔍 Verifying installation..."
if command -v overturemaps &> /dev/null; then
    echo "✅ Overture Maps CLI installed successfully"
else
    echo "❌ Overture Maps CLI installation failed"
    deactivate
    exit 1
fi

# Deactivate for now
deactivate

echo "🎉 Installation complete!"
echo ""
echo "📋 Usage instructions:"
echo "  1. Activate virtual environment: source venv_overture/bin/activate"
echo "  3. Run the script: pnpm run fetch-overture-places"
echo "  4. Deactivate when done: deactivate"
echo ""
echo "💾 Virtual environment saved in: $VENV_DIR"