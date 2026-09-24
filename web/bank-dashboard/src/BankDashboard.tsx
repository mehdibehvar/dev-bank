import React, { useEffect, useState } from 'react';
import { TEST_MODE_INDICATOR } from '@dev-bank/shared/types';

const BANK_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BANK_ADMIN_KEY = import.meta.env.VITE_BANK_ADMIN_KEY || 'sk_bank_admin_test_1234567890';

interface BankTransaction {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface BalanceResponse {
  balance: number;
  currency: string;
}

function authHeaders() {
  return { 'X-Bank-Admin-Key': BANK_ADMIN_KEY };
}

export default function BankDashboard() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
    const interval = setInterval(() => {
      fetchTransactions();
      fetchBalance();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async () => {
    try {
      const resp = await fetch(`${BANK_API_URL}/api/v1/transactions`, {
        headers: authHeaders(),
      });
      const data = await resp.json();
      setTransactions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const resp = await fetch(`${BANK_API_URL}/api/v1/balance`, {
        headers: authHeaders(),
      });
      const data = await resp.json();
      setBalance(data);
    } catch (err) {
      console.error('Failed to fetch balance', err);
    }
  };

  const approve = async (transactionId: string) => {
    setActionLoading(transactionId);
    try {
      await fetch(`${BANK_API_URL}/api/v1/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
    } finally {
      setActionLoading(null);
      fetchTransactions();
      fetchBalance();
    }
  };

  const reject = async (transactionId: string) => {
    setActionLoading(transactionId);
    try {
      await fetch(`${BANK_API_URL}/api/v1/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
    } finally {
      setActionLoading(null);
      fetchTransactions();
      fetchBalance();
    }
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              DEV Bank - Local Bank Dashboard
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {TEST_MODE_INDICATOR}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-sm text-gray-500">Bank Balance</div>
            <div className="text-3xl font-bold mt-2">
              {balance ? `$${(balance.balance / 100).toFixed(2)}` : 'Loading...'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{completedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{failedCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Transactions</h2>
          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-3 font-mono text-xs">{tx.id.substring(0, 12)}...</td>
                      <td className="py-3 font-mono text-xs">{tx.reference}</td>
                      <td className="py-3 capitalize">{tx.type}</td>
                      <td>${(tx.amount / 100).toFixed(2)}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-3 text-center">
                        {tx.status === 'pending' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => approve(tx.id)}
                              disabled={actionLoading === tx.id}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                            >
                              {actionLoading === tx.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => reject(tx.id)}
                              disabled={actionLoading === tx.id}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Demo Instructions</h2>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>Merchants create payments via the Gateway API</li>
            <li>New transactions appear here as pending</li>
            <li>Approve or reject transactions to settle them</li>
            <li>Approved transactions increase the bank balance</li>
            <li>Payment status updates and webhooks are delivered</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
