import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ReconAgent | AI Financial Reconciliation', description: 'Close your books, intelligently.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
