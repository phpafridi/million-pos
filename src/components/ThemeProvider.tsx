'use client'
import React, { useEffect, useState } from 'react'

type ThemeSetting = {
  setting_key: string
  setting_value: string
}

export default function ThemeProvider() {
  const [css, setCss] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/theme-settings')
        const json = await res.json()
        if (!json.success) return

        const map: Record<string, string> = {}
        json.data.forEach((s: ThemeSetting) => { map[s.setting_key] = s.setting_value })

        const get = (key: string, fallback: string) => map[key] || fallback

        const primary = get('color_primary', '#4f46e5')
        const sidebarBg = get('color_sidebar_bg', '#1f2937')
        const sidebarText = get('color_sidebar_text', '#e5e7eb')
        const topbarBg = get('color_topbar_bg', '#ffffff')
        const topbarText = get('color_topbar_text', '#111827')
        const buttonPrimary = get('color_button_primary', '#4f46e5')
        const buttonDanger = get('color_button_danger', '#dc2626')
        const pageBg = get('color_page_bg', '#f3f4f6')
        const cardBg = get('color_card_bg', '#ffffff')
        const textColor = get('color_text', '#111827')
        const posBg = get('color_pos_bg', '#f5f6fa')
        const posPanelBg = get('color_pos_panel_bg', '#ffffff')
        const posTopbarBg = get('color_pos_topbar_bg', '#ffffff')
        const posAccent = get('color_pos_accent', '#6366f1')
        const purchaseBg = get('color_purchase_bg', '#f5f6fa')
        const purchasePanelBg = get('color_purchase_panel_bg', '#ffffff')
        const purchaseTopbarBg = get('color_purchase_topbar_bg', '#ffffff')
        const purchaseAccent = get('color_purchase_accent', '#6366f1')

        // Overrides target the same AdminLTE-style classes used across every
        // admin page (main-sidebar, navbar, box, btn.bg-navy, content-wrapper),
        // so one set of rules re-themes the whole app rather than page-by-page.
        setCss(`
          :root {
            --theme-primary: ${primary};
            --theme-sidebar-bg: ${sidebarBg};
            --theme-sidebar-text: ${sidebarText};
            --theme-topbar-bg: ${topbarBg};
            --theme-topbar-text: ${topbarText};
            --theme-button-primary: ${buttonPrimary};
            --theme-button-danger: ${buttonDanger};
            --theme-page-bg: ${pageBg};
            --theme-card-bg: ${cardBg};
            --theme-text: ${textColor};
            --pos-bg: ${posBg};
            --pos-panel-bg: ${posPanelBg};
            --pos-topbar-bg: ${posTopbarBg};
            --pos-accent: ${posAccent};
            --purchase-bg: ${purchaseBg};
            --purchase-panel-bg: ${purchasePanelBg};
            --purchase-topbar-bg: ${purchaseTopbarBg};
            --purchase-accent: ${purchaseAccent};
          }

          .main-sidebar, .main-sidebar .sidebar { background-color: ${sidebarBg} !important; }
          .sidebar-menu > li > a { color: ${sidebarText} !important; }
          .sidebar-menu > li.header { color: ${sidebarText} !important; opacity: 0.7; }
          .sidebar-menu > li > .treeview-menu { background-color: ${sidebarBg} !important; }
          .sidebar-menu > li > .treeview-menu > li > a { color: ${sidebarText} !important; }
          .sidebar-menu > li.active > a, .sidebar-menu > li > a:hover { background-color: ${primary} !important; }

          .navbar, .main-header .navbar { background-color: ${topbarBg} !important; }
          .navbar .navbar-nav > li > a, .navbar-brand { color: ${topbarText} !important; }

          .content-wrapper, .right-side { background-color: ${pageBg} !important; }
          body { color: ${textColor}; }

          .box, .box-background { background-color: ${cardBg} !important; }
          .box-header-background, .box-header-background-light { background-color: ${primary} !important; border-color: ${primary} !important; }

          .btn.bg-navy, .btn-primary { background-color: ${buttonPrimary} !important; border-color: ${buttonPrimary} !important; }
          .btn-danger { background-color: ${buttonDanger} !important; border-color: ${buttonDanger} !important; }
        `)
      } catch (err) {
        console.error('Failed to load theme settings:', err)
      }
    }
    load()
  }, [])

  if (!css) return null
  return <style id="dynamic-theme-overrides" href="dynamic-theme-overrides" precedence="high" dangerouslySetInnerHTML={{ __html: css }} />
}
