# J&G Chicken Pastil Website — V2

This update keeps the existing static HTML/CSS/JS setup and is ready for Vercel.

## Added
- Floating Messenger button
- Order modal with quantity, optional notes, copy-to-clipboard, and Messenger handoff
- Business-hours / Open Now system that is safe until real hours are configured
- Menu photo slots with automatic fallback to existing photos
- Loyalty Card section
- Honest reviews section that does not invent testimonials
- Gallery previous/next controls + keyboard arrows
- Facebook, Messenger, phone, maps, and footer social links
- Favicon
- Open Graph / social preview metadata
- Local FoodEstablishment structured data
- Better mobile spacing, safe-area support, and accessibility improvements

## Replace these 3 files in your current project
- `index.html`
- `styles.css`
- `script.js`

Keep your existing `assets/` folder.

## Optional individual menu photos
The site works even if these files do not exist. It automatically falls back to your current photos.

If you want each menu item to have its own photo, add:
- `assets/menu-pastil.jpg`
- `assets/menu-value.jpg`
- `assets/menu-busog.jpg`
- `assets/menu-premium.jpg`
- `assets/menu-extra-busog.jpg`
- `assets/menu-tusok.jpg`

## Configure real business hours
At the top of `script.js`, find:

```js
hours: {
  sunday: null,
  monday: null,
  ...
}
```

Use 24-hour format:
```js
monday: "15:00-22:00"
```

Use this for a closed day:
```js
monday: "closed"
```

Leave `null` until your real schedule is confirmed. The website will safely show "Message us for today's hours."

## Add real customer reviews
At the top of `script.js`, find:

```js
const REVIEWS = [];
```

Add reviews only if they are genuine and you are comfortable publishing them:

```js
const REVIEWS = [
  {
    name: "Customer Name",
    rating: 5,
    text: "Actual customer feedback here."
  }
];
```

## Social preview URL
The HTML currently uses:

`https://jg-chicken-pastil-website.vercel.app/`

If your final Vercel production URL is different, update the `og:url`, `og:image`, Twitter image, JSON-LD image, and JSON-LD url in `index.html`.

## Deploy update
```bash
git add .
git commit -m "Upgrade J&G business website"
git push origin main
```

Vercel should automatically redeploy the connected GitHub repository.


## V3 ordering update
- Navbar gold CTA is now **Order Now** instead of a duplicate View Menu button.
- Order Now opens a multi-item cart with all meals, add-ons, and Chicken Pastil in a Jar.
- Customers can mix products (for example Value Meal + Busog Meal), change quantities, and see an estimated item total.
- Product cards now use **Add to Cart**.
- Cart is preserved in the browser with localStorage.
- Messenger flow copies one combined order message for the entire cart.
