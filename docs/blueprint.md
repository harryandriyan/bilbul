# **App Name**: ReceiptSplit

## Core Features:

- Responsive Design: Mobile-first design for optimal viewing on phones.
- User Authentication: Secure user authentication via Google or email login.
- Receipt OCR and Data Extraction: Extract text from receipt images using AI tool. Save structured receipt data.
- Bill Splitting and Sharing: Allow users to split receipt items and send invites to other users for shared billing.
- Premium Pricing: Basic pricing plans for premium features.

## Style Guidelines:

- Primary color: Green (#4CAF50) for a clean, financial feel.
- Secondary color: Light gray (#F0F0F0) for backgrounds and subtle elements.
- Accent: Teal (#008080) for interactive elements like buttons and links.
- Clean and readable sans-serif font for clarity.
- Simple and intuitive layout with clear visual hierarchy.
- Subtle animations for loading states and transitions.

## Original User Request:
please create web app that read receipt from photos, the main feature is for split bill, so the key point is

1. Fast and light
2. Mobile view first
3. easy to handle auth, basically the feature will interact between 2 user that want split bill for each receipt entry 
4. use free or cheap AI API (api is from me but will provide later, pls use env file)
5. have share/invite feature 
6. pls also set pricing for paid plan (in future we will develop paid feature (premium feature)
6. smooth simple animation

on tech stack
1. React based, pls handle good SEO but I dont want Next.js beacuse it's heavy
2. css use tailwindcss
3. use google auth or email 
4. for backend part, I'm open suggestion, but keep it simple and lightweight 
5. for database, pls use postgresql but provide migration file (all database structure is on migration)
  