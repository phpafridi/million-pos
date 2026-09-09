import AddLedger from '@/components/ledger/AddLedger'
import LedgerList from '@/components/ledger/LedgerList'
import React from 'react'

export default function Page() {
  return (
    <>
      <div className="right-side" style={{ minHeight: '945px' }}>
        {/* Page Header */}
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Ledger Management</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item">
                    <a href="/dashboard">Home</a>
                  </li>
                  <li className="breadcrumb-item active">Ledger</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <section className="content">
          <div className="container-fluid">
            {/* Add Ledger Form */}
            <div className="row">
              <div className="col-md-12">
                <AddLedger />
              </div>
            </div>

            {/* Ledger List with Stats */}
            <div className="row mt-4">
              <div className="col-md-12">
                <LedgerList />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}