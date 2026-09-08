# Time Duration Calculator

Add and subtract lengths of time, or find the elapsed time between two clock times.

- **Add / subtract:** a list of rows, each `+` or `−`, accepting `1:30`, `1:30:00`,
  `1h 30m`, `90m`, `1.5h`, `2d 4h`, or a plain number (minutes). Result can go negative.
- **Between two times:** start and end as 24-hour (`14:30`) or am/pm (`2:30 pm`); an
  end earlier than the start rolls to the next day, with a checkbox to force it.
- Result shown as `h:mm:ss` and as total hours / minutes / seconds / days.
- Locale-aware number formatting; no currency, no timezone assumptions.
- Mode kept in the URL (`?m=`). No sign-up, no network calls, works offline once loaded.

## Develop

```
npm install
npm run dev
npm run build
```

Parsing & maths: [`src/duration.ts`](src/duration.ts). Static site on Cloudflare Workers.

Part of [Tiny Tools](https://tinytools.correia95.workers.dev).
