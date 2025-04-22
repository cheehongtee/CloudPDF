# CloudPDF - Your Cloud-Based PDF Management Solution

This project is a Next.js application providing cloud-based PDF viewing, storage, and tools, integrated with Firebase.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Firebase account

### Setup Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication with Email/Password provider
4. Create a Firestore database in test mode

### Configuration

1. In your Firebase project, go to Project Settings > General
2. Scroll down to "Your apps" section
3. Click on the Web app icon (</>) to register a new app if you haven't already
4. Copy the Firebase configuration object

### Environment Variables

1. Copy the `.env.local.example` file to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and replace the placeholder values with your Firebase configuration values.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- User authentication (login, register, logout)
- Protected routes
- Firebase Firestore integration
- Responsive UI

## Project Structure

- `/src/app`: Next.js app router pages
- `/src/components`: Reusable components
- `/src/context`: React context providers
- `/src/lib`: Utility functions and configurations (Firebase setup)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
