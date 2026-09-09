'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

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
}

export default function LedgerTransactionsPage() {
  const router = useRouter()
  const params = useParams()
  const ledgerId = params.id as string
  
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<number | null>(null)
  const [form, setForm] = useState({
    transaction_type: 'karz_leya',
    amount: '',
    description: '',
    reference_number: '',
  })
  const [editForm, setEditForm] = useState({
    transaction_type: 'karz_leya',
    amount: '',
    description: '',
    reference_number: '',
  })
  const [addingTransaction, setAddingTransaction] = useState(false)
  const [updatingTransaction, setUpdatingTransaction] = useState(false)

  useEffect(() => {
    if (ledgerId) {
      fetchLedgerAndTransactions()
    }
  }, [ledgerId])

  const fetchLedgerAndTransactions = async () => {
    if (!ledgerId) return
    
    setLoading(true)
    
    try {
      // Fetch ledger details
      const ledgerResponse = await fetch(`/api/ledger/${ledgerId}`)
      const ledgerData = await ledgerResponse.json()
      
      if (ledgerData.success) {
        setLedger(ledgerData.data)
        
        // Fetch transactions
        const transResponse = await fetch(`/api/ledger/${ledgerId}/transaction`)
        const transData = await transResponse.json()
        
        if (transData.success && Array.isArray(transData.data)) {
          // Fix: Convert Decimal objects to numbers
          const fixedTransactions = transData.data.map((t: any) => ({
            ...t,
            amount: t.amount?.toNumber ? t.amount.toNumber() : Number(t.amount) || 0,
            previous_balance: t.previous_balance?.toNumber ? t.previous_balance.toNumber() : Number(t.previous_balance) || 0,
            new_balance: t.new_balance?.toNumber ? t.new_balance.toNumber() : Number(t.new_balance) || 0,
          }))
          setTransactions(fixedTransactions)
        } else {
          setTransactions([])
        }
      } else {
        toast.error('Ledger not found')
        router.push('/dashboard/ledger')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error loading data')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setAddingTransaction(true)
    
    try {
      const response = await fetch(`/api/ledger/${ledgerId}/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          created_by: 'Admin',
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Transaction added successfully!')
        setForm({
          transaction_type: 'karz_leya',
          amount: '',
          description: '',
          reference_number: '',
        })
        setShowAddTransaction(false)
        fetchLedgerAndTransactions() // Refresh data
      } else {
        toast.error(data.error || 'Failed to add transaction')
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast.error('Error adding transaction')
    } finally {
      setAddingTransaction(false)
    }
  }

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingTransaction || !editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setUpdatingTransaction(true)
    
    try {
      const response = await fetch(`/api/ledger/${ledgerId}/transaction/${editingTransaction.transaction_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          amount: parseFloat(editForm.amount),
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Transaction updated successfully!')
        setShowEditTransaction(false)
        setEditingTransaction(null)
        fetchLedgerAndTransactions() // Refresh data
      } else {
        toast.error(data.error || 'Failed to update transaction')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast.error('Error updating transaction')
    } finally {
      setUpdatingTransaction(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }
    
    setDeletingTransaction(transactionId)
    
    try {
      const response = await fetch(`/api/ledger/${ledgerId}/transaction/${transactionId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Transaction deleted successfully!')
        fetchLedgerAndTransactions() // Refresh data
      } else {
        toast.error(data.error || 'Failed to delete transaction')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('Error deleting transaction')
    } finally {
      setDeletingTransaction(null)
    }
  }

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      transaction_type: transaction.transaction_type,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      reference_number: transaction.reference_number || '',
    })
    setShowEditTransaction(true)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    return type === 'karz_leya' ? 'Karz Leya' : 'Karz Deya'
  }

  const getTypeColor = (type: string) => {
    return type === 'karz_leya' ? 'danger' : 'success'
  }

  // Helper function to format amounts safely
  const formatAmount = (value: any): string => {
    if (value === null || value === undefined) return '0.00'
    
    // If it's a Prisma Decimal object
    if (typeof value === 'object' && value.toNumber) {
      return value.toNumber().toFixed(2)
    }
    
    // If it's already a number
    if (typeof value === 'number') {
      return value.toFixed(2)
    }
    
    // If it's a string
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? '0.00' : num.toFixed(2)
    }
    
    return '0.00'
  }

  if (loading) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Loading...</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!ledger) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="content">
          <div className="container-fluid">
            <div className="alert alert-danger">
              Ledger not found. <Link href="/dashboard/ledger">Go back to ledger list</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      {/* Page Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                {ledger.ledger_name} - Transactions
                <br />
                <small>Mobile: {ledger.mobile_number}</small>
              </h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/ledger">Ledger</Link>
                </li>
                <li className="breadcrumb-item active">Transactions</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="content">
        <div className="container-fluid">
          {/* Current Balance Card */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="info-box">
                <span className="info-box-icon bg-info">
                  <i className="fa fa-balance-scale"></i>
                </span>
                <div className="info-box-content">
                  <span className="info-box-text">Current Balance</span>
                  <span className={`info-box-number ${ledger.total_balance > 0 ? 'text-danger' : 'text-success'}`}>
                    {Math.abs(ledger.total_balance).toFixed(2)}
                    <small> {ledger.total_balance > 0 ? '(Karz Leya)' : '(Karz Deya)'}</small>
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-right">
              <Link href="/dashboard/ledger" className="btn btn-default">
                <i className="fa fa-arrow-left"></i> Back to Ledger List
              </Link>
            </div>
          </div>

          {/* Add Transaction Button */}
          <div className="row mb-3">
            <div className="col-md-12">
              <button
                onClick={() => setShowAddTransaction(!showAddTransaction)}
                className="btn btn-primary"
              >
                <i className="fa fa-plus"></i> Add Transaction
              </button>
            </div>
          </div>

          {/* Add Transaction Form */}
          {showAddTransaction && (
            <div className="row mb-4">
              <div className="col-md-12">
                <div className="box box-primary">
                  <div className="box-header">
                    <h4 className="box-title">Add New Transaction</h4>
                  </div>
                  <div className="box-body">
                    <form onSubmit={handleAddTransaction}>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Transaction Type *</label>
                            <select
                              name="transaction_type"
                              value={form.transaction_type}
                              onChange={handleInputChange}
                              className="form-control"
                              required
                            >
                              <option value="karz_leya">Karz Leya (Debit)</option>
                              <option value="karz_deya">Karz Deya (Credit)</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Amount *</label>
                            <input
                              type="number"
                              name="amount"
                              value={form.amount}
                              onChange={handleInputChange}
                              className="form-control"
                              placeholder="Enter amount"
                              step="0.01"
                              min="0.01"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Reference Number</label>
                            <input
                              type="text"
                              name="reference_number"
                              value={form.reference_number}
                              onChange={handleInputChange}
                              className="form-control"
                              placeholder="Reference number"
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Description</label>
                            <textarea
                              name="description"
                              value={form.description}
                              onChange={handleInputChange}
                              className="form-control"
                              placeholder="Transaction description"
                              rows={2}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <button
                          type="submit"
                          className="btn btn-success"
                          disabled={addingTransaction}
                        >
                          {addingTransaction ? 'Adding...' : 'Add Transaction'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-default ml-2"
                          onClick={() => setShowAddTransaction(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Transaction Form */}
          {showEditTransaction && editingTransaction && (
            <div className="row mb-4">
              <div className="col-md-12">
                <div className="box box-warning">
                  <div className="box-header">
                    <h4 className="box-title">Edit Transaction #{editingTransaction.transaction_id}</h4>
                  </div>
                  <div className="box-body">
                    <form onSubmit={handleEditTransaction}>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Transaction Type *</label>
                            <select
                              name="transaction_type"
                              value={editForm.transaction_type}
                              onChange={handleEditInputChange}
                              className="form-control"
                              required
                            >
                              <option value="karz_leya">Karz Leya (Debit)</option>
                              <option value="karz_deya">Karz Deya (Credit)</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Amount *</label>
                            <input
                              type="number"
                              name="amount"
                              value={editForm.amount}
                              onChange={handleEditInputChange}
                              className="form-control"
                              placeholder="Enter amount"
                              step="0.01"
                              min="0.01"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Reference Number</label>
                            <input
                              type="text"
                              name="reference_number"
                              value={editForm.reference_number}
                              onChange={handleEditInputChange}
                              className="form-control"
                              placeholder="Reference number"
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Description</label>
                            <textarea
                              name="description"
                              value={editForm.description}
                              onChange={handleEditInputChange}
                              className="form-control"
                              placeholder="Transaction description"
                              rows={2}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <button
                          type="submit"
                          className="btn btn-warning"
                          disabled={updatingTransaction}
                        >
                          {updatingTransaction ? 'Updating...' : 'Update Transaction'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-default ml-2"
                          onClick={() => {
                            setShowEditTransaction(false)
                            setEditingTransaction(null)
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions List - FIXED with Action Buttons */}
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header with-border">
                  <h3 className="box-title">Transaction History</h3>
                </div>
                <div className="box-body">
                  {!transactions || transactions.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">
                        {!transactions ? 'Loading transactions...' : 'No transactions found'}
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Previous Balance</th>
                            <th>New Balance</th>
                            <th>Reference</th>
                            <th>Description</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction, index) => (
                            <tr key={transaction.transaction_id || index}>
                              <td>{index + 1}</td>
                              <td>{formatDate(transaction.transaction_date)}</td>
                              <td>
                                <span className={`badge bg-${getTypeColor(transaction.transaction_type)}`}>
                                  {getTransactionTypeLabel(transaction.transaction_type)}
                                </span>
                              </td>
                              <td className={transaction.transaction_type === 'karz_leya' ? 'text-danger' : 'text-success'}>
                                {formatAmount(transaction.amount)}
                              </td>
                              <td>{formatAmount(transaction.previous_balance)}</td>
                              <td>{formatAmount(transaction.new_balance)}</td>
                              <td>{transaction.reference_number || '-'}</td>
                              <td>{transaction.description || '-'}</td>
                              <td>
                                <div className="btn-group">
                                  <button
                                    onClick={() => handleEditClick(transaction)}
                                    className="btn btn-sm btn-warning"
                                    title="Edit"
                                  >
                                    <i className="fa fa-edit"></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction.transaction_id)}
                                    className="btn btn-sm btn-danger"
                                    disabled={deletingTransaction === transaction.transaction_id}
                                    title="Delete"
                                  >
                                    {deletingTransaction === transaction.transaction_id ? (
                                      <i className="fa fa-spinner fa-spin"></i>
                                    ) : (
                                      <i className="fa fa-trash"></i>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}