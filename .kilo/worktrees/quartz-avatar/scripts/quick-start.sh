#!/bin/bash

echo "🚀 WhatsApp Marketing Platform - Quick Start"
echo "==========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please configure your .env file with required variables"
    echo ""
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "✅ Setup complete!"
echo ""
echo "📌 Next steps:"
echo "1. Configure your .env file with API keys"
echo "2. Start the development server: npm run dev:full"
echo "3. Access the app at http://localhost:5173"
echo "4. API available at http://localhost:4000"
echo ""
echo "🎉 Happy building!"
