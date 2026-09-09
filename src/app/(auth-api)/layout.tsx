import React from "react";
import Assets from "@/components/Assets";
import { Providers } from "../Providers";
import DynamicFavicon from "../DynamicFavicon";




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang='en' suppressHydrationWarning>
      <Assets />

      <body className="login-page" suppressHydrationWarning>
        <DynamicFavicon />
        <Providers>
          {children}
        </Providers>
      </body>

    </html>
  );
}
