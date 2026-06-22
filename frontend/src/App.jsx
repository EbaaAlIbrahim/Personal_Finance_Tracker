import React, { useState, useEffect } from 'react';
// All icons are imported statically at the very top level of the file architecture
import { 
  LayoutDashboard, Wallet, CreditCard, RefreshCw, 
  BarChart3, PieChart as PieIcon, LogOut, ShieldCheck, 
  Landmark, AlertTriangle, Mail, Lock, Shield, ArrowRight, UserPlus, LogIn as LogInIcon 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePlaidLink } from 'react-plaid-link';
import { authAPI, transactionAPI } from './api';
import './App.css';

const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#a855f7', '#f59e0b', '#ec4899', '#64748b'];

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({ total_spend_volume: 0, transaction_count: 0 });
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Plaid Integration Token Management States
  const [linkToken, setLinkToken] = useState(null);
  const [isLinkingBank, setIsLinkingBank] = useState(false);

  const [hasCustomCard, setHasCustomCard] = useState(false);
  const [customCardBrand, setCustomCardBrand] = useState('Visa Platinum');

  const BUDGET_LIMIT_THRESHOLD = 2500.00;
  const isBudgetBreached = summary.total_spend_volume > BUDGET_LIMIT_THRESHOLD;
  const isBudgetApproaching = summary.total_spend_volume > (BUDGET_LIMIT_THRESHOLD * 0.8) && !isBudgetBreached;

  const STARTING_ASSET_CAPITAL = 10000.00;
  const currentCalculatedAsset = STARTING_ASSET_CAPITAL - summary.total_spend_volume;
  const creditLimitConstant = 5000.00;
  const creditUtilizationPercent = Math.min(((summary.total_spend_volume / creditLimitConstant) * 100), 100).toFixed(1);

  const fetchFinancialTelemetry = async () => {
    try {
      const userRes = await authAPI.getProfile();
      setProfile(userRes.data);

      const txRes = await transactionAPI.getTransactions();
      if (txRes.data.count === 0) {
        await transactionAPI.seedTransactions();
        const reFetch = await transactionAPI.getTransactions();
        setTransactions(reFetch.data.data);
      } else {
        setTransactions(txRes.data.data);
      }

      const analyticsRes = await transactionAPI.getAnalytics();
      setChartData(analyticsRes.data.chart_data);
      setSummary(analyticsRes.data.summary);
    } catch (err) {
      if (err.response?.status === 401) handleLogOut();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      fetchFinancialTelemetry().then(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

    // Plaid Link initialization handler
  const triggerPlaidSetup = async () => {
    try {
      setIsLinkingBank(true);
      const response = await bankAPI.createLinkToken();
      // Handle response directly based on your FastAPI structure
      const fetchedToken = response.data.link_token;
      setLinkToken(fetchedToken);
    } catch (err) {
      console.error("Failed to fetch secure bank handshake initialization token:", err);
      setIsLinkingBank(false);
    }
  };

  // Instantiating the Plaid React Client SDK configuration hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      try {
        await bankAPI.exchangePublicToken(public_token);
        setLinkToken(null);
        setIsLinkingBank(false);
        await fetchFinancialTelemetry(); // Instantly pull live asset balance states
      } catch (err) {
        console.error("Token handshake exchange protocol failure:", err);
        setIsLinkingBank(false);
      }
    },
    onExit: (err, metadata) => {
      setLinkToken(null);
      setIsLinkingBank(false);
    }
  });

  // Safe engine watch rule to open overlay whenever a token drops from your server
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput || !passwordInput) return setAuthError('Please fill out all fields.');

    try {
      if (isSignUpMode) {
        await authAPI.register(emailInput, passwordInput);
        setIsSignUpMode(false);
        setAuthError('Account created! Please log in.');
        setPasswordInput('');
      } else {
        const loginRes = await authAPI.login(emailInput, passwordInput);
        localStorage.setItem('access_token', loginRes.data.access_token);
        setIsAuthenticated(true);
        setIsLoading(true);
      }
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Authentication failed.');
    }
  };

  const handleLogOut = () => {
    authAPI.logout();
  };

  const refreshMockData = async () => {
    setIsLoading(true);
    await transactionAPI.seedTransactions();
    await fetchFinancialTelemetry();
    setIsLoading(false);
  };

  const provisionNewCard = () => {
    setCustomCardBrand(Math.random() > 0.5 ? 'Amex Delta Reserve' : 'Visa Infinite Black');
    setHasCustomCard(true);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#38bdf8', fontSize: '1.25rem' }}>
        Loading Encrypted Financial Instance...
      </div>
    );
  }

  // --- RENDERING CHECKPOINT 1: PREMIUM AUTHENTICATION TERMINAL ---
  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-brand-logo">
            <Shield size={26} color="var(--color-primary)" />
            <span>FinanceTracker</span>
          </div>
          <div className="auth-subtitle">
            {isSignUpMode ? 'Provision new secure transaction user profile node' : 'Establish authenticated gateway link session'}
          </div>
          
          {authError && (
            <div className="auth-error-msg">
              <AlertTriangle size={16} />
              <span>{authError}</span>
            </div>
          )}
          
          <form onSubmit={handleAuthSubmit}>
            <div className="auth-form-group">
              <label className="auth-label">Secure Access Key (Email)</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input 
                  type="email" 
                  className="auth-input" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  placeholder="operator@domain.com"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Cryptographic Signature Passcode</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input 
                  type="password" 
                  className="auth-input" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button">
              {isSignUpMode ? (
                <>
                  <UserPlus size={16} />
                  <span>Initialize Profile Node</span>
                </>
              ) : (
                <>
                  <LogInIcon size={16} />
                  <span>Authenticate Handshake</span>
                </>
              )}
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          </form>
          
          <div className="auth-toggle-link" onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthError(''); }}>
            {isSignUpMode ? (
              <>Already mapped to this node? <span>Sign In</span></>
            ) : (
              <>Need a clean data isolation partition? <span>Sign Up</span></>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar-shell">
        <div>
          <div className="brand-header">💰 FinanceTracker</div>
          <nav className="nav-links">
            <div className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => setCurrentTab('overview')}><LayoutDashboard size={18} /> Overview</div>
            <div className={`nav-item ${currentTab === 'accounts' ? 'active' : ''}`} onClick={() => setCurrentTab('accounts')}><Wallet size={18} /> Accounts</div>
            <div className={`nav-item ${currentTab === 'cards' ? 'active' : ''}`} onClick={() => setCurrentTab('cards')}><CreditCard size={18} /> Cards</div>
          </nav>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', wordBreak: 'break-all' }}>User: {profile?.email}</div>
          <div className="nav-item" onClick={handleLogOut} style={{ color: 'var(--color-accent)' }}><LogOut size={16} /> Close Session</div>
        </div>
      </aside>

      <main className="main-canvas">
        {currentTab === 'overview' && (
          <>
            <header className="canvas-header">
              <div>
                <h1>Financial Overview</h1>
                <p style={{ color: 'var(--text-muted)' }}>Secure telemetry node aggregate dashboard.</p>
              </div>
              <button onClick={refreshMockData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-line)', borderRadius: '6px', cursor: 'pointer' }}>
                <RefreshCw size={14} /> Sync Ledger
              </button>
            </header>

            {isBudgetBreached && (
              <div className="budget-alert-banner">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertTriangle size={20} />
                  CRITICAL BUDGET WARNING: Total volume spending has breached your maximum safety limit of ${BUDGET_LIMIT_THRESHOLD.toLocaleString()}!
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8, background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>WIPE & RESYNC REQUIRED</span>
              </div>
            )}

            <section className="metrics-grid">
              <div className="stat-card">
                <div className="stat-title">Available Capital Balance</div>
                <div className="stat-value" style={{ color: isBudgetBreached ? 'var(--color-accent)' : 'var(--color-success)' }}>
                  ${currentCalculatedAsset.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
              </div>
              
              <div className={`stat-card ${isBudgetBreached ? 'budget-critical' : isBudgetApproaching ? 'budget-breached' : ''}`}>
                {isBudgetBreached && <span className="warning-badge">BREACHED</span>}
                {isBudgetApproaching && <span className="warning-badge" style={{ backgroundColor: 'var(--color-custom-orange)' }}>OVER 80%</span>}
                <div className="stat-title" style={{ color: (isBudgetBreached || isBudgetApproaching) ? '#f8fafc' : 'var(--text-muted)' }}>
                  Monthly Variable Spend Volume
                </div>
                <div className="stat-value">
                  ${summary.total_spend_volume.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-title">Total Processed Items</div>
                <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{summary.transaction_count}</div>
              </div>
            </section>

            <div className="charts-split-grid">
              <div className="visualization-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><BarChart3 size={16} color="var(--color-primary)" /><h3>Volume Aggregation ($)</h3></div>
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ color: '#38bdf8' }} />
                      <Bar dataKey="amount" fill={isBudgetBreached ? 'var(--color-accent)' : '#38bdf8'} radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="visualization-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><PieIcon size={16} color="var(--color-success)" /><h3>Budget Proportions (%)</h3></div>
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="amount" nameKey="category">
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`$${value} (${props.payload.percentage}%)`, name]} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="ledger-card">
              <h3>Recent Financial Activity</h3>
              <div className="ledger-scroll">
                {transactions.map((tx) => (
                  <div key={tx.transaction_id} className="ledger-row">
                    <div><div style={{ fontWeight: 'bold' }}>{tx.merchant_name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.category}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>-${parseFloat(tx.amount).toFixed(2)}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.transaction_date}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {currentTab === 'accounts' && (
          <div className="ledger-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2>Connected Bank Accounts</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Active core financial deposits and synchronization tokens.</p>
            </div>
            <div className="account-node-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Landmark size={24} color="var(--color-primary)" />
                <div><strong>Mock Sandbox Checking Node</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MAPPED ID: checking-node-8888</div></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="account-node-balance">${currentCalculatedAsset.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>CONNECTED</span>
              </div>
            </div>
            <div className="account-node-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ShieldCheck size={24} color="var(--color-success)" />
                <div><strong>High-Yield Emergency Savings</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MAPPED ID: savings-vault-2222</div></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="account-node-balance">$15,000.00</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>VAULT SECURE</span>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'cards' && (
          <div className="ledger-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2>Liquidity Credit Cards</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Monitor active revolving credit utilization and billing nodes.</p>
            </div>
            <div className="credit-card-canvas">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="credit-card-chip"></div>
                <span style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '1.1rem', opacity: 0.8 }}>{hasCustomCard ? customCardBrand.split(' ') : 'Visa'}</span>
              </div>
              <div className="credit-card-number">•••• •••• •••• 4321</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cardholder</div><div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{profile?.email ? profile.email.split('@')[0] : 'Operator'}</div></div>
                <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expires</div><div style={{ fontSize: '0.9rem', fontWeight: '500' }}>12/30</div></div>
              </div>
            </div>
            <div className="utilization-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                <span>Credit Utilization Share</span>
                <span style={{ color: creditUtilizationPercent > 50 ? 'var(--color-accent)' : 'var(--color-primary)' }}>{creditUtilizationPercent}% Used</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${creditUtilizationPercent}%`, backgroundColor: creditUtilizationPercent > 50 ? 'var(--color-accent)' : 'var(--color-primary)' }}></div></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <span>Balance: ${summary.total_spend_volume.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                <span>Limit: ${creditLimitConstant.toLocaleString()}</span>
              </div>
            </div>
            <button onClick={provisionNewCard} style={{ marginTop: '2.5rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border-line)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {hasCustomCard ? `Upgrade Node to ${customCardBrand}` : '+ Provision Security Card'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
