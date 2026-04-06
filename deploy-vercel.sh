#!/bin/bash
# ════════════════════════════════════════════════════
#  Zinter AI - Deploy to Vercel (One-Click Setup)
# ════════════════════════════════════════════════════
# Run this on YOUR machine (not in sandbox)
# Prerequisites: Node.js 18+, Git, Vercel Account
# ════════════════════════════════════════════════════

set -e

echo "🚀 Zinter AI - Vercel Deployment"
echo "═════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install Vercel CLI
echo -e "${YELLOW}Step 1: Installing Vercel CLI...${NC}"
npm i -g vercel 2>/dev/null || npx vercel --version
echo -e "${GREEN}✓ Vercel CLI ready${NC}"
echo ""

# Step 2: Login
echo -e "${YELLOW}Step 2: Login to Vercel...${NC}"
vercel login
echo ""

# Step 3: Set environment variables
echo -e "${YELLOW}Step 3: Setting environment variables...${NC}"
echo "NOTE: Using local SQLite for now. For production DB, set up Turso later."
echo ""

# Ask for Google OAuth (optional)
read -p "Enter Google Client ID (or press Enter to skip): " GOOGLE_ID
read -p "Enter Google Client Secret (or press Enter to skip): " GOOGLE_SECRET

# Set env vars on Vercel
vercel env add DATABASE_URL production <<< "file:/tmp/nexusai.db"
vercel env add NEXT_PUBLIC_BASE_URL production <<< ""

if [ -n "$GOOGLE_ID" ]; then
  vercel env add GOOGLE_CLIENT_ID production <<< "$GOOGLE_ID"
fi
if [ -n "$GOOGLE_SECRET" ]; then
  vercel env add GOOGLE_CLIENT_SECRET production <<< "$GOOGLE_SECRET"
fi

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# Step 4: Deploy
echo -e "${YELLOW}Step 4: Deploying to Vercel...${NC}"
vercel --prod --yes

echo ""
echo -e "${GREEN}═════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 Deployment Complete!${NC}"
echo -e "${GREEN}═════════════════════════════════${NC}"
echo ""
echo "⚠️  Note: Currently using in-memory SQLite."
echo "    Chat data will reset on each deployment."
echo ""
echo "For persistent database, set up Turso (free):"
echo "  1. Go to https://turso.tech and create account"
echo "  2. Create a new database"
echo "  3. Get your connection URL"
echo "  4. Run: vercel env edit DATABASE_URL"
echo "     Set it to: libsql://your-db-name.turso.io"
echo "  5. Redeploy: vercel --prod"
