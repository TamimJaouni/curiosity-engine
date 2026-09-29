# Intellectual OS — local test

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env.local`.

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY` if you want the **Explain** button to generate content.

Do not put the OpenAI key in any `NEXT_PUBLIC_...` variable.

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## What to test

- Dark premium desktop + mobile layout
- Deep Essays recursive tree
- Physics → Relativity / Quantum Physics
- Cross-field **Connections**
- **Explain** on several very different nodes
- Sign-in and cached explanations

If `OPENAI_API_KEY` is omitted, the rest of the app still loads, but Explain will show a configuration message.
