import { PortfolioClient } from "@/components/portfolio/portfolio-client"

export const metadata = {
  title: "Portfolio",
  description: "Track coldkey balances via TAO.app",
}

/** Public page — not listed in PROTECTED_PREFIXES middleware. */
export default function PortfolioPage() {
  return <PortfolioClient />
}
