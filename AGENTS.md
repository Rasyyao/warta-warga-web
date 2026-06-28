<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [warta-warga-web] recent context, 2026-06-28 6:49pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,119t read) | 552,457t work | 97% savings

### Jun 26, 2026
427 10:45a 🔵 Warta Warga — WhatsApp AI Agent App Landing Page Project Initiated
428 10:46a ⚖️ Warta Warga Landing Page — CoreShift Dribbble Design Chosen as Visual Reference
429 " 🟣 Warta Warga Landing Page — Next.js Project Bootstrapped with Custom Metadata and Base Styles
430 10:48a 🟣 Warta Warga Landing Page — Full page.tsx Implemented with 5 Sections and 3 Reusable Components
431 10:49a 🟣 Warta Warga Landing Page — Production Build Passes, Dev Server Live at localhost:3000
S42 JagaWarga Landing Page — Implement design.md as full Next.js landing page in warta-warga-web (Jun 26 at 10:49 AM)
S41 Warta Warga Landing Page — Built full Next.js landing page inspired by CoreShift Dribbble design reference (Jun 26 at 10:49 AM)
432 11:04a 🟣 Warta Warga Web — Landing Page Implementation Initiated
433 11:05a 🟣 Warta Warga Rebranded to JagaWarga — Font and Metadata Updated in layout.tsx
434 11:06a 🟣 JagaWarga Design Token System Established in globals.css
435 " 🟣 Old page.tsx Deleted to Replace with New Landing Page
436 11:09a 🟣 JagaWarga Landing Page — Full page.tsx Written from Scratch
437 " 🔴 ESLint Errors in page.tsx — Unescaped Quotes in Testimonial Text
S43 ParticleField Background Component Added to JagaWarga Landing Page (Jun 26 at 11:10 AM)
438 11:11a 🟣 JagaWarga Landing Page — Production Build Verified and Statically Prerendered
439 11:12a 🟣 JagaWarga Landing Page — Complete Implementation Summary for warta-warga-web
440 " ⚖️ Single-File Landing Page Architecture — No Component Splitting for Competition Project
441 11:13a 🔵 warta-warga-web Project Stack Confirmed — Next.js 16 App Router with Tailwind v4
442 " 🟣 ParticleField Background Component Added to JagaWarga Landing Page
443 " 🔴 ESLint Unused `index` Variable Fixed in ParticleField — pnpm lint Now Clean
S44 Tailwind v4 @theme Inline Pattern — CSS-First Config Replaces tailwind.config.ts (Jun 26 at 11:13 AM)
444 11:17a ✅ bg-soft Token Used in FeatureVisual Components — Implies globals.css Token Addition
445 " 🔵 particle-drift CSS Animation Keyframe Required in globals.css — Not Yet Confirmed Added
446 11:18a 🟣 warta-warga-web Landing Page — Final Completed State Reference
447 " ⚖️ Accessibility Patterns Applied Throughout JagaWarga Landing Page
448 11:19a 🔵 Tailwind v4 @theme Inline Pattern — CSS-First Config Replaces tailwind.config.ts
S45 Warta Warga Web — Hero Visual Animated Validation Demo (fix messy UI, cycling chat scenarios) (Jun 26 at 11:19 AM)
449 11:24a 🟣 Warta Warga — Animated Hoax Validation Chat Demo UI Requested
450 " 🟣 Warta Warga — validationScenarios Data Added to page.tsx for Animated Demo
451 11:25a 🟣 Warta Warga — HeroVisual Refactored to Cycling Animated Validation Demo
### Jun 27, 2026
452 2:21p 🔵 warta-warga-web Dashboard API Architecture — Supabase Postgres with Sandbox Fallback
453 " 🔵 warta-warga-web .env Has SUPABASE_DB_URL with URL-Encoded Password Containing Special Characters
455 2:22p 🔴 warta-warga-web Dashboard Loading Hang Fixed with DB Timeout + Client Abort Signal
456 2:31p 🔴 Dashboard API Data Fetch Fixed — Timeout Extended and Error Fallback Added
457 2:32p 🔴 Reports Page Filter Bar and Table Made Mobile-Responsive
### Jun 28, 2026
468 12:42a 🟣 RAG Source Management UI — Supabase CRUD Integration Scoped
469 12:43a 🟣 RAG Dashboard — Supabase Integration for sumber_crawl & sources_whitelist
470 12:44a 🟣 RAG Dashboard — Supabase CRUD Integration Planned for warta-warga-web
471 " 🟣 RAG Source Management UI — Supabase Integration Initiated
472 12:57a 🔵 warta-warga-web — Supabase Intermittent Disconnect Falls Back to Dummy Data
473 12:58a 🔵 warta-warga-web Supabase Uses Pooler URL (Port 6543) — Not Direct Connection
474 " 🔵 reports/page.tsx Is a 706-Line Client Component with Hardcoded Regional GPS Data
475 12:59a 🔴 Dashboard API Dummy Data Fallbacks Removed — DB Errors Now Return HTTP 503
476 " 🔴 Supabase Postgres Pool Tuned — max:3, idle_timeout:30, connect_timeout:30
477 " 🔴 Dashboard Overview Page Now Shows DB Error UI with Retry Button Instead of Silent Failure
478 " 🔵 reports/page.tsx fetchReportsData Still Silently Swallows Errors via .catch(() => setIsLoading(false))
479 1:05a 🔵 Supabase Connection URL Has URL-Encoded Special Characters in Password
480 1:06a 🔴 Supabase Timeout Fixed — URL-Encoded Password Decoded Before postgres.js Connection
481 " 🔴 Leaflet Map Init Error Fixed — Container Guard and dbError Early Return Added
S48 Supabase Timeout Fixed — URL-Encoded Password Decoded Before postgres.js Connection (Jun 28 at 1:06 AM)
482 1:12a 🔵 warta-warga-web — Supabase "Service Unavailable" Error Reported
483 1:13a 🔵 warta-warga-web — Supabase Service Unavailable Error
484 " 🔵 warta-warga-web — Supabase Service Unavailable Error Encountered
485 1:14a 🔵 warta-warga-web Supabase Connection Returns Service Unavailable
486 " 🔵 warta-warga-web — Supabase Service Unavailable Error Under Investigation
487 1:15a 🔴 warta-warga-web Build Fixed — Replaced getSqlConnection with Supabase JS Client in page.tsx

Access 552k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>