import React, { useState, useEffect } from 'react';
// All icons are imported statically at the very top level of the file architecture
import {
  LayoutDashboard, Wallet, CreditCard, RefreshCw, ShoppingBag,
  BarChart3, PieChart as PieIcon, LogOut, ShieldCheck,
  Landmark, AlertTriangle, Mail, Lock, Shield, ArrowRight, UserPlus, LogIn as LogInIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePlaidLink } from 'react-plaid-link';
import { authAPI, transactionAPI, bankAPI } from './api';
import './App.css';

const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#a855f7', '#f59e0b', '#ec4899', '#64748b'];

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('2500');

  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({ total_spend_volume: 0, transaction_count: 0 });
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [fraudScanAmount, setFraudScanAmount] = useState('');
  const [fraudScanMerchant, setFraudScanMerchant] = useState('');
  const [fraudScanResult, setFraudScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const [useLiveGPS, setUseLiveGPS] = useState(true);
  const [deviceLatitude, setDeviceLatitude] = useState('');
  const [deviceLongitude, setDeviceLongitude] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [liveMapUrl, setLiveMapUrl] = useState('');

  const [storeMerchant, setStoreMerchant] = useState('Whole Foods');
  const [storeCategory, setStoreCategory] = useState('Groceries');
  const [storeAmount, setStoreAmount] = useState('45.00');
  const [purchaseStatus, setPurchaseStatus] = useState('');

  const [hasActiveStoreItem, setHasActiveStoreItem] = useState(false);

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

  useEffect(() => {
    if (currentTab === 'security' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeviceLatitude(position.coords.latitude.toFixed(4));
          setDeviceLongitude(position.coords.longitude.toFixed(4));

          const initialMap = `https://google.com/maps?q=${position.coords.latitude},${position.coords.longitude}&z=8&output=embed`;
          setLiveMapUrl(initialMap);
          setIsLocating(false);
        },
        (error) => {
          console.error("Browser GPS hardware acquisition refused or timed out:", error);

          setDeviceLatitude("33.5138");
          setDeviceLongitude("36.2765");

          const fallbackMap = `https://google.com`;
          setLiveMapUrl(fallbackMap);

          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [currentTab]);


  // Bypasses the heavy react-plaid-link library and simulates the pairing process
  const triggerPlaidSetup = async () => {
    try {
      setIsLinkingBank(true);

      // 1. Tell backend to log the simulation process initialization
      await bankAPI.createLinkToken();

      // 2. Automatically pass a fake public token straight to your exchange endpoint
      const exchangeRes = await bankAPI.exchangePublicToken("mock-public-token-12345");

      if (exchangeRes.data.status === "success") {
        // 3. Immediately auto-populate your cloud Supabase database tables with historical rows
        await transactionAPI.seedTransactions();

        // 4. Update the UI state dashboards seamlessly with the fresh chart numbers
        await fetchFinancialTelemetry();
        alert("Bank connection simulated successfully via Mock Engine Fallback!");
      }
      setIsLinkingBank(false);
    } catch (err) {
      console.error("Failed to execute secure bank handshake simulation:", err);
      setIsLinkingBank(false);
    }
  };

  // Safe engine overrides to satisfy dependencies without loading official Plaid hooks
  const ready = false;
  const open = () => { };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (isSignUpMode) {
        // Sends the complete bundle payload directly
        await authAPI.register({
          email: emailInput,
          password: passwordInput,
          first_name: firstNameInput,
          last_name: lastNameInput,
          home_region: regionInput,
          target_monthly_budget: parseFloat(budgetInput)
        });
        setIsSignUpMode(false);
        setAuthError('Profile node registered! Please log in.');
      } else {
        const loginRes = await authAPI.login(emailInput, passwordInput);
        localStorage.setItem('access_token', loginRes.data.access_token);
        setIsAuthenticated(true);
        setIsLoading(true);
      }
    } catch (err) {
      // 🌟 FIXED: Safe validation parsing extracts strings out of objects to prevent crashes
      if (err.response?.data?.detail && typeof err.response.data.detail === 'object') {
        setAuthError("Validation error: Missing or invalid registration properties.");
      } else {
        setAuthError(err.response?.data?.detail || 'Authentication handshake failed.');
      }
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
            {isSignUpMode && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="auth-form-group">
                    <label className="auth-label">First Name</label>
                    <input type="text" className="auth-input" value={firstNameInput} onChange={(e) => setFirstNameInput(e.target.value)} placeholder="John" required />
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-label">Last Name</label>
                    <input type="text" className="auth-input" value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value)} placeholder="Doe" required />
                  </div>
                </div>

                <div className="auth-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="auth-label">Home State/Country Baseline</label>
                  <input type="text" className="auth-input" value={regionInput} onChange={(e) => setRegionInput(e.target.value)} placeholder="e.g. NY / France" required />
                </div>

                <div className="auth-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="auth-label">Target Safety Monthly Budget ($)</label>
                  <input type="number" className="auth-input" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} required />
                </div>
              </>
            )}
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
          <div className="brand-logo-shell" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
            <Landmark size={24} color="var(--color-primary)" style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.3))' }} />
            <h1 className="brand-title" style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#fff', margin: 0 }}>
              Finance<span style={{ color: 'var(--color-primary)' }}>Tracker</span>
            </h1>
          </div>
          <nav className="nav-links">
            <div className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => setCurrentTab('overview')}><LayoutDashboard size={18} /> Overview</div>
            <div className={`nav-item ${currentTab === 'accounts' ? 'active' : ''}`} onClick={() => setCurrentTab('accounts')}><Wallet size={18} /> Accounts</div>
            <div className={`nav-item ${currentTab === 'cards' ? 'active' : ''}`} onClick={() => setCurrentTab('cards')}><CreditCard size={18} /> Cards</div>
            <div className={`nav-item ${currentTab === 'storefront' ? 'active' : ''}`} onClick={() => setCurrentTab('storefront')}><ShoppingBag size={18} /> Marketplace</div>
            <div
              className={`nav-item ${currentTab === 'security' ? 'active' : ''}`}
              onClick={() => {
                if (hasActiveStoreItem) {
                  setCurrentTab('security');
                } else {
                  alert(" Access Denied: This terminal is locked. You must choose an item from the Marketplace tab first to generate a transaction vector.");
                }
              }}
              style={{
                opacity: hasActiveStoreItem ? 1 : 0.25,
                cursor: hasActiveStoreItem ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
            >
              <ShieldCheck size={18} color={hasActiveStoreItem ? 'var(--color-primary)' : 'var(--text-muted)'} />
              <span>AI Security Node</span>
              {!hasActiveStoreItem && <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </div>
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
                  ${currentCalculatedAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className={`stat-card ${isBudgetBreached ? 'budget-critical' : isBudgetApproaching ? 'budget-breached' : ''}`}>
                {isBudgetBreached && <span className="warning-badge">BREACHED</span>}
                {isBudgetApproaching && <span className="warning-badge" style={{ backgroundColor: 'var(--color-custom-orange)' }}>OVER 80%</span>}
                <div className="stat-title" style={{ color: (isBudgetBreached || isBudgetApproaching) ? '#f8fafc' : 'var(--text-muted)' }}>
                  Monthly Variable Spend Volume
                </div>
                <div className="stat-value">
                  ${summary.total_spend_volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <div className="account-node-balance">${currentCalculatedAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
                <span>Balance: ${summary.total_spend_volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span>Limit: ${creditLimitConstant.toLocaleString()}</span>
              </div>
            </div>
            <button onClick={provisionNewCard} style={{ marginTop: '2.5rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border-line)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {hasCustomCard ? `Upgrade Node to ${customCardBrand}` : '+ Provision Security Card'}
            </button>
          </div>
        )}
        {/*  ADD THIS ENTIRE BLOC RIGHT BELOW THE CARDS TAB ENDING */}
        {currentTab === 'security' && !localStorage.getItem('pending_store_merchant') && (
          <div className="ledger-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <Lock size={48} color="var(--color-accent)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
            <h2 style={{ marginBottom: '0.5rem' }}>Security Terminal Locked</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.9rem', lineHeight: '1.5' }}>
              The AI Security vector evaluation node is offline. You must choose a merchant destination from the Marketplace tab first to initiate a live swipe stream.
            </p>
            <button className="auth-button" style={{ marginTop: '1.5rem', padding: '0.6rem 2rem' }} onClick={() => setCurrentTab('storefront')}>
              🛒 Open Marketplace Terminal
            </button>
          </div>
        )}

        {/* This block will now ONLY open if the authorization token is fully valid */}
        {currentTab === 'security' && localStorage.getItem('pending_store_merchant') && (
          <div className="ledger-card" style={{ padding: '2.5rem' }}>

            {/*  CORE INPUT CHANNELS TOGGLE SELECTOR BAR */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-sidebar)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-line)' }}>
              <button
                onClick={() => setUseLiveGPS(true)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: useLiveGPS ? 'var(--color-primary)' : 'transparent', color: useLiveGPS ? '#000' : 'var(--text-muted)' }}
              >
                Use Native Phone GPS
              </button>
              <button
                onClick={() => setUseLiveGPS(false)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: !useLiveGPS ? 'var(--color-primary)' : 'transparent', color: !useLiveGPS ? '#000' : 'var(--text-muted)' }}
              >
                Manual Coordinate Entry
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left' }}>

              {/* Simulation Input Block Panel */}
              <div style={{ background: 'var(--bg-sidebar)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-line)' }}>
                <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem' }}>Simulate Checkout Vector</h3>

                {/* Layer 1: Standard Verification Credentials */}
                <div style={{ borderBottom: '1px dashed #334155', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div className="auth-form-group">
                      <label className="auth-label">CVV/CVC Code</label>
                      <input type="password" max="3" className="auth-input" id="sc_cvv" placeholder="321" required />
                    </div>
                    <div className="auth-form-group">
                      <label className="auth-label">Billing Zip Code</label>
                      <input type="text" className="auth-input" id="sc_zip" placeholder="10001" required />
                    </div>
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-label">Transaction Amount ($)</label>
                    <input type="number" className="auth-input" id="sc_amount" placeholder="e.g. 45" required />
                  </div>
                </div>

                {/* Dynamic Spatial Data Layout Layer Wrapper */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>2. Geolocation Coordinate Vector</h4>

                  {useLiveGPS ? (
                    /* AUTOMATED GPS DISPLAY PATH */
                    <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-line)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}> AUTOMATED TELEMETRY FEED:</div>
                      {isLocating ? (
                        <span style={{ color: 'var(--color-primary)' }}>Pinging active cellular hardware chips...</span>
                      ) : deviceLatitude ? (
                        <div style={{ color: '#10b981' }}>
                          <div>LATITUDE: {deviceLatitude}</div>
                          <div>LONGITUDE: {deviceLongitude}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#f43f5e' }}> GPS Permission Blocked. Falling back to manual entry.</span>
                      )}
                    </div>
                  ) : (
                    /* MANUAL COORDINATE OVERRIDE DISPLAY PATH */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="auth-form-group">
                        <label className="auth-label">Manual Latitude</label>
                        <input type="number" step="any" className="auth-input" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="33.5138" required />
                      </div>
                      <div className="auth-form-group">
                        <label className="auth-label">Manual Longitude</label>
                        <input type="number" step="any" className="auth-input" value={manualLon} onChange={(e) => setManualLon(e.target.value)} placeholder="36.2765" required />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={async () => {
                    const amt = document.getElementById('sc_amount')?.value;
                    const cvv = document.getElementById('sc_cvv')?.value;
                    const zip = document.getElementById('sc_zip')?.value;

                    const finalLat = useLiveGPS ? deviceLatitude : manualLat;
                    const finalLon = useLiveGPS ? deviceLongitude : manualLon;

                    if (!amt || !cvv || !zip || !finalLat || !finalLon) {
                      return alert("Please specify all telemetry parameters.");
                    }

                    try {
                      setIsScanning(true);
                      setFraudScanResult(null);

                      const constructedUrl = `https://maps.google.com/maps?q=${finalLat},${finalLon}&z=6&output=embed`;
                      setLiveMapUrl(constructedUrl);

                      // Clean, numeric variables calculated right here
                      const parsedLat = useLiveGPS ? parseFloat(deviceLatitude) : parseFloat(manualLat || "33.5138");
                      const parsedLon = useLiveGPS ? parseFloat(deviceLongitude) : parseFloat(manualLon || "36.2765");
                      const parsedAmt = parseFloat(amt || "0");

                      if (isNaN(parsedAmt) || isNaN(parsedLat) || isNaN(parsedLon)) {
                        return alert("Telemetry calculation error: Coordinates or amounts are invalid formats.");
                      }

                      const silentFingerprint = `${navigator.userAgent}-${navigator.language}`;
                      const structuredTime = new Date().toTimeString().split(' ');

                      const activeMerchant = localStorage.getItem('pending_store_merchant') || "Direct Swipe";
                      const activeCategory = localStorage.getItem('pending_store_category') || "Uncategorized";

                      // 🌟 FIXED: Passing our clean numeric variables to the API payload
                      const res = await transactionAPI.verifyRisk({
                        amount: parsedAmt,
                        category: activeCategory,
                        merchant_name: activeMerchant,
                        latitude: parsedLat,
                        longitude: parsedLon,
                        cvv_code: cvv,
                        billing_zip: zip,
                        device_fingerprint: silentFingerprint,
                        cardholder_ip: "127.0.0.1",
                        transaction_time: structuredTime[0]
                      });
                      setFraudScanResult(res.data);
                      setHasActiveStoreItem(false);
                    } catch (err) {
                      // 🌟 FIXED: Extracts only the text message string out of the server 400 error object
                      if (err.response?.data) {
                        setFraudScanResult({
                          action: "DECLINE",
                          fraud_risk_score: 0.95, // Set fallback visualization risk profile metric
                          reason: err.response.data.detail || "Multi-layer anomaly interception active."
                        });
                      } else {
                        setFraudScanResult({
                          action: "DECLINE",
                          fraud_risk_score: 0.99,
                          reason: "Network handshake error."
                        });
                      }
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                  className="auth-button"
                  style={{ width: '100%' }}
                  disabled={isScanning || (useLiveGPS && isLocating)}
                >
                  {isScanning ? 'Executing Multi-Layer Telemetry Verification...' : 'Authorize Secure Swipe Request'}
                </button>


              </div>

              {/* Radar Map & AI Feed Output Console Split Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#090d16', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-line)', height: '220px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0' }}>
                    <ShieldCheck size={16} color="var(--color-primary)" style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))' }} />
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                      Spatial Radar Target Acquisition Map
                    </h4>
                  </div>
                  {liveMapUrl ? (
                    <iframe title="Map Component" width="100%" height="85%" style={{ border: 'none', borderRadius: '6px', filter: 'invert(90%) hue-rotate(180deg)' }} src={liveMapUrl}></iframe>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed #334155', borderRadius: '6px' }}>
                      Awaiting telemetry coordinates tracking...
                    </div>
                  )}
                </div>

                <div style={{ background: '#090d16', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-line)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                  {fraudScanResult && (
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: fraudScanResult.action === 'APPROVE' ? 'var(--color-success)' : 'var(--color-accent)' }}></div>
                        <strong>{fraudScanResult.action === 'APPROVE' ? 'TRANSACTION AUTHORIZED' : 'AI SECURITY INTERCEPTION'}</strong>
                      </div>
                      <div style={{ fontFamily: 'monospace', background: '#1e293b', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div> Output Variance Score: {(fraudScanResult.fraud_risk_score * 100).toFixed(0)}% Risk</div>
                        <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}> Signal Profile: {fraudScanResult.reason}</div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {currentTab === 'storefront' && (
          <div className="ledger-card" style={{ padding: '2.5rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2>Interactive Live Checkout Point-of-Sale</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Simulate real-world client swipes. Approved purchases deduct balances and retrain the AI model in real time.</p>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <RefreshCw size={20} color="var(--color-primary)" style={{ marginTop: '0.15rem', animation: 'spin 4s linear infinite' }} />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Adaptive Online Learning Core Active</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                  This platform operates with **zero static behavior constraints**. Every single authorized checkout vector automatically streams into your database schema, forcing the background Isolation Forest trees to immediately adjust their multi-dimensional coordinate bounds and learn your habits natively !
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Merchant Selection Form */}
              <div style={{ background: 'var(--bg-sidebar)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-line)' }}>
                <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem', color: 'var(--color-primary)' }}>🛒 Merchant Terminals</h3>

                <div className="auth-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="auth-label">Select Registered Merchant Terminal</label>
                  <select
                    className="auth-input"
                    style={{ background: '#0f172a', color: '#fff' }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStoreMerchant(val);
                      // Auto-map categories matching our python database pools
                      if (['Whole Foods', "Trader Joe's", 'Supermarket', 'Walmart'].includes(val)) setStoreCategory('Groceries');
                      else if (['Chipotle', 'UberEats', 'Starbucks', 'McDonalds', 'Local Pizzeria'].includes(val)) setStoreCategory('Food & Dining');
                      else if (['Uber', 'Lyft', 'Shell Gas Station', 'Metropolitan Transit'].includes(val)) setStoreCategory('Transportation');
                      else if (['Netflix', 'Apple Subscription', 'Steam Games', 'AWS Cloud'].includes(val)) setStoreCategory('Technology & Entertainment');
                    }}
                  >
                    <option value="Whole Foods">Whole Foods (Groceries)</option>
                    <option value="Trader Joe's">Trader Joe's (Groceries)</option>
                    <option value="Walmart">Walmart (Groceries)</option>
                    <option value="Chipotle">Chipotle (Food & Dining)</option>
                    <option value="Starbucks">Starbucks (Food & Dining)</option>
                    <option value="Uber">Uber (Transportation)</option>
                    <option value="Shell Gas Station">Shell Gas Station (Transportation)</option>
                    <option value="Netflix">Netflix (Entertainment)</option>
                    <option value="Steam Games">Steam Games (Entertainment)</option>
                  </select>
                </div>

                <div className="auth-form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="auth-label">Transaction Checkout Amount ($)</label>
                  <input type="number" className="auth-input" value={storeAmount} onChange={(e) => setStoreAmount(e.target.value)} placeholder="45.00" />
                </div>

                <button
                  className="auth-button"
                  style={{ width: '100%' }}
                  onClick={() => {
                    // 🌟 1. Grab inputs and map them to our existing AI Security state holders
                    setStoreAmount(document.getElementById('sc_amount_store')?.value || "45.00");

                    // Auto-populate the manual inputs on the security tab view
                    setManualLat("34.6989");
                    setManualLon("36.7236");

                    // Set a flag to remember that this check originated from a marketplace intent
                    localStorage.setItem('pending_store_merchant', storeMerchant);
                    localStorage.setItem('pending_store_category', storeCategory);
                    localStorage.setItem('pending_store_amount', document.getElementById('sc_amount_store')?.value || "45.00");

                    setHasActiveStoreItem(true);

                    //  2. Redirect the user straight to the AI Radar screen automatically
                    setCurrentTab('security');

                    // Output a quick instructional alert window
                    alert(`Transferring request token to AI Security Node. Please press "Authorize Secure Swipe Request" to evaluate the risk vector.`);
                  }}
                >
                  <CreditCard size={18} /> Route Checkout request to AI Security Node
                </button>
              </div>

              {/* Terminal Receipt Output Console */}
              <div style={{ background: '#090d16', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-line)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {purchaseStatus ? (
                  <div style={{ fontFamily: 'monospace', width: '100%', fontSize: '0.9rem', color: '#f8fafc' }}>
                    <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>📡 GATEWAY TRANSLATION LOG:</div>
                    <p>{purchaseStatus}</p>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                    <p>Select a merchant terminal and process a payment vector to update the ledger tables.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
