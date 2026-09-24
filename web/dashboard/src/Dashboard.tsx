import { useState, useEffect } from 'react';
import axios from 'axios';

const TEST_MODE_INDICATOR = 'TEST MODE';

const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Merchant {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiKey {
  id: string;
  merchantId: string;
  type: 'publishable' | 'secret' | 'webhook';
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  secretHash: string;
  secretPrefix: string;
  createdAt: Date;
}

interface Payment {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  clientSecret?: string;
  bankTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantWithKeys extends Merchant {
  secret_key: string;
  publishable_key: string;
}

export default function MerchantDashboard() {
  const [merchants, setMerchants] = useState<MerchantWithKeys[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantWithKeys | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const resp = await axios.get(`${GATEWAY_URL}/api/v1/merchants`);
      setMerchants(resp.data.data || []);
    } catch (err) {
      console.error('Failed to fetch merchants', err);
    } finally {
      setLoading(false);
    }
  };

  const createMerchant = async (name: string, email: string) => {
    try {
      const resp = await axios.post(`${GATEWAY_URL}/api/v1/merchants`, { name, email });
      const newMerchant = resp.data;

      const skResp = await axios.post(
        `${GATEWAY_URL}/api/v1/api-keys`,
        { type: 'secret' },
        { headers: { Authorization: `Bearer ${newMerchant.id}` } }
      );
      const pkResp = await axios.post(
        `${GATEWAY_URL}/api/v1/api-keys`,
        { type: 'publishable' },
        { headers: { Authorization: `Bearer ${newMerchant.id}` } }
      );

      const merchantWithKeys: MerchantWithKeys = {
        ...newMerchant,
        secret_key: skResp.data.key,
        publishable_key: pkResp.data.key,
      };
      setMerchants([...merchants, merchantWithKeys]);
      setSelectedMerchant(merchantWithKeys);
      setSecretKey(skResp.data.key);
      setShowApiKeyModal(true);
    } catch (err: any) {
      alert('Error creating merchant: ' + err.response?.data?.message);
    }
    setShowCreateModal(false);
  };

  const fetchKeys = async (merchant: MerchantWithKeys) => {
    try {
      const resp = await axios.get(`${GATEWAY_URL}/api/v1/api-keys`, {
        headers: { Authorization: `Bearer ${merchant.secret_key}` },
      });
      setApiKeys(resp.data.data || []);
    } catch (err) {
      console.error('Failed to fetch keys', err);
    }
  };

  const fetchPayments = async (merchant: MerchantWithKeys) => {
    try {
      const resp = await axios.get(`${GATEWAY_URL}/api/v1/payments`, {
        headers: { Authorization: `Bearer ${merchant.secret_key}` },
      });
      setPayments(resp.data.data || []);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    }
  };

  const fetchWebhooks = async (merchant: MerchantWithKeys) => {
    try {
      const resp = await axios.get(`${GATEWAY_URL}/api/v1/webhooks`, {
        headers: { Authorization: `Bearer ${merchant.secret_key}` },
      });
      setWebhooks(resp.data.data || []);
    } catch (err) {
      console.error('Failed to fetch webhooks', err);
    }
  };

  const selectMerchant = (merchant: MerchantWithKeys) => {
    setSelectedMerchant(merchant);
    fetchKeys(merchant);
    fetchPayments(merchant);
    fetchWebhooks(merchant);
  };

  const addWebhook = async (url: string) => {
    if (!selectedMerchant) return;
    try {
      const resp = await axios.post(
        `${GATEWAY_URL}/api/v1/webhooks`,
        { url },
        { headers: { Authorization: `Bearer ${selectedMerchant.secret_key}` } }
      );
      setWebhookSecret(resp.data.secret);
      setShowWebhookModal(true);
      fetchWebhooks(selectedMerchant);
    } catch (err: any) {
      alert('Error adding webhook: ' + err.response?.data?.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              DEV Bank Merchant Dashboard
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {TEST_MODE_INDICATOR}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MerchantCreationModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={createMerchant}
        />
        {secretKey && (
          <ApiKeyModal
            open={showApiKeyModal}
            onClose={() => { setShowApiKeyModal(false); setSecretKey(null); }}
            apiKey={secretKey}
            type="secret"
          />
        )}
        {webhookSecret && (
          <ApiKeyModal
            open={showWebhookModal}
            onClose={() => { setShowWebhookModal(false); setWebhookSecret(null); }}
            apiKey={webhookSecret}
            type="webhook"
          />
        )}

        {!selectedMerchant ? (
          <MerchantList
            merchants={merchants}
            loading={loading}
            onCreateClick={() => setShowCreateModal(true)}
            onSelect={selectMerchant}
          />
        ) : (
          <MerchantDetail
            merchant={selectedMerchant}
            apiKeys={apiKeys}
            payments={payments}
            webhooks={webhooks}
            onAddWebhook={addWebhook}
            onBack={() => setSelectedMerchant(null)}
            onCreateKey={async (type: 'publishable' | 'secret') => {
              try {
                const resp = await axios.post(
                  `${GATEWAY_URL}/api/v1/api-keys`,
                  { type },
                  { headers: { Authorization: `Bearer ${selectedMerchant.secret_key}` } }
                );
                setSecretKey(resp.data.key);
                setShowApiKeyModal(true);
                fetchKeys(selectedMerchant);
              } catch (err: any) {
                alert('Error creating key: ' + err.response?.data?.message);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

interface MerchantCreationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, email: string) => void;
}

function MerchantCreationModal({ open, onClose, onCreate }: MerchantCreationModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Merchant</h2>
        <input className="w-full border p-3 rounded mb-3" placeholder="Business Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full border p-3 rounded mb-3" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="flex gap-3 justify-end">
          <button className="px-4 py-2 text-gray-600" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => { onCreate(name, email); setName(''); setEmail(''); }}>Create</button>
        </div>
      </div>
    </div>
  );
}

interface MerchantListProps {
  merchants: MerchantWithKeys[];
  loading: boolean;
  onCreateClick: () => void;
  onSelect: (merchant: MerchantWithKeys) => void;
}

function MerchantList({ merchants, loading, onCreateClick, onSelect }: MerchantListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Merchants</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={onCreateClick}>Create Merchant</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {merchants.map(m => (
            <div key={m.id} className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50" onClick={() => onSelect(m)}>
              <h3 className="font-semibold">{m.name}</h3>
              <p className="text-gray-500">{m.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MerchantDetailProps {
  merchant: MerchantWithKeys;
  apiKeys: ApiKey[];
  payments: Payment[];
  webhooks: WebhookEndpoint[];
  onAddWebhook: (url: string) => void;
  onBack: () => void;
  onCreateKey: (type: 'publishable' | 'secret') => void;
}

function MerchantDetail({ merchant, apiKeys, payments, webhooks, onAddWebhook, onBack, onCreateKey }: MerchantDetailProps) {
  return (
    <div className="space-y-6">
      <button className="text-blue-600 hover:text-blue-900" onClick={onBack}>&larr; Back to Merchants</button>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold">{merchant.name}</h2>
        <p className="text-gray-500">{merchant.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ApiKeySection apiKeys={apiKeys} onCreateKey={onCreateKey} />
        <WebhookSection webhooks={webhooks} onAddWebhook={onAddWebhook} />
      </div>

      <PaymentSection payments={payments} />
    </div>
  );
}

function ApiKeySection({ apiKeys, onCreateKey }: { apiKeys: ApiKey[]; onCreateKey: (type: 'publishable' | 'secret') => void }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <div className="flex gap-2">
          <button className="text-sm bg-gray-100 px-3 py-1 rounded" onClick={() => onCreateKey('publishable')}>Generate Publishable</button>
          <button className="text-sm bg-gray-100 px-3 py-1 rounded" onClick={() => onCreateKey('secret')}>Generate Secret</button>
        </div>
      </div>
      {apiKeys.length === 0 ? <p className="text-gray-500">No API keys yet</p> : (
        <div className="space-y-3">
          {apiKeys.map(key => (
            <div key={key.id} className="border rounded p-3 text-sm font-mono">
              {key.keyPrefix}••••••••••••••••••••<span className="text-gray-400">[{key.type}]</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhookSection({ webhooks, onAddWebhook }: { webhooks: WebhookEndpoint[]; onAddWebhook: (url: string) => void }) {
  const [url, setUrl] = useState('');
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Webhook Endpoints</h2>
      {webhooks.length === 0 ? <p className="text-gray-500">No webhook endpoints</p> : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="border rounded p-3 text-sm">
              <p className="font-mono break-all">{wh.url}</p>
              <span className="text-xs text-gray-500">Secret: {wh.secretPrefix}••••</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <input className="w-full border p-3 rounded mb-2" placeholder="Webhook URL" value={url} onChange={e => setUrl(e.target.value)} />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" onClick={() => { onAddWebhook(url); setUrl(''); }}>Add Webhook</button>
      </div>
    </div>
  );
}

function PaymentSection({ payments }: { payments: Payment[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Payments</h2>
      {payments.length === 0 ? <p className="text-gray-500">No payments yet</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">ID</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="py-3 font-mono">{p.id.substring(0, 20)}...</td>
                  <td>${(p.amount / 100).toFixed(2)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${p.status === 'succeeded' ? 'bg-green-100 text-green-800' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : p.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ApiKeyModal({ open, onClose, apiKey, type }: { open: boolean; onClose: () => void; apiKey: string; type: 'secret' | 'webhook' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">New {type === 'secret' ? 'Secret API Key' : 'Webhook Secret'}</h2>
        <p className="text-sm text-gray-600 mb-4">Store this key securely. It will not be shown again.</p>
        <div className="bg-gray-100 rounded p-3 font-mono text-sm break-all mb-4">{apiKey}</div>
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
