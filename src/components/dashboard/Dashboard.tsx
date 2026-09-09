'use client'

import React, { useEffect, useState } from 'react'

// Import server actions
import { getProfit } from './actions/getProfit'
import { getRecentOrders } from './actions/getRecentOrders'
import { getRevenue } from './actions/getRevenue'
import { getSalesByPeriod } from './actions/getSalesByPeriod'
import { getSalesQuantity } from './actions/getSalesQuantity'
import { getStockValue } from './actions/getStockValuet'
import { getTopProducts } from './actions/getTopProducts'
import { fetchCurrency } from "../settings/actions/fetchCurrency";

type TopProduct = {
  sl: number
  barcode: string
  name: string
  qty: number
}

type RecentOrder = {
  id: number
  customer: string
  date: string
  status: number
  total: number
}

type SalesPeriod = {
  today: number
  week: number
  month: number
  year: number
}

// Get current month name
const getCurrentMonth = () =>
  new Date().toLocaleString('en-PK', { month: 'long' })

export default function Dashboard() {
  const [revenue, setRevenue] = useState<number>(0)
  const [profit, setProfit] = useState<number>(0)
  const [salesQty, setSalesQty] = useState<number>(0)
  const [stockValue, setStockValue] = useState<number>(0)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>({
    today: 0,
    week: 0,
    month: 0,
    year: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [Currency, setCurrency] = useState('Rs') // default

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all dashboard data
        const [
          revenueValue,
          profitValue,
          salesQuantity,
          stock,
          topProductsDataRaw,
          recentOrdersDataRaw,
          salesByPeriodRaw,
          currencyData
        ] = await Promise.all([
          getRevenue(),
          getProfit(),
          getSalesQuantity(),
          getStockValue(),
          getTopProducts(),
          getRecentOrders(),
          getSalesByPeriod(),
          fetchCurrency() // fetch currency from DB
        ])

        setRevenue(revenueValue)
        setProfit(profitValue)
        setSalesQty(salesQuantity)
        setStockValue(stock.totalValue)


        // Map Top Products safely
        const topProductsData: TopProduct[] = (topProductsDataRaw || []).map(
          (p: any, index: number) => ({
            sl: p.sl ?? index + 1,
            barcode: p.barcode ?? p.product_code ?? '',
            name: p.name ?? p.product_name ?? '',
            qty: p.qty ?? p.quantity ?? 0,
          })
        )
        setTopProducts(topProductsData)

        // Map Recent Orders safely
        const recentOrdersData: RecentOrder[] = (recentOrdersDataRaw || []).map(
          (o: any) => ({
            id: o.order_id ?? o.id,
            customer: o.customer?.customer_name ?? o.customerName ?? 'Unknown',
            date: new Date(o.order_date ?? o.date).toLocaleDateString('en-PK'),
            status: o.order_status ?? o.status ?? 0,
            total: o.grand_total ?? o.total ?? 0,
          })
        )
        setRecentOrders(recentOrdersData)

        // Map Sales Period safely
        setSalesPeriod({
          today: salesByPeriodRaw?.dailySales ?? 0,
          week: salesByPeriodRaw?.weeklySales ?? 0,
          month: salesByPeriodRaw?.monthlySales ?? 0,
          year: salesByPeriodRaw?.yearlySales ?? 0,
        })

        // Set currency
        if (currencyData?.currency) setCurrency(currencyData.currency)

        setLoading(false)
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        setError(`Failed to load dashboard data: ${err?.message || err}`)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const mapOrderStatus = (status: number) => {
    switch (status) {
      case 0:
        return 'Pending'
      case 1:
        return 'Cancelled'
      case 2:
        return 'Completed'
      default:
        return 'Unknown'
    }
  }

  const currentMonth = getCurrentMonth()

  // Format number dynamically using fetched currency
  const formatCurrency = (amount: number) =>
    `${Currency} ${new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`

  if (loading) return <div className="right-side" style={{ minHeight: '945px' }}>Loading dashboard...</div>
  if (error) return (
    <div className="right-side" style={{ minHeight: '945px', padding: 20 }}>
      <div className="alert alert-danger">
        <strong>Dashboard failed to load.</strong><br />
        {error}
      </div>
    </div>
  )

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>


      <section className="content-header">
        <ol className="breadcrumb">
          <li>Email : invexapk@gmail.com</li>
          <li>@adkhyber - facebook</li>
          
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <div className="wraper container-fluid">
          {/* ===== Top Stats ===== */}
          <div className="row">
            <div className="col-lg-3 col-sm-6 col-sx-12">
              <div className="small-box bg-aqua">
                <div className="inner">
                  <h2>{formatCurrency(revenue)}</h2>
                  <p>Revenue</p>
                </div>
                <div className="icon">
                  <i className="fa fa-bar-chart-o"></i>
                </div>
                <span className="small-box-footer">{currentMonth}</span>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6 col-sx-12">
              <div className="small-box bg-purple">
                <div className="inner">
                  <h2>{formatCurrency(profit)}</h2>
                  <p>Profit</p>
                </div>
                <div className="icon">
                  <i className="fa fa-money"></i>
                </div>
                <span className="small-box-footer">{currentMonth}</span>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6 col-sx-12">
              <div className="small-box bg-info">
                <div className="inner">
                  <h2>{salesQty}</h2>
                  <p>Quantity of Sales</p>
                </div>
                <div className="icon">
                  <i className="fa fa-shopping-cart"></i>
                </div>
                <span className="small-box-footer">{currentMonth}</span>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6 col-sx-12">
              <div className="small-box bg-success">
                <div className="inner">
                  <h2>{formatCurrency(stockValue)}</h2>
                  <p>Value of Stock</p>
                </div>
                <div className="icon">
                  <i className="fa fa-suitcase"></i>
                </div>
                <span className="small-box-footer">
                  Cost of All Items Held in Stock
                </span>
              </div>
            </div>
          </div>

          {/* ===== Sales by Period ===== */}
          <div className="row text-center m-t-30 m-b-30 chart-table">
            <div className="col-md-3 col-sm-6 col-xs-12">
              <h4>{salesPeriod.today}</h4>
              <small className="text-muted">Today's Sales</small>
            </div>
            <div className="col-md-3 col-sm-6 col-xs-12">
              <h4>{salesPeriod.week}</h4>
              <small className="text-muted">This Week's Sales</small>
            </div>
            <div className="col-md-3 col-sm-6 col-xs-12">
              <h4>{salesPeriod.month}</h4>
              <small className="text-muted">This Month's Sales</small>
            </div>
            <div className="col-md-3 col-sm-6 col-xs-12">
              <h4>{salesPeriod.year}</h4>
              <small className="text-muted">This Year's Sales</small>
            </div>
          </div>

          <div className="row">
            {/* ===== Top Products ===== */}
            <div className="col-md-4">
              <div className="portlet">
                <div className="portlet-heading">
                  <h3 className="portlet-title text-dark text-uppercase">
                    Top 5 Selling Products
                  </h3>
                </div>
                <div
                  className="portlet-body"
                  style={{ height: '400px', overflowY: 'auto' }}
                >
                  <table className="table no-margin">
                    <thead>
                      <tr>
                        <th>Sl</th>
                        <th>Barcode</th>
                        <th>Product Name</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length > 0 ? (
                        topProducts.map((p) => (
                          <tr key={p.sl}>
                            <td>{p.sl}</td>
                            <td>{p.barcode}</td>
                            <td>{p.name}</td>
                            <td>{p.qty}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===== Recent Orders ===== */}
            <div className="col-md-8">
              <div className="portlet">
                <div className="portlet-heading">
                  <h3 className="portlet-title text-dark text-uppercase">
                    Recent Orders
                  </h3>
                </div>
                <div
                  className="portlet-body"
                  style={{ height: '400px', overflowY: 'auto' }}
                >
                  <div className="table-responsive">
                    <table className="table no-margin">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Order Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length > 0 ? (
                          recentOrders.map((o) => (
                            <tr key={o.id}>
                              <td>{o.id}</td>
                              <td>{o.customer}</td>
                              <td>{o.date}</td>
                              <td>{mapOrderStatus(o.status)}</td>
                              <td>{formatCurrency(o.total)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center">
                              No recent orders
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
    </div>
  )
}
