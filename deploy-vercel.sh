#!/bin/bash

# Obtener token de Vercel desde las credenciales MCP
VERCEL_TOKEN=$(cat ~/.config/vercel/auth.json 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: No se encontró el token de Vercel"
  exit 1
fi

# Crear proyecto en Vercel usando la API
curl -X POST "https://api.vercel.com/v9/projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mipanaapp-mcp",
    "framework": "other",
    "gitRepository": {
      "type": "github",
      "repo": "cdepool/mipanaapp-mcp"
    },
    "environmentVariables": [
      {
        "key": "SUPABASE_URL",
        "value": "https://mdaksestqxfdxpirudsc.supabase.co",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "BASE_FARE_BS",
        "value": "3",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "PER_KM_BS",
        "value": "2",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "PER_MIN_BS",
        "value": "0.5",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "MIN_FARE_BS",
        "value": "5",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "USD_EXCHANGE_RATE",
        "value": "45",
        "target": ["production", "preview", "development"]
      },
      {
        "key": "FUEL_PRICE_BS",
        "value": "0.50",
        "target": ["production", "preview", "development"]
      }
    ]
  }'
