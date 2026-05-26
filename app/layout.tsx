import type {Metadata} from 'next';
import { DM_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css'; // Global styles

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Questionário de Avaliação - Saúde & Bem-estar Emocional',
  description: 'Questionário interativo de Saúde e Bem-estar Emocional.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${cormorantGaramond.variable}`}>
      <body className="font-sans antialiased bg-brand-bg text-brand-text min-h-screen flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
