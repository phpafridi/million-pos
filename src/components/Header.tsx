'use client'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { getCompanyName, getCompanyLogo } from './OrderProcess/actions/FetchCompanyDetails'
import { useNotifications } from './store/useNotifications'
import Navigation from './Navigation'

export default function Header() {
  const { data: session } = useSession()
  const loginSlug = (session?.user as any)?.login_slug as string | null
  const [companyName, setCompanyName] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const { 
    lowStockProducts, 
    pendingOrders, 
    expiringProducts, 
    expiredProducts,
    expiringBatches,
    expiredBatches,
    sidebarCollapsed,
    toggleSidebar,
    refreshLowStock, 
    refreshPendingOrders,
    refreshExpiryAlerts 
  } = useNotifications()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const [headerColor, setHeaderColor] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/theme-settings').then(r => r.json()).then(json => {
      if (json.success) {
        const row = json.data.find((s: any) => s.setting_key === 'sidebar_header_color')
        if (row?.setting_value) setHeaderColor(row.setting_value)
      }
    })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const name = await getCompanyName()
      if (name) setCompanyName(name)
      const logo = await getCompanyLogo()
      if (logo) setCompanyLogo(logo)
      await refreshLowStock()
      await refreshPendingOrders()
      await refreshExpiryAlerts()
    }
    fetchData()

    // Restore sidebar collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      if (saved === '1') {
        document.body.classList.add('sidebar-collapse')
        // Sync store without triggering another toggle
        useNotifications.setState({ sidebarCollapsed: true })
      }
    }

    // Set up interval to refresh notifications every 5 minutes
    const interval = setInterval(() => {
      refreshLowStock()
      refreshPendingOrders()
      refreshExpiryAlerts()
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [refreshLowStock, refreshPendingOrders, refreshExpiryAlerts])

  // Click outside to close mobile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  // Bind click handlers to treeview parents inside the mobile menu when it opens
  useEffect(() => {
    if (!mobileMenuOpen) return

    const menuEl = mobileMenuRef.current
    if (!menuEl) return

    // collect anchors that are tree parents
    const parentAnchors = Array.from(menuEl.querySelectorAll('li.treeview > a')) as HTMLAnchorElement[]

    // map to remember handlers for cleanup
    const handlers = new Map<HTMLAnchorElement, EventListener>()

    parentAnchors.forEach((anchor) => {
      const handler: EventListener = (ev) => {
        ev.preventDefault()

        const li = (anchor.closest('li.treeview') as HTMLElement | null)
        if (!li) return

        const submenu = li.querySelector('.treeview-menu') as HTMLElement | null
        const isOpen = li.classList.contains('menu-open')

        if (isOpen) {
          li.classList.remove('menu-open')
          if (submenu) submenu.style.display = 'none'
        } else {
          li.classList.add('menu-open')
          if (submenu) submenu.style.display = 'block'
        }
      }

      // ensure submenu initial state is hidden unless class present
      const li = anchor.closest('li.treeview') as HTMLElement | null
      const submenu = li?.querySelector('.treeview-menu') as HTMLElement | null
      if (submenu && !li?.classList.contains('menu-open')) {
        submenu.style.display = 'none'
      }

      anchor.addEventListener('click', handler)
      handlers.set(anchor, handler)
    })

    // cleanup on close/unmount
    return () => {
      handlers.forEach((h, a) => a.removeEventListener('click', h))
    }
  }, [mobileMenuOpen])

  // Calculate total alerts
  const totalExpiryAlerts = expiringProducts.length + expiredProducts.length + expiringBatches.length + expiredBatches.length
  const totalLowStockAlerts = lowStockProducts.length
  const totalPendingOrders = pendingOrders.length

  // Refresh all notifications manually
  const handleRefreshNotifications = async () => {
    await Promise.all([
      refreshLowStock(),
      refreshPendingOrders(),
      refreshExpiryAlerts()
    ])
  }

  return (
    <header ref={headerRef} className="main-header">
      {/* Hamburger icon for mobile */}
      <button
        className="lg:hidden"
        style={{ background: 'none', border: 'none', color: '#fff', marginLeft: '5px' }}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="fa fa-bars"></span>
      </button>

      {/* Company Logo + Name */}
      <a
        href='/'
        className="logo"
        style={{
          ...(headerColor ? { backgroundColor: headerColor } : {}),
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {companyLogo && (
          <img
            src={`/api/uploads/${encodeURIComponent(companyLogo)}`}
            alt=""
            style={{ maxHeight: 32, maxWidth: 60, objectFit: 'contain' }}
            onError={() => setCompanyLogo('')}
          />
        )}
        {companyName && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</span>
        )}
      </a>

      {/* Navbar */}
      <nav className="navbar navbar-static-top" role="navigation">
        <div className="navbar-custom-menu" style={{ float: 'right' }}>
          <ul className="nav navbar-nav">

            {/* Sidebar Toggle Button */}
            <li>
              <a
                href="#"
                onClick={e => { e.preventDefault(); toggleSidebar() }}
                style={{ color: '#fff' }}
                title={sidebarCollapsed ? 'Show Sidebar (Full Screen)' : 'Hide Sidebar (Full Screen)'}
              >
                <i className={`fa ${sidebarCollapsed ? 'fa-expand' : 'fa-compress'}`}
                  style={{ fontSize: 15 }}
                />
              </a>
            </li>

            {/* Refresh Button */}
            <li>
              <a 
                href="#" 
                onClick={handleRefreshNotifications}
                style={{ color: '#fff' }}
                title="Refresh Notifications"
              >
                <i className="fa fa-refresh"></i>
              </a>
            </li>

            {/* Expiry Alerts - FIXED ICON */}
            <li className="dropdown messages-menu">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown" style={{ color: '#fff' }}>
                <i className="fa fa-exclamation-triangle"></i>
                {totalExpiryAlerts > 0 && (
                  <span className="label label-danger">{totalExpiryAlerts}</span>
                )}
              </a>
              <ul className="dropdown-menu" style={{ width: '300px' }}>
                <li className="header">
                  {totalExpiryAlerts > 0 ? (
                    <>
                      <i className="fa fa-exclamation-triangle text-danger"></i>{' '}
                      {expiredProducts.length + expiredBatches.length} expired,{' '}
                      {expiringProducts.length + expiringBatches.length} expiring soon
                    </>
                  ) : (
                    <>
                      <i className="fa fa-check text-success"></i> No expiry alerts
                    </>
                  )}
                </li>
                <li>
                  <ul className="menu">
                    {/* Expired Products */}
                    {expiredProducts.slice(0, 3).map((product) => (
                      <li key={product.id}>
                        <Link 
                          href="/dashboard/product/manage-product" 
                          className="text-danger"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-warning text-danger"></i> 
                          <strong>{product.name}</strong> - EXPIRED
                          <br />
                          <small>Stock: {product.stock_quantity}</small>
                        </Link>
                      </li>
                    ))}
                    
                    {/* Expiring Soon Products */}
                    {expiringProducts.slice(0, 3).map((product) => (
                      <li key={product.id}>
                        <Link 
                          href="/dashboard/product/manage-product" 
                          className="text-warning"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-clock-o text-warning"></i> 
                          <strong>{product.name}</strong> - {product.days_remaining} days left
                          <br />
                          <small>Expires: {product.expiry_date}</small>
                        </Link>
                      </li>
                    ))}
                    
                    {/* Expired Batches */}
                    {expiredBatches.slice(0, 2).map((batch) => (
                      <li key={`eb-${batch.batch_id}`}>
                        <Link 
                          href="/dashboard/manage-purchase/purchase/batch-stock"
                          className="text-danger"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-warning text-danger"></i>{' '}
                          <strong>{batch.product_name}</strong> — BATCH EXPIRED
                          <br />
                          <small>Batch: {batch.batch_number} · Stock: {batch.qty_remaining}</small>
                        </Link>
                      </li>
                    ))}

                    {/* Expiring Batches */}
                    {expiringBatches.slice(0, 2).map((batch) => (
                      <li key={`xb-${batch.batch_id}`}>
                        <Link 
                          href="/dashboard/manage-purchase/purchase/batch-stock"
                          className="text-warning"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-clock-o text-warning"></i>{' '}
                          <strong>{batch.product_name}</strong> — {batch.days_remaining}d left
                          <br />
                          <small>Batch: {batch.batch_number} · Exp: {batch.expiry_date}</small>
                        </Link>
                      </li>
                    ))}
                    
                    {totalExpiryAlerts === 0 && (
                      <li>
                        <a href="#" className="text-muted">
                          <i className="fa fa-check text-success"></i> 
                          All products are within expiry dates
                        </a>
                      </li>
                    )}

                    {totalExpiryAlerts > 6 && (
                      <li>
                        <div className="text-center text-muted">
                          <small>... and {totalExpiryAlerts - 6} more alerts</small>
                        </div>
                      </li>
                    )}
                  </ul>
                </li>
                <li className="footer">
                  <Link 
                    href="/dashboard/product/expiry-alerts" 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fa fa-list"></i> View All Expiry Alerts
                  </Link>
                </li>
              </ul>
            </li>

            {/* Low Stock */}
            <li className="dropdown messages-menu">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown" style={{ color: '#fff' }}>
                <i className="fa fa-flag-o"></i>
                {totalLowStockAlerts > 0 && (
                  <span className="label label-warning">{totalLowStockAlerts}</span>
                )}
              </a>
              <ul className="dropdown-menu">
                <li className="header">
                  {totalLowStockAlerts > 0 ? (
                    <>
                      <i className="fa fa-exclamation-circle text-warning"></i>
                      {totalLowStockAlerts} product(s) running low
                    </>
                  ) : (
                    "No low stock alerts"
                  )}
                </li>
                <li>
                  <ul className="menu">
                    {lowStockProducts.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <Link 
                          href="/dashboard/product/manage-product"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-cube text-warning"></i>
                          {p.name} ({p.qty} {p.unit} left)
                          {p.notifyQty && <br />}
                          {p.notifyQty && <small>Alert at: {p.notifyQty}</small>}
                        </Link>
                      </li>
                    ))}
                    {totalLowStockAlerts === 0 && (
                      <li>
                        <a href="#" className="text-muted">
                          <i className="fa fa-check text-success"></i> 
                          All stock levels are good
                        </a>
                      </li>
                    )}
                  </ul>
                </li>
                <li className="footer">
                  <Link 
                    href="/dashboard/product/manage-product"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fa fa-cubes"></i> Manage Products
                  </Link>
                </li>
              </ul>
            </li>

            {/* Pending Orders */}
            <li className="dropdown messages-menu">
              <a href="#" className="dropdown-toggle" data-toggle="dropdown" style={{ color: '#fff' }}>
                <i className="fa fa-bell-o"></i>
                {totalPendingOrders > 0 && (
                  <span className="label label-info">{totalPendingOrders}</span>
                )}
              </a>
              <ul className="dropdown-menu">
                <li className="header">
                  {totalPendingOrders > 0 ? (
                    <>
                      <i className="fa fa-clock-o text-info"></i>
                      {totalPendingOrders} pending order(s)
                    </>
                  ) : (
                    "No pending orders"
                  )}
                </li>
                <li>
                  <ul className="menu">
                    {pendingOrders.slice(0, 5).map((o) => (
                      <li key={o.id}>
                        <Link 
                          href="/dashboard/order-process/manage-order"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fa fa-shopping-cart text-info"></i>
                          {o.customer_name} 
                          <br />
                          <small>Ordered: {o.order_date}</small>
                        </Link>
                      </li>
                    ))}
                    {totalPendingOrders === 0 && (
                      <li>
                        <a href="#" className="text-muted">
                          <i className="fa fa-check text-success"></i> 
                          No pending orders
                        </a>
                      </li>
                    )}
                  </ul>
                </li>
                <li className="footer">
                  <Link 
                    href="/dashboard/order-process/manage-order"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fa fa-list-alt"></i> Manage Orders
                  </Link>
                </li>
              </ul>
            </li>

            {/* Simple Logout Button */}
            <li>
              <a href="#" onClick={() => signOut({ callbackUrl: loginSlug ? `/login/${loginSlug}` : '/' })} style={{ color: '#fff' }}>
                <i className="fa fa-sign-out"></i> Logout
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gray-800 text-white absolute top-full left-0 right-0 z-50 max-h-96 overflow-y-auto" ref={mobileMenuRef}>
          <Navigation />
        </div>
      )}
    </header>
  )
}