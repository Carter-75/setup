import "./globals.css";
import "bulma/css/bulma.min.css";

import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Template App",
  description: "A project template",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

