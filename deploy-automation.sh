#!/bin/bash
# Usage: SUPABASE_ACCESS_TOKEN=xxx TWILIO_SID=xxx TWILIO_TOKEN=xxx TWILIO_PHONE=xxx bash deploy-automation.sh

PROJECT_REF="pnohfokjlhpzrkczruju"
ELEVEN_KEY="sk_16eca4701ed78850901ccf16c1924ad5682f634c81c9a27c"

echo "==> Linking project..."
npx supabase link --project-ref $PROJECT_REF

echo "==> Setting secrets..."
npx supabase secrets set \
  ELEVENLABS_API_KEY="$ELEVEN_KEY" \
  TWILIO_ACCOUNT_SID="$TWILIO_SID" \
  TWILIO_AUTH_TOKEN="$TWILIO_TOKEN" \
  TWILIO_PHONE_NUMBER="$TWILIO_PHONE" \
  TWILIO_WHATSAPP_NUMBER="whatsapp:$TWILIO_PHONE" \
  --project-ref $PROJECT_REF

echo "==> Deploying welcome-automation..."
npx supabase functions deploy welcome-automation \
  --project-ref $PROJECT_REF --no-verify-jwt

echo "==> Deploying db-email-trigger..."
npx supabase functions deploy db-email-trigger \
  --project-ref $PROJECT_REF --no-verify-jwt

echo "==> Done!"
