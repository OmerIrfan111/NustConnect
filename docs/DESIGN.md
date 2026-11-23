# NUSTConnect: Design Reference

> Markdown version of **Assignment 2: Website Design** (15 Nov 2026) plus the design-system board.
> Figma source: https://www.figma.com/design/w48djUFeKM5mkgF7JCW7bu (page 00 design system, page 01 wireframes,
> page 02 high-fidelity). Images are in `docs/design/`.

## 1. Design identity

Modern, minimal, professional, trustworthy and student-friendly. Generous white space, rounded cards, subtle borders and
restrained shadows keep a dense multi-service platform easy to scan. Tagline: **"One campus. One community. Everything connected."**

**Logo:** an original symbol of three connected nodes forming a network (navy rounded square, teal/white nodes) next to the
wordmark **NUST**Connect ("NUST" bold navy or white, "Connect" teal). It does **not** use the NUST crest or any official identity.

## 2. Colour tokens

| Token | Hex | Use |
|-------|-----|-----|
| `navy` (primary) | `#173B63` | Logo, navigation, headings, primary buttons. White on navy passes WCAG AA. |
| `teal` (secondary) | `#14B8A6` | Active states, links, supporting actions, highlights |
| `amber` (accent) | `#F59E0B` | Notifications and important highlights. **Use sparingly.** |
| `bg` | `#F8FAFC` | Page background |
| `surface` | `#FFFFFF` | Cards and content surfaces |
| `text` | `#1E293B` | Headings and body text |
| `text-2` | `#64748B` | Supporting descriptions |
| `border` | `#E2E8F0` | Dividers, card borders, inputs |

Tints used in the prototype: `teal-light #D9F5F1`, `navy-light #E3EAF3`, `amber-light #FEF0D3`. Error state: red border (see the Input component).

## 3. Typography: Inter (single family)

| Role | Size / weight |
|------|---------------|
| Hero / main heading | 40 px Bold |
| Page heading | 32 px Bold (navy) |
| Section heading | 24 px SemiBold |
| Card heading | 18 px SemiBold |
| Body | 16 px Regular |
| Supporting text | 14 px Regular (`text-2`) |
| Button | 14 px SemiBold |
| Form label | 13 px SemiBold (prototype) |

## 4. Shape, spacing, elevation (from the prototype CSS)

- Radius: buttons and inputs **8 px**, cards **12 px**, badges and pills **12 px**, icon tiles 12 px.
- Card: white, 1 px `border`, padding 20 px, shadow `0 4px 16px rgba(23,59,99,.07)`. Clickable card hover: teal border + `0 8px 24px rgba(23,59,99,.15)`.
- Button: padding 12 × 20 px, 1.5 px border. Variants: **primary** (navy fill), **secondary** (teal fill), **outline** (white fill, navy text/border), **disabled** (grey).
- Input: padding 12 × 14 px, 1 px border, focus outline 2 px teal.
- Page horizontal padding 80 px on desktop (landing). Grids: 3-col and 4-col with 16–20 px gaps.

## 5. Component library (design board §6)

| Component | Variants / notes |
|-----------|------------------|
| Button | primary, secondary, outline, disabled |
| Sidebar nav item | active (navy pill, white text) / inactive |
| SearchBar | default, focused (teal border). Placeholder "Search services, rides, items…" |
| Input | empty, filled, error ("Invalid email", red border). Label above. |
| Badge | Verified Student (teal, ✓), New (amber), Available (navy), Full (grey) |
| StarRating | 0–5 stars, amber. Must support half values. |
| ServiceCard | icon tile + title + description, hover state with teal border |
| ProductCard | image placeholder, title, price "PKR 2,500", meta "Good condition · Seller name". Selected/hover state with amber border. |
| RideCard | avatar, "Name · ✓ Verified", route "Islamabad F-10 → NUST H-12", "8:00 AM · PKR 250", seats badge ("2 seats available" teal / "Full" grey) |
| ProfileChip | avatar + name + "BSCS · Batch 2023" |
| Notification dot | small amber circle with a count |

## 6. Navigation

- **Visitor (top bar):** logo, Home, Explore Services, About, Login, Register (button).
- **Signed-in (left sidebar):** Dashboard, RideShare, Marketplace, Review Hub, Opportunities, Campus Map, Lost & Found,
  Help Box, Complaints, Bill Splitting, Notifications, Settings. A **top bar** holds global search, the notification bell and the profile menu.
- Extra entries (Trips, SkillSwap, Donations, FAQ, Admin) come from module manifests under a "More" group.

## 7. Sitemap & user journeys

| Level | Pages |
|-------|-------|
| Entry | Landing → Login / Registration |
| Hub | Student Dashboard |
| Modules | RideShare · Marketplace · Review Hub · Opportunities · Campus Map · Lost & Found · Help Box · Complaints · Bill Splitting |
| Detail | Ride Details → Ride Confirmation · Product Details · Write Review → Review Confirmation |

**Journeys (must work end to end in the real app):**
1. **Onboarding:** Landing → Register → Dashboard, and Landing → Login → Dashboard.
2. **Find a ride:** Dashboard → RideShare → Ride Details → Request Confirmation.
3. **Marketplace & reviews:** Dashboard → Marketplace → Product Details, and Dashboard → Review Hub → Write Review → Confirmation.

## 8. Screen inventory

| Screen | Source | File | Build owner |
|--------|--------|------|-------------|
| Landing (low-fi) | WF-01 | `design/wireframes/WF-01.png` | Base-1 |
| Landing (hi-fi) | UI-01 | `design/hifi/UI-01.png` | Base-1 |
| Student Dashboard | WF-02 + prototype | `design/wireframes/WF-02.png` | A2 |
| Find a Ride | WF-03 + prototype | `design/wireframes/WF-03.png` | B1 |
| Student Marketplace | WF-04 + prototype | `design/wireframes/WF-04.png` | B2 |
| Campus Review Hub | WF-05 + prototype | `design/wireframes/WF-05.png` | B3 |
| Login | UI-06 | `design/hifi/UI-06.png` | A1 |
| Registration | UI-07 | `design/hifi/UI-07.png` | A1 |
| Ride Details, Ride Confirmation | prototype only (`ride`, `rideok`) | `design/prototype/index.html` | B1 |
| Product Details | prototype only (`product`) | `design/prototype/index.html` | B2 |
| Write Review, Review Confirmation | prototype only (`write`, `reviewok`) | `design/prototype/index.html` | B3 |
| Design system board | — | `design/design-system.png` | Base-3 (UI kit) |

Screens **not designed** (profile, settings, admin, lost & found, complaints, help box, FAQ, map, bills, trips, skillswap,
opportunities page, donations) must reuse the shell, tokens and components above. Use the Marketplace list → detail → form
pattern as the default layout.

**Prototype:** open `docs/design/prototype/index.html` in a browser. Screens are switched by `data-go` ids: `landing`,
`login`, `register`, `about`, `dashboard`, `rides`, `ride`, `rideok`, `market`, `product`, `reviews`, `write`, `reviewok`,
`soon`. Its CSS (`:root` variables) is a good reference for exact spacing and shadows.

## 9. Rules

- All tokens come from **one theme file** in core. Never hard-code hex values or font sizes in modules.
- Mobile-first, responsive at 1440 / 768 / 375 px, no horizontal scroll.
- Verified-student indicators appear on registration, ride listings and seller profiles.
- All demo data is **clearly labelled as sample data**.
- Complaint tracker (identified, trackable) and help box (anonymous) are separate, privacy-aware flows. Never merge their UI or data.
