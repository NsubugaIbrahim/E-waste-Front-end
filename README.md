# E-Waste Frontend (React + Vite)

This UI calls your deployed Gradio model and sends:
- `product_type`
- `brand`
- `build_quality`
- `usage_pattern`
- `condition`
- `usage_to_expiry_ratio`
- `price_retention_ratio`
- `original_price`

## 1) Configure model endpoint

Create a local env file:

1. Copy [Frontend/e-waste/.env.example](.env.example) to `.env.local`
2. Set either:

Option A (recommended, Space ID)
- `VITE_HF_SPACE_ID=nsubugaibrahim/E-waste-prediction`
- `VITE_GRADIO_API_NAME=/predict`
- If your Space is private/gated, also set `VITE_HF_TOKEN=hf_...`

Option B (single URL)
- `VITE_PREDICT_URL=https://your-space-name.hf.space/run/predict`

Option C (base URL + API name)
- `VITE_HF_SPACE_URL=https://your-space-name.hf.space`
- `VITE_GRADIO_API_NAME=/predict`

> Use Space ID from `huggingface.co/spaces/<owner>/<space>` as `<owner>/<space>`, not your profile URL.

## 2) Run frontend

Install and start:

- `npm install`
- `npm run dev`

## 3) If request fails

Check:
- Space URL is public and running
- If Space is private, set `VITE_HF_TOKEN=hf_...`
- Endpoint path is correct (`/run/predict`)
- Browser console/network tab for HTTP status

The UI includes a local fallback recommendation when API is unavailable, so users still get output.
# E-waste-Front-end
