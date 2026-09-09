'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/clientPermissions'
import { toast } from 'sonner'

interface Transaction {
  transaction_id: number
  transaction_type: string
  amount: number
  description: string | null
  previous_balance: number
  new_balance: number
  reference_number: string | null
  transaction_date: string
  created_by: string
}

interface Ledger {
  ledger_id: number
  ledger_name: string
  mobile_number: string
  email: string | null
  address: string | null
  total_balance: number
  created_at: string
  transactions: Transaction[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface Stats {
  totalLedgers: number
  totalDebit: number
  totalCredit: number
  totalBalance: number
}

export default function LedgerList() {
  const router = useRouter()
  const { data: session } = useSession()
  const canDeleteLedger = hasPermission(session, 'action:delete-ledger')
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [stats, setStats] = useState<Stats>({
    totalLedgers: 0,
    totalDebit: 0,
    totalCredit: 0,
    totalBalance: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [ledgerToDelete, setLedgerToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchLedgers = async (page: number = 1, searchTerm: string = '') => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/ledger?page=${page}&limit=${pagination.limit}&search=${searchTerm}`
      )
      const data = await response.json()

      if (data.success) {
        setLedgers(data.data)
        setPagination(data.pagination)
      } else {
        toast.error('Failed to fetch ledgers')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error fetching ledgers')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ledger/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchLedgers(pagination.page, search)
    fetchStats()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLedgers(1, search)
  }

  const handlePageChange = (newPage: number) => {
    fetchLedgers(newPage, search)
  }

  const handleViewTransactions = (ledgerId: number) => {
    router.push(`/dashboard/ledger/${ledgerId}/transactions`)
  }

  const handleDeleteClick = (ledgerId: number) => {
    setLedgerToDelete(ledgerId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!ledgerToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/ledger/${ledgerToDelete}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Ledger deleted successfully')
        fetchLedgers(pagination.page, search)
        fetchStats() // Refresh stats after deletion
      } else {
        toast.error(data.error || 'Failed to delete ledger')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error deleting ledger')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setLedgerToDelete(null)
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-danger' // Red for positive (owed)
    if (balance < 0) return 'text-success' // Green for negative (credit)
    return ''
  }

  const formatBalance = (balance: number) => {
    return Math.abs(balance).toFixed(2)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Confirm Delete</h4>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this ledger? All transactions will also be deleted.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-default"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="row mb-3">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats.totalLedgers}</h3>
              <p>Total Ledgers</p>
            </div>
            <div className="icon">
              <i className="ion ion-person-stalker"></i>
            </div>
            <div className="small-box-footer">&nbsp;</div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{formatCurrency(stats.totalCredit)}</h3>
              <p>Total Credit (Karz Deya)</p>
            </div>
            <div className="icon">
              <i className="ion ion-cash"></i>
            </div>
            <div className="small-box-footer">&nbsp;</div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{formatCurrency(stats.totalDebit)}</h3>
              <p>Total Debit (Karz Leya)</p>
            </div>
            <div className="icon">
              <i className="ion ion-card"></i>
            </div>
            <div className="small-box-footer">&nbsp;</div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3 className={stats.totalBalance > 0 ? 'text-danger' : stats.totalBalance < 0 ? 'text-success' : ''}>
                {formatCurrency(Math.abs(stats.totalBalance))}
              </h3>
              <p>
                Net Balance
                {stats.totalBalance > 0 && ' (Karz Leya)'}
                {stats.totalBalance < 0 && ' (Karz Deya)'}
              </p>
            </div>
            <div className="icon">
              <i className="ion ion-pie-graph"></i>
            </div>
            <div className="small-box-footer">&nbsp;</div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="row">
          <div className="col-md-12">
            <div className="box box-primary">
              <div className="box-header box-header-background with-border">
                <h3 className="box-title">Ledger List</h3>
                <div className="box-tools pull-right">
                  <form onSubmit={handleSearch} className="form-inline">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, mobile, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <div className="input-group-btn">
                        <button type="submit" className="btn btn-default">
                          <i className="fa fa-search"></i>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              <div className="box-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : ledgers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No ledgers found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Mobile Number</th>
                          <th>Email</th>
                          <th>Current Balance</th>
                          <th>Created Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgers.map((ledger, index) => (
                          <tr key={ledger.ledger_id}>
                            <td>{index + 1}</td>
                            <td>{ledger.ledger_name}</td>
                            <td>{ledger.mobile_number}</td>
                            <td>{ledger.email || '-'}</td>
                            <td className={getBalanceColor(ledger.total_balance)}>
                              {ledger.total_balance > 0 ? (
                                <span>
                                  {formatBalance(ledger.total_balance)} (Karz Leya)
                                </span>
                              ) : ledger.total_balance < 0 ? (
                                <span>
                                  {formatBalance(ledger.total_balance)} (Karz Deya)
                                </span>
                              ) : (
                                '0.00'
                              )}
                            </td>
                            <td>
                              {new Date(ledger.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <button
                                onClick={() => handleViewTransactions(ledger.ledger_id)}
                                className="btn btn-info btn-sm mr-2"
                                title="View Transactions"
                              >
                                <i className="fa fa-eye"></i>
                              </button>
                              {canDeleteLedger && (
                                <button
                                  onClick={() => handleDeleteClick(ledger.ledger_id)}
                                  className="btn btn-danger btn-sm"
                                  title="Delete Ledger"
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="text-center mt-3">
                    <nav>
                      <ul className="pagination">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {[...Array(pagination.pages)].map((_, i) => (
                          <li key={i} className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(i + 1)}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}