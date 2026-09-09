'use client'
import { useEffect } from 'react'
import { getCompanyFavicon } from '../components/OrderProcess/actions/FetchCompanyDetails'

export default function DynamicFavicon() {
  useEffect(() => {
    getCompanyFavicon().then((favicon) => {
      if (!favicon) return
      const href = `/api/uploads/${encodeURIComponent(favicon)}`
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = href
    })
  }, [])

  return null
}
