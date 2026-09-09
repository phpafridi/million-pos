import React from "react";
import Assets from "@/components/Assets";
import { Providers } from "../../../../Providers";





export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang='en' suppressHydrationWarning>
      <Assets />

      <body className="login-page" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>

    </html>
  );
}
