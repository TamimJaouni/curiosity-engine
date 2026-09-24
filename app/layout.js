import "./globals.css";

export const metadata = {
  title: "Intellectual OS",
  description: "Discover, understand, connect, and remember ideas that matter.",
  applicationName: "Intellectual OS"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10"
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
