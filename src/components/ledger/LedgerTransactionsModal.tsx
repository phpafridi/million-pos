'use client'
import React, { useState, useEffect } from 'react'
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
  total_balance: number
  email?: string | null
  address?: string | null
  created_at?: string
  transactions?: Transaction[]
}

interface LedgerTransactionsModalProps {
  ledger: Ledger | null
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: () => void
}

export default function LedgerTransactionsModal({
  ledger,
  isOpen,
  onClose,
  onTransactionAdded,
}: LedgerTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [form, setForm] = useState({
    transaction_type: 'karz_leya',
    amount: '',
    description: '',
    reference_number: '',
  })
  const [addingTransaction, setAddingTransaction] = useState(false)

  useEffect(() => {
    if (isOpen && ledger) {
      // Use existing transactions if available
      if (ledger.transactions && Array.isArray(ledger.transactions)) {
        setTransactions(ledger.transactions)
      } else {
        // Otherwise fetch them
        fetchTransactions()
      }
    }
  }, [isOpen, ledger])

  const fetchTransactions = () => {
    if (!ledger) return
    
    setLoading(true)
    
    fetch(`/api/ledger/${ledger.ledger_id}/transaction`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Ensure data.data is an array
          const transactionsData = Array.isArray(data.data) ? data.data : []
          setTransactions(transactionsData)
        } else {
          toast.error(data.error || 'Failed to fetch transactions')
          setTransactions([])
        }
      })
      .catch(error => {
        console.error(error)
        toast.error('Error fetching transactions')
        setTransactions([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ledger) return
    
    setAddingTransaction(true)
    
    fetch(`/api/ledger/${ledger.ledger_id}/transaction`, {
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
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast.success('Transaction added successfully!')
          setForm({
            transaction_type: 'karz_leya',
            amount: '',
            description: '',
            reference_number: '',
          })
          setShowAddTransaction(false)
          fetchTransactions() // Refresh transactions
          onTransactionAdded()
        } else {
          toast.error(data.error || 'Failed to add transaction')
        }
      })
      .catch(error => {
        console.error(error)
        toast.error('Error adding transaction')
      })
      .finally(() => {
        setAddingTransaction(false)
      })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toLocaleString('en-US', {
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

  if (!isOpen || !ledger) return null

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg" style={{ maxWidth: '90%' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">
              {ledger.ledger_name} - Transactions
              <br />
              <small>Mobile: {ledger.mobile_number}</small>
            </h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>

          <div className="modal-body">
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

            {/* Transactions List */}
            <div className="row">
              <div className="col-md-12">
                <h4>Transaction History</h4>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No transactions found</p>
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
                              {transaction.amount.toFixed(2)}
                            </td>
                            <td>{transaction.previous_balance.toFixed(2)}</td>
                            <td>{transaction.new_balance.toFixed(2)}</td>
                            <td>{transaction.reference_number || '-'}</td>
                            <td>{transaction.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}