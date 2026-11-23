# NUSTConnect: Requirements (Proposal + SRS)

> Markdown version of **Assignment 1: Website Proposal & SRS** (CS-313 Web Engineering, 4 Oct 2026).
> The original PDF is kept outside the repo. Contribution tables are omitted.

## 1. Purpose

NUSTConnect is a single, NUST-only web platform that brings everyday campus life into one place: shared rides, reviews of
teachers, cafes, hostels and messes, internships and alumni referrals, anonymous help, a campus map, a marketplace,
lost & found, trips and meetups, bill splitting, facility complaints and donations.

**Problems solved**
- **Fragmentation:** students rely on scattered WhatsApp groups, Facebook posts and single-purpose sites.
- **Trust and safety:** NUST-verified accounts mean rides, sales and swaps happen between real students.
- **Money and time:** ridesharing, second-hand trading and bill splitting reduce costs. One search replaces ten group chats.
- **Voice and support:** an anonymous help box and a trackable complaint system give students a safe, accountable channel.
- **Onboarding:** freshies get a map, FAQ wiki and peer reviews.

**Network effect:** each module makes the others more useful. For example, a Murree trip uses the organizer, RideShare and bill splitting together.

## 2. Goals & objectives

| ID | Objective |
|----|-----------|
| O1 Unify | At least 8 core modules (RideShare, Review Hub, Marketplace, Lost & Found, Complaint Tracker, Bill Splitting, Map, Help Box/FAQ) under one login and one design system. |
| O2 Verify | Restrict access to genuine NUST students and alumni via institutional email verification, with moderation and reporting. |
| O3 Save time | A user finds a ride, item, review or lost belonging **within three clicks** using search and filters. |
| O4 Protect privacy | Anonymous and sensitive modules (help box, complaints) are kept separate from identity data, with strict access control. |
| O5 Extensible | Modular architecture (shared users, notifications, search, moderation). New modules are added without redesign. |
| O6 Adoption | A meaningful share of the student body within one semester, returning weekly. |

## 3. Target audience

| Attribute | Description |
|-----------|-------------|
| Age group | Mainly 17–24 (undergrads). Secondary 24–35 (postgrads, alumni mentors, staff moderators). |
| Background | NUST students across schools (SEECS, SMME, NBS, …), hostelites and day scholars, alumni, selected admin staff. |
| Location | NUST H-12 campus and Islamabad–Rawalpindi. Alumni anywhere. |
| Technical skills | Beginner to advanced. Must work for non-technical freshies and for engineers who expect search, filters and fast pages. |
| Needs | Affordable transport, trusted reviews, second-hand goods, internships, quick campus answers, safe reporting, teammates, social activities. |

## 4. Information collected

| Data | Why | Value |
|------|-----|-------|
| NUST email, name, department, batch | Verification and accountability | Trusted community, fewer fake accounts |
| Contact preference, profile (optional) | Coordinate rides, sales, mentorship | Contact without exposing private details |
| Listings, photos, prices, locations | Marketplace, ride, lost & found content | Real-time discovery |
| Ratings and reviews | Review Hub | Informed decisions |
| Complaints (text, photo, location) | Facility Complaint Tracker | Faster resolution, evidence |
| Anonymous questions | Help box (**no identity stored**) | Safe help-seeking |
| Usage analytics (aggregated) | Improve features | Data-driven decisions |

**Content strategy:** mostly user-generated. Expiry dates auto-archive stale rides, listings and events. Seed content at launch
(map points, FAQs, mess/cafe reviews, guides). Moderators and student editors maintain the wiki. Notifications and prompts bring users back.

## 5. Competitors

| Site | Strength | Weakness |
|------|----------|----------|
| Mess Menu (mess-menu-six.vercel.app) | Focused NUST mess menus | Single purpose, no accounts, ratings or moderation |
| RateDeezNUST (ratedeeznust.com) | Anonymous professor ratings, good SEO | Faculty only, no other services |
| CampusAxis (campusaxis.pk) | Dedicated NUST lost & found | One module, no OCR, no integration |
| NustMarkaz (nustmarkaz.com) | Broader community portal | Unclear features, no verified-only access, no bill split / complaints / help box |

**Differentiators:** one verified account for every module, cross-module workflows (trip → ride → bill), a unified Review Hub,
accountable complaints and donations, OCR lost & found with privacy safeguards, and moderation by design.

## 6. Success criteria (first semester)

| Metric | Target |
|--------|--------|
| Verified users | ≥ 1,000 |
| Weekly active | ≥ 30 % of registered |
| Content | 200+ active listings/rides, 500+ reviews |
| Task success | Core task (post ride, list item, file complaint) completed in < 2 min |
| Complaint resolution | 70 % moved past "submitted" within 7 days |
| Performance | Page load < 3 s on mobile data, 99 % uptime |
| Satisfaction | Average rating ≥ 4/5 |

---

# Software Requirements Specification

## 1. Scope

A responsive web application with **13 modules**: RideShare, Unified Review Hub, Internship & Alumni Referral Board,
Anonymous Help Box & FAQ Wiki, FYP/ESE Hardware Exchange, Interactive Map & Guide, Trip & Meetup Organizer,
Lost & Found with OCR, General Marketplace, SkillSwap & Team Finder, Facility Complaint Tracker, Donation Tracker,
and Sharing & Bill-Splitting. Common services: authentication, search, notifications, profiles, moderation, admin dashboard.
(These 13 are packed into 9 build modules. See `PROJECT_PLAN.md` §4.)

**Glossary:** FYP/ESE = Final Year Project / Embedded Systems Engineering (hardware). Freshie = first-year student.
OCR = optical character recognition. RBAC = role-based access control.

## 2. User classes

| Class | Characteristics | Main needs |
|-------|-----------------|------------|
| Student | Primary users, mixed skill, mostly on mobile | Rides, reviews, marketplace, lost & found, complaints, bill splitting, teams |
| Alumni | Verified graduates, occasional use | Mentorship, referrals, jobs |
| Moderator | Trusted student or staff volunteer | Review reports, remove abusive content, manage the FAQ |
| Administrator | Technical or administrative staff | Users, categories, complaints, campaigns, analytics |
| Guest | Unverified visitor | Public info only (map, FAQ) |

**Assumptions:** users have a NUST email (or alumni verification). Email, map tiles and OCR come from third-party libraries or services.
University rules on FYP sales, IDs and data apply. Moderators are available.

## 3. Functional requirements

| ID | Requirement | Build module |
|----|-------------|--------------|
| FR-1 | **Authentication:** register/login with a verified NUST email. Password reset by email. Alumni use an approved verification process. | A1 |
| FR-2 | **Profiles:** edit profile, set privacy and contact preferences. | A1 |
| FR-3 | **RideShare:** post rides (route, time, seats, cost share), search/filter, request a seat, see pickup points. | B1 |
| FR-4 | **Review Hub:** rate and review teachers, cafes, hostels, messes, schools. Search, filter, compare. | B3 |
| FR-5 | **Opportunities:** post/browse internships, jobs, referrals. Alumni profiles. Mentorship requests. | B3 |
| FR-6 | **Help Box & FAQ:** submit anonymous questions. Browse/search a categorised FAQ/wiki edited by moderators. | C2 |
| FR-7 | **Marketplaces:** list, edit, search, mark as sold in the General Marketplace and FYP/ESE Hardware Exchange (images, price, condition, contact). | B2 |
| FR-8 | **Map & Guide:** interactive campus map with searchable locations, plus a freshie guide. | C3 |
| FR-9 | **Trip & Meetup Organizer:** create events, invite, manage attendance, link to RideShare and bill splitting. | B1 |
| FR-10 | **Lost & Found:** post lost/found items with photos. OCR extracts text to suggest matches and notify owners (privacy-compliant). | C1 |
| FR-11 | **SkillSwap & Team Finder:** post skill requests/offers, find teammates, list student services. | B2 |
| FR-12 | **Complaint Tracker:** submit with category, description, photo, location. Track status (submitted, under review, assigned, in progress, resolved, reopened). | C2 |
| FR-13 | **Donations:** admins create campaigns with targets. Show progress, updates, contribution records. | A3 |
| FR-14 | **Bill Splitting:** create a bill, add participants, enter items or a total, choose a split method, record payments, show balances. | C3 |
| FR-15 | **Search & Notifications:** global search with filters. In-app and email alerts (messages, bills, deadlines, complaint status, events). | A2 |
| FR-16 | **Moderation:** users report content. Moderators review, hide or remove content, and warn or suspend users. | A3 |
| FR-17 | **Admin Dashboard:** manage users, categories, reports, listings, campaigns, complaints. Usage analytics. | A3 |

## 4. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| Performance | Pages load < 3 s on typical mobile. Search < 2 s. ≥ 500 concurrent users. Images compressed and lazy-loaded. |
| Usability | Responsive, mobile-first. Consistent navigation. Core tasks need no training. Clear errors. Basic a11y (contrast, keyboard, alt text). |
| Security | HTTPS everywhere. Hashed passwords. RBAC (user, moderator, admin). Validation against injection and XSS. Upload type/size limits. Rate limiting. CSRF protection. |
| Privacy | Anonymous posts are not linked to accounts. Complaint and OCR data access restricted. Users can delete their data. Minimum data stored. |
| Reliability | 99 % availability. Regular DB backups. Graceful third-party outages. |
| Maintainability | Modular: new modules added without changing existing ones. Documented code and APIs. |
| Compatibility | Current Chrome, Edge, Firefox, Safari, on mobile and desktop. |

## 5. Sitemap / page list

| Section | Key pages |
|---------|-----------|
| Public | Home / landing, About, Campus Map & Freshie Guide, FAQ/Wiki, Login, Register / Verify email |
| Dashboard | Personal dashboard, Notifications, Profile & Settings, Messages *(out of scope for now)* |
| Transport & Social | RideShare (browse, post, detail), Trip & Meetup Organizer (create, event page), Bill Splitting (create bill, group, balances) |
| Reviews & Careers | Review Hub (search, category, item page, write review), Internship & Referral Board, Alumni Directory, Mentorship Requests |
| Marketplaces | General Marketplace, FYP/ESE Hardware Exchange, Listing detail, Create/Edit listing, SkillSwap & Team Finder |
| Support & Community | Lost & Found (post, search, detail), Anonymous Help Box, Complaint Tracker (submit, track), Donations (list, detail) |
| Admin | Admin dashboard, User management, Moderation queue, Categories, Campaign management, Complaint management, Analytics |
