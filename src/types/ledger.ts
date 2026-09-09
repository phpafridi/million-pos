export interface Transaction {
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

export interface Ledger {
  ledger_id: number
  ledger_name: string
  mobile_number: string
  email: string | null
  address: string | null
  total_balance: number
  created_at: string
  transactions?: Transaction[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface Stats {
  totalLedgers: number
  totalDebit: number
  totalCredit: number
  totalBalance: number
}