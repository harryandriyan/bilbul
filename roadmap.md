Quick Summary of What I've Learned About Bilbul
Core Concept: It's a web app (built with Next.js) that lets users upload a photo of a receipt, uses AI (via Genkit and flows like extract-receipt-data.ts and suggest-split.ts) to parse items/prices/total, and suggests fair bill splits among 2–5 people. Users can do simple AI-suggested splits or advanced manual assignments. Results can be copied to the clipboard for sharing. It's designed as a PWA (Progressive Web App) with a manifest for installable mobile experience.
Key Features:
AI-powered receipt scanning (OCR-like extraction) and split suggestions.
User auth via Google or email (using Firebase, with routes like /api/auth/google and contexts like AuthContext.tsx).
Mobile-first UI with components from Radix UI, Tailwind CSS, Lucide icons, and animations (e.g., Framer Motion for transitions, confetti for celebrations).
Steps: Upload image → Extract data → Choose split type → View/copy results.
Pricing tiers (Free: limited splits; Premium: unlimited, history, etc.) displayed in the UI, but not yet enforced.
Hooks like use-is-mobile.ts for responsive behavior, and reCAPTCHA for spam protection on submissions.
Tech Stack:
Frontend: Next.js (with Turbopack for dev), React, Tailwind CSS, Shadcn/UI components.
Backend/AI: Genkit for AI flows, Firebase for auth/database (client-side in firebase-client.ts).
Other: Zod for form validation, React Hook Form, Recharts (possibly for future visuals), Zustand for state.
Mobile Optimizations: Already strong—mobile-first design, PWA setup, touch-friendly dropzone for uploads, dark mode toggle, and checks for mobile view (e.g., via useIsMobile()). It emphasizes speed with simple animations and lightweight components.
Gaps from Blueprint: Your docs/blueprint.md outlines an ideal "ReceiptSplit" app with PostgreSQL, no Next.js (to keep it light), and features like full invite/sharing and premium enforcement. The current code diverges (e.g., uses Next.js and Firebase), which might be evolutions, but it's still aligned with the mobile-first, fast/light ethos.
Overall, it's a polished MVP with AI at its core, but there's room to enhance usability, scalability, and feature completeness while staying true to mobile optimization.
Improvement Suggestions
I'll focus on high-impact ideas across categories like UX/UI, performance, features, security/accessibility, and tech stack. These are suggestions only—no code here, as requested. We can iterate on any of these if you want me to help implement them later. I prioritized mobile-specific optimizations since that's your focus.

1. UX/UI Enhancements (Mobile-First Focus)
   Progressive Enhancement for Offline Use: Since it's a PWA (great start with public/manifest.json and public/sw.js), add service worker caching for offline receipt uploads or viewing past splits. Mobile users often have spotty connections—queue uploads in the background and sync when online. This could use IndexedDB for local storage.
   Gesture and Touch Improvements: Add swipe gestures for navigating steps (e.g., swipe left/right between upload/review/split views) using libraries like Hammer.js. Also, make the dropzone larger on mobile and add camera integration (e.g., direct photo capture via browser APIs) to reduce friction.
   Onboarding and Tutorials: Include a quick mobile-friendly tutorial carousel on first load (using Framer Motion, which you're already using). Highlight "How It Works" sections more prominently with images (you have some in public/how-it-works-\*.png—integrate them into a swipeable gallery).
   Accessibility Tweaks: Ensure high contrast for dark mode (your useTheme context is solid), add ARIA labels to interactive elements like the copy button, and test with screen readers. For mobile, optimize for one-handed use by placing key buttons (e.g., "Suggest Split") at the bottom.
   Visual Polish: Build on your style guidelines (green/teal accents)—add subtle haptic feedback (via Vibration API) on successful extractions/splits for a more engaging mobile feel. Also, customize the confetti (from react-confetti) to match your color scheme.
2. Performance Optimizations
   Bundle Size and Load Times: Next.js is great but can be heavy (as noted in your blueprint). Audit with Lighthouse and consider code-splitting more aggressively (e.g., dynamic imports for heavy components like Recharts or Confetti). Compress images in public/ and use Next.js Image optimization. For AI flows, ensure they're server-side only to avoid bloating client bundles.
   AI Efficiency: The Genkit flows look lightweight, but for mobile, cache extraction results locally (e.g., via localStorage) so users can resume splits without re-uploading. If AI calls are slow, add progressive loading indicators with skeletons (you have skeleton.tsx—use it more!).
   Battery and Data Savings: On mobile, detect low-data mode (via Network Information API) and reduce image quality or skip non-essential animations. Profile with Chrome DevTools to ensure no unnecessary re-renders in hooks like useAuth or useIsMobile.
3. Feature Expansions
   Full Sharing/Invite System: Currently, it copies to clipboard (nice start), but expand to generate shareable links or invites (e.g., via email/SMS using Firebase Dynamic Links). Allow real-time collaboration where invited users can adjust their assigned items—tied to auth for 2+ users, as per your blueprint. This would make it truly interactive for group bills.
   Premium Enforcement: The UI shows plans, but implement gating (e.g., limit free users to 3 splits/day via Firebase auth metadata). Add a dashboard for split history and friend management as premium perks.
   Advanced AI Suggestions: Enhance suggest-split.ts to consider user preferences (e.g., "Person A always takes appetizers") stored in Firebase. Handle edge cases like taxes/tips or multi-currency receipts. Integrate user feedback loops (e.g., "Was this split fair?") to fine-tune the model.
   Receipt Management: Add a history view for saved receipts (free: last 3; premium: unlimited). Allow editing extracted data more intuitively (you have some editing state—make it drag-and-drop for assignments on mobile).
   Integration Ideas: Add Venmo/PayPal links in split results for instant payments. Or integrate with calendar apps to schedule recurring group bills.
4. Security and Reliability
   Auth and Data Privacy: Firebase auth is solid, but add email verification flows (you have /api/auth/verify) and ensure AI-processed data (e.g., receipt images) is anonymized/deleted after use. For mobile, implement biometric login (e.g., via WebAuthn) for quicker access.
   Error Handling: Improve fallbacks for AI failures (e.g., blurry photos)—prompt users to retake or manually input items. Your toasts are great; add undo options for assignments.
   Captcha and Abuse Prevention: You have reCAPTCHA—good for bots—but monitor AI usage to prevent abuse (e.g., rate limits in Genkit).
5. Tech Stack and Maintenance Suggestions
   Align with Blueprint: If Next.js feels too heavy (as you originally wanted to avoid it), consider migrating to Vite + React for a lighter build. Firebase is a simple backend choice (vs. PostgreSQL in the blueprint), but if you need more structure, add Supabase for hybrid Firebase-like + SQL.
   Testing and CI: Add unit tests for AI flows (e.g., with Vitest) and e2e tests for mobile flows (using Playwright with device emulation). Set up GitHub Actions for linting/typechecking on push.
   Documentation: Update README.md—it's currently generic. Add setup instructions, env vars (e.g., for AI APIs as per blueprint), and a contributing guide. Expand docs/blueprint.md with current divergences.
   Scalability: If user growth happens, monitor Firebase costs (AI calls can add up). Consider cheaper AI alternatives like Groq or open-source models if Genkit's Google AI dependency gets pricey.
   These suggestions aim to make Bilbul even faster, more intuitive, and feature-rich while keeping the mobile focus. What do you think—want to prioritize any area (e.g., sharing features or performance tweaks)? Or should I dig deeper into a specific part of the code for more targeted ideas? Let's pair program this! 🚀
