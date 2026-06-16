# Ví Thẻ — Vietnam Credit Card Manager (v0.1)

Your card command center: tells you **which card to swipe** for each spending
category (cap-aware) and tracks **payment due dates** so you never carry interest
or pay a late fee. Privacy-first — no bank login, everything stays on your device.

Same stack as Commit and café-music-checker: React + Vite + TypeScript + Tailwind.

## Run it locally (first time)

1. Open a terminal in this `CardApp` folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the dev server:
   ```
   npm run dev
   ```
4. Open the URL it prints (usually http://localhost:5173).

## Build for production
```
npm run build
```
Then deploy the `dist/` folder to Netlify (same GitHub → Netlify pipeline as your
other apps).

## What's in here
- `src/cards.ts` — the Vietnam card catalog + the `bestCardFor()` routing engine.
  This is the "brain"; adding a card = one new entry. **Rates are a June 2026
  draft and change often — verify with each bank before launch.**
- `src/App.tsx` — the whole UI: which-card picker, wallet dashboard with
  color-coded due-date countdowns + cashback-cap bars, and the manual add-card form.

## Notes / next steps
- 12 cards are loaded; verify the `null` annual fees and confirm caps.
- Reminders are in-app (color-coded countdowns). Real push notifications need a
  mobile wrapper — a later phase.
- "I used this card" logs cashback toward a card's monthly cap so routing stays
  accurate; full automatic spend import is out of scope for v1.
