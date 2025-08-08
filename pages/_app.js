import '@/styles/globals.css'

// Force Vercel deployment - test buttons must be visible
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
