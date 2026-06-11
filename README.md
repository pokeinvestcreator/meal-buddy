# 🥗 Meal Buddy

Your personal meal prep companion — plan meals, build grocery lists, and follow recipes with food-scale measurements. Installable as a PWA on iPhone.

---

## Run Locally

### Prerequisites
- Node.js 18+
- npm 9+

### Steps

```bash
cd meal-buddy
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Deploy to Netlify (Recommended — Free)

**Option A: Netlify Drop (easiest)**
1. Run `npm run build`
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag your `dist/` folder into the browser
4. You get a live HTTPS URL instantly

**Option B: Netlify CLI**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import at vercel.com → New Project
3. Set: Framework = Vite, Build = `npm run build`, Output = `dist`
4. Deploy

---

## Install on iPhone as a PWA

1. Open your deployed HTTPS URL in **Safari**
2. Tap the **Share** button (square with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

Meal Buddy will appear on your Home Screen and open fullscreen like a native app.

---

## App Features

- **Plan tab** — 3-step flow: pick days, choose meal types, select meals & servings
- **Grocery tab** — Auto-generated checklist by category with progress bar
- **Calendar tab** — Weekly view, click any day or meal for full recipe
- **Recipes tab** — Browse/search 50 meals, filter by type, favorites, add custom meals
- **Settings tab** — Prep days, protein target, g/oz units, food preferences

---

## Meal Database (50 built-in)

| Category | Count | Highlights |
|---|---|---|
| Breakfast | 10 | Protein Oatmeal, Breakfast Burritos, Greek Yogurt Bowl |
| Lunch | 15 | Cajun Chicken Pasta, Chicken Burrito Bowl, Beef Marinara |
| Dinner | 15 | Steak Pasta, Steak Tacos, Burger Bowl, Salmon Rice Bowl |
| Snack | 10 | Cottage Cheese Bowl, Protein Shake, High-Protein Snack Box |

Each recipe: ingredients in g + oz, macros, step-by-step, prep/storage/reheat notes.

---

## Tech Stack

React 19 · Vite · Tailwind CSS v3 · localStorage · PWA (service worker + manifest)
