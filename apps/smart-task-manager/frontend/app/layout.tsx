import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow - Smart Task Management',
    template: '%s | TaskFlow',
  },
  description:
    'Organize your projects and tasks efficiently with TaskFlow. Collaborate with your team, track progress, and deliver on time.',
  keywords: [
    'task management',
    'project management',
    'team collaboration',
    'productivity',
    'project tracking',
  ],
  openGraph: {
    title: 'TaskFlow - Smart Task Management',
    description:
      'Organize your projects and tasks efficiently with TaskFlow.',
    type: 'website',
    siteName: 'TaskFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskFlow - Smart Task Management',
    description:
      'Organize your projects and tasks efficiently with TaskFlow.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
