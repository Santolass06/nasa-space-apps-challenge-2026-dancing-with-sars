# Frontend — Dancing with the SARs

React + TypeScript + Vite application. This is the interactive surface of the project:
map, date timeline, before/after comparison and the story panels.

## Scripts

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production build
```

The API base URL is read from `VITE_API_URL` (default `http://localhost:8000`).

## Structure

```
src/
├── main.tsx        # React entrypoint
├── App.tsx         # Layout / hero / API status
├── lib/api.ts      # Typed fetch helpers
└── components/     # Map, timeline, comparison slider (to be built)
```
