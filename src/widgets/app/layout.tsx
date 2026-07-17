'use client';

import { WidgetLayout } from '@nitrostack/widgets';
import { usePathname } from 'next/navigation';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        {pathname === '/' ? children : <WidgetLayout>{children}</WidgetLayout>}
      </body>
    </html>
  );
}
