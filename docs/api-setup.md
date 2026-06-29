# API Setup Guide

How to connect **Life Plan** to the Volcengine Ark Doubao API.

---

## Prerequisites

1. Register a [Volcengine](https://www.volcengine.com/) account and complete identity verification
2. Open the [Volcengine Ark Console](https://console.volcengine.com/ark)

---

## Step 1 — Obtain an API Key

1. Go to [API Key Management](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey)
2. Click **Create API Key**
3. Copy and save the key immediately (shown in full only once)
4. Format example: `sk-xxxxxxxxxxxxxxxx`

---

## Step 2 — Activate a Model

If you call the API with a **Model ID**, the model must be activated first. Otherwise you may see:

```
API Error (404): Your account has not activated the model xxx
```

1. Open the [Model Hub](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement)
2. Choose a Doubao model (Pro, Lite, Seed, etc.)
3. Click **Activate** or **Use Now**

Common Model ID examples (verify in your console):

| Model | Example Model ID |
|-------|------------------|
| Doubao Pro | `doubao-1-5-pro-32k-250115` |
| Doubao Lite | `doubao-1-5-lite-32k-250115` |
| Doubao Seed Flash | `doubao-seed-1-6-flash-250615` |
| Doubao Seed | `doubao-seed-1-6-250615` |

---

## Step 3 — Create an Inference Endpoint *(Recommended)*

**Endpoint ID** is the preferred approach—stable, production-ready, and widely used on Ark.

1. Open [Inference Endpoints](https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint)
2. Click **Create Endpoint**
3. Select an activated Doubao model
4. Copy the **Endpoint ID** (`ep-` prefix)

---

## Step 4 — Configure the App

Open **API Settings** in the top-right corner:

| Field | Description |
|-------|-------------|
| API Key | Key from Step 1 |
| Endpoint ID *(recommended)* | `ep-xxxxxxxx` from Step 3 |
| Model ID | Activated model ID from Step 2 |

### Recommended

```
API Key:      sk-xxxxxxxx
Mode:         Endpoint ID ✓
Endpoint ID:  ep-2024xxxxxxxx-xxxxx
```

### Alternative

```
API Key:      sk-xxxxxxxx
Mode:         Model ID
Model ID:     doubao-1-5-pro-32k-250115  (must be activated)
```

---

## API Reference

Life Plan calls the Ark Chat Completions endpoint:

- **URL**: `POST https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- **Auth**: `Authorization: Bearer <API_KEY>`
- **Format**: OpenAI-compatible

Example request:

```json
{
  "model": "ep-xxxxxxxx",
  "messages": [
    { "role": "user", "content": "I want to become a full-stack engineer in three years" }
  ],
  "stream": true
}
```

Official docs: [Chat API](https://www.volcengine.com/docs/82379/1399008?lang=zh)

---

## Troubleshooting

### 404 — Model Not Activated

**Cause**: The Model ID has not been activated in the Model Hub.  
**Fix**: Activate the model, or switch to an Endpoint ID.

### 401 — Authentication Failed

**Cause**: Invalid or expired API Key.  
**Fix**: Create a new key and update settings.

### 429 — Rate Limited

**Cause**: Too many requests in a short window.  
**Fix**: Wait and retry, or adjust rate limits in the console.

---

## Security Notes

- API Keys live in browser `localStorage`—suitable for personal, local use only
- Never commit keys to git, share screenshots, or use on public machines
- For production, proxy API calls through a backend

---

**Author** · Sun Rui · [www.ddup.pro](https://www.ddup.pro) · [sunr20050503@163.com](mailto:sunr20050503@163.com)
