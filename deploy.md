# Deploying Gemmagotchi

The demo runs entirely on a laptop with Ollama. For a hosted judge link, the
app runs on any small VM (e.g. the Oracle free-tier ARM box) with inference on
the hosted Gemma API — **never run Ollama on the VPS**, CPU ARM inference is
far too slow.

```bash
# on the VPS
git clone https://github.com/NorthNodeCode/gemmagotchi && cd gemmagotchi
npm install
npm run build

cat > .env << 'ENV'
GEMMA_PROVIDER=hosted
GEMINI_API_KEY=your-key-here
ENV

NODE_ENV=production PORT=3000 node dist/server.cjs
```

Keep it alive with systemd or pm2 (`pm2 start dist/server.cjs --name gemmagotchi`).

## Reverse proxy (caddy)

```
your.domain.com {
    reverse_proxy localhost:3000
}
```

That is the whole switch: same code, same seam, hosted `gemma-4-26b-a4b-it`
for everything and `gemma-4-31b-it` for the coach. The laptop demo stays on
`GEMMA_PROVIDER=auto` with local Ollama.
