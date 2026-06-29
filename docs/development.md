# Development Guide

Notes for contributors and maintainers of **Life Plan**.

---

## Environment

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |

---

## Local Development

```bash
npm install
npm run dev
```

Dev server: `http://localhost:5173`

---

## Build

```bash
npm run build    # output to dist/
npm run preview  # preview production build
```

---

## Architecture

### Multi-Agent Orchestration

`src/agents/orchestrator.ts` coordinates five agents:

1. **Keeper of Beginnings** — inspirational opening
2. **Pathfinder** — route overview
3. **Chronologist** — parallel JSON timeline generation
4. **Task Weaver** — parallel JSON task list
5. **Scribe** — parallel Markdown planning document

Prompts live in `src/agents/prompts.ts`.

### Core Modules

| Path | Responsibility |
|------|----------------|
| `src/services/doubao.ts` | Doubao API (streaming & non-streaming) |
| `src/services/storage.ts` | localStorage read/write |
| `src/services/export.ts` | Markdown / PDF export |
| `src/composables/useChat.ts` | Chat state & streaming messages |
| `src/composables/usePlan.ts` | Plan generation & history |
| `src/composables/useSettings.ts` | API configuration |

### Views

- **Chat** — streaming dialogue, quick goals, jump to planning
- **Plan** — Overview · Timeline · Tasks · Document
- **Records** — local archive with search, notes, archive status, JSON import/export

---

## Customizing Agents

Edit the `SYSTEM` prompts in `src/agents/prompts.ts`.  
Orchestration order and parallelism are in `src/agents/orchestrator.ts`.

---

## Styling

Tailwind CSS 3:

- `tailwind.config.js`
- `postcss.config.js`
- `src/style.css`

---

## Pre-Commit Check

```bash
npm run build
```

`.gitignore` excludes `node_modules/`, `dist/`, etc. Never commit API keys.

---

**Author** · Sun Rui · [www.ddup.pro](https://www.ddup.pro) · [sunr20050503@163.com](mailto:sunr20050503@163.com)
