# The Forge, marketing site

A self-contained static landing page. **No build step.** Plain HTML, CSS, and a little vanilla JS.

```
website/
├── index.html      # the page
├── styles.css      # all styling (dark + gold, responsive)
├── main.js         # scroll reveals, mobile nav, embers, 90-day date
├── README.md
└── assets/
    ├── favicon.svg
    ├── app-icon.png
    ├── feature-graphic.png   # used as the social/OG share image
    └── forge-01..08.png      # real app screenshots (gallery)
```

## Preview locally

Open `index.html` directly in a browser, or serve it (recommended, so relative paths + fonts behave):

```bash
cd website
python -m http.server 8080
# → http://localhost:8080
```

## Deploy (free)

It's a static folder, drop it on any host:

- **Netlify**, drag the `website/` folder onto app.netlify.com, or `netlify deploy --dir=website`.
- **Vercel**, `vercel website` (framework preset: "Other").
- **GitHub Pages**, push and point Pages at the `website/` folder.
- **Cloudflare Pages**, connect the repo, set the output dir to `website`.

## Before launch, quick checklist

- [ ] **Replace the screenshots.** `assets/screens/*.png` are currently the promo
      *slides* used as placeholders. Drop the clean in-app screenshots in there with
      the SAME filenames, no code changes needed:
      `home.png`, `focus.png`, `dark-hours.png`, `monolith.png`, `leaderboard.png`
      (also available: `creed.png`, `arena.png`, `triad.png`).
- [ ] Swap the App Store / Google Play `href="#"` links (hero + Free tier) for real store URLs.
- [ ] Pricing is wired to the app's real tiers. The Iron Standard CTA links to the
      Stripe hosted checkout (monthly/yearly). NOTE: these are **sandbox/test** Stripe
      Payment Links (`buy.stripe.com/test_…`), recreate them in the LIVE Stripe account
      and swap the URLs before launch. The Founding 20 CTA points to `#apply` because that
      tier is application-gated, wire it to your application form / contact.
- [ ] Set real social links in the footer.
- [ ] For correct social-share previews, change the two `og:image` / `twitter:image`
      tags in `index.html` from the relative `assets/feature-graphic.png` to the
      full absolute URL once you have a domain (e.g. `https://theforge.app/assets/feature-graphic.png`).
- [ ] Wire real links for Privacy / Terms / Refunds (needed for the app stores anyway).

## Notes

- Logo uses the real app icon (`assets/app-icon.png`).
- Pricing mirrors the in-app subscription screen: Free baseline, The Iron Standard
  ($10/mo or $102/yr, 14-day trial), The Founding 20 ($20/mo or $240/yr, 20 spots).
  The monthly/yearly toggle swaps prices and the Iron Stripe checkout link live.
- Fonts (`Anton` + `Inter`) and the Tabler icon webfont load from CDNs, no install needed.
- Screenshot PNGs are large (~1.4 MB each). Before launch, compress or export WebP
  for faster loads (e.g. via squoosh.app).
- Copy reflects the current app: Deep Focus describes the "yanked back" enforcement,
  not the old three-strikes model.
