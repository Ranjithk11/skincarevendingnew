import "./globals.scss";
import NextAuthSessionProvider from "./api/auth/[...nextauth]/providers/sessionProvider";
import { Metadata } from "next";
import { Roboto } from "next/font/google";
import MuiThemeProvider from "@/theme/provider";
import { ReduxStateProviders } from "@/redux/provider";
import { GoogleTagManager } from "@next/third-parties/google";
import CSPostHogProvider from "@/components/PostHog/PostHog";
import HomeLayout from "@/components/layouts/HomeLayout";
import DefaultLayout from "@/components/layouts/DefaultLayout";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skin Care",
  description: "skincare",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <CSPostHogProvider>
        <body suppressHydrationWarning={true} className={roboto.className}>
          <ReduxStateProviders>
            <NextAuthSessionProvider>
              <MuiThemeProvider>
                <DefaultLayout>
                  {children}   
                </DefaultLayout>
              </MuiThemeProvider>
            </NextAuthSessionProvider>
          </ReduxStateProviders>
        </body>
        <GoogleTagManager gtmId="G-0CZC9L085R" />
      </CSPostHogProvider>
    </html>
  );
}
