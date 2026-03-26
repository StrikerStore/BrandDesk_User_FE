import { useState, useEffect } from 'react';
import {
  fetchSettings, updateSettings, testAutoAck, testAutoClose,
  fetchUsers, createUser, deactivateUser,
  fetchBrands, createBrand, updateBrand, deleteBrand, disconnectShopify,
  fetchAuthStatus, updateWorkspace, fetchWorkspaceMembers,
  initiateSubscription, fetchSubscription, cancelSubscription, validateCoupon, fetchInvoice,
  fetchGmailLabels, fetchPlanUsage,
  requestNewBrand, fetchGmailAccounts, linkGmail,
  fetchSupportTickets, createSupportTicket, fetchSupportTicket, replySupportTicket,
} from '../../utils/api.js';
import styles from './Settings.module.css';

export default function Settings({ onClose, user }) {
  const [activeTab, setActiveTab]   = useState('general');
  const [settings, setSettings]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [testing, setTesting]       = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading]       = useState(true);
  // Team management (admin only)
  const [users, setUsers]           = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser]       = useState({ name: '', email: '', role: 'agent' });
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError]   = useState('');
  // Workspace tab
  const [gmailStatus, setGmailStatus] = useState(null); // { connected, email }
  const [brands, setBrands]           = useState([]);
  const [editingBrand, setEditingBrand] = useState(null); // { id, label, name, email, shopify_store } or 'new'
  const [brandSaving, setBrandSaving]   = useState(false);
  const [brandError, setBrandError]     = useState('');
  const [wsName, setWsName]             = useState(user?.workspace_name || '');
  const [wsNameSaving, setWsNameSaving] = useState(false);
  const [wsMembers, setWsMembers]       = useState([]);
  const [planUsage, setPlanUsage]       = useState(null);
  // Request New Brand modal
  const [requestModal, setRequestModal]       = useState(false);
  const [requestStep, setRequestStep]         = useState(0); // 0=details, 1=connections, 2=submitted
  const [requestForm, setRequestForm]         = useState({ name: '', category: '', email: '', website: '' });
  const [requestBrandId, setRequestBrandId]   = useState(null);
  const [gmailAccounts, setGmailAccounts]     = useState([]);
  const [selectedGmail, setSelectedGmail]     = useState('');
  const [requestError, setRequestError]       = useState('');
  const [requestSaving, setRequestSaving]     = useState(false);
  // Billing tab
  const [billingData, setBillingData]       = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingCycle, setBillingCycle]     = useState('monthly');
  const [upgrading, setUpgrading]           = useState(false);
  const [selectedPlan, setSelectedPlan]     = useState(null);
  const [cancelling, setCancelling]         = useState(false);
  const [couponCode, setCouponCode]         = useState('');
  const [couponStatus, setCouponStatus]     = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [couponData, setCouponData]         = useState(null);
  const [couponError, setCouponError]       = useState('');
  const [customerGst, setCustomerGst]       = useState('');
  // Gmail labels
  const [gmailLabels, setGmailLabels]       = useState([]);
  const [labelsLoading, setLabelsLoading]   = useState(false);
  // Support tickets
  const [tickets, setTickets]               = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [supportView, setSupportView]       = useState('list'); // 'list' | 'create' | 'detail'
  const [ticketForm, setTicketForm]         = useState({ subject: '', description: '', category: 'general', priority: 'medium' });
  const [ticketSaving, setTicketSaving]     = useState(false);
  const [ticketError, setTicketError]       = useState('');
  const [activeTicket, setActiveTicket]     = useState(null); // { ticket, replies }
  const [ticketReply, setTicketReply]       = useState('');
  const [ticketReplying, setTicketReplying] = useState(false);
  const isAdmin = user?.workspace_role === 'owner' || user?.workspace_role === 'admin' || user?.role === 'admin';

  useEffect(() => {
    fetchSettings()
      .then(({ data }) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));

    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load billing data when tab is active
  useEffect(() => {
    if (activeTab !== 'billing') return;
    setBillingLoading(true);
    fetchSubscription()
      .then(({ data }) => setBillingData(data))
      .catch(() => {})
      .finally(() => setBillingLoading(false));
  }, [activeTab]);

  // Load support tickets when tab is active
  useEffect(() => {
    if (activeTab !== 'support') return;
    setTicketsLoading(true);
    fetchSupportTickets()
      .then(({ data }) => setTickets(data.data || []))
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, [activeTab]);

  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      setTicketError('Subject and description are required');
      return;
    }
    setTicketError('');
    setTicketSaving(true);
    try {
      await createSupportTicket(ticketForm);
      setTicketForm({ subject: '', description: '', category: 'general', priority: 'medium' });
      setSupportView('list');
      // Refresh list
      const { data } = await fetchSupportTickets();
      setTickets(data.data || []);
    } catch (err) {
      setTicketError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setTicketSaving(false);
    }
  };

  const openTicketDetail = async (id) => {
    try {
      const { data } = await fetchSupportTicket(id);
      setActiveTicket(data);
      setSupportView('detail');
    } catch {
      alert('Failed to load ticket');
    }
  };

  const handleTicketReply = async () => {
    if (!ticketReply.trim() || !activeTicket?.ticket) return;
    setTicketReplying(true);
    try {
      const { data: reply } = await replySupportTicket(activeTicket.ticket.id, { message: ticketReply.trim() });
      setActiveTicket(prev => ({ ...prev, replies: [...prev.replies, reply] }));
      setTicketReply('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setTicketReplying(false);
    }
  };

  // Load workspace data when that tab is active
  useEffect(() => {
    if (activeTab !== 'workspace') return;
    fetchAuthStatus()
      .then(({ data }) => setGmailStatus({ connected: data.authenticated, email: data.email }))
      .catch(() => setGmailStatus({ connected: false, email: null }));
    fetchBrands()
      .then(({ data }) => setBrands(data || []))
      .catch(() => {});
    if (user?.workspace_id) {
      fetchWorkspaceMembers(user.workspace_id)
        .then(({ data }) => setWsMembers(data || []))
        .catch(() => {});
    }
    if (isAdmin) {
      fetchUsers().then(({ data }) => setUsers(data || [])).catch(() => {});
    }
    fetchPlanUsage().then(({ data }) => setPlanUsage(data)).catch(() => {});
  }, [activeTab]);

  const handleSaveBrand = async () => {
    setBrandError('');
    setBrandSaving(true);
    try {
      if (!editingBrand.id) {
        const { data } = await createBrand(editingBrand);
        setBrands(prev => [...prev, data]);
      } else {
        const { label, ...updateData } = editingBrand;
        const { data } = await updateBrand(editingBrand.id, updateData);
        setBrands(prev => prev.map(b => b.id === data.id ? data : b));
      }
      setEditingBrand(null);
    } catch (err) {
      setBrandError(err.response?.data?.error || 'Failed to save brand');
    } finally {
      setBrandSaving(false);
    }
  };

  // Request New Brand — Step 0: submit details
  const handleRequestBrandSubmit = async () => {
    if (!requestForm.name.trim() || !requestForm.email.trim()) {
      setRequestError('Brand name and support email are required');
      return;
    }
    setRequestError('');
    setRequestSaving(true);
    try {
      const { data } = await requestNewBrand(requestForm);
      setRequestBrandId(data.id);
      // Load gmail accounts for connections step
      fetchGmailAccounts().then(({ data }) => setGmailAccounts(data || [])).catch(() => {});
      setRequestStep(1);
    } catch (err) {
      setRequestError(err.response?.data?.error || 'Failed to create brand request');
    } finally {
      setRequestSaving(false);
    }
  };

  // Request New Brand — Step 1: link existing gmail
  const handleLinkGmail = async () => {
    if (!selectedGmail || !requestBrandId) return;
    setRequestError('');
    setRequestSaving(true);
    try {
      await linkGmail(requestBrandId, selectedGmail);
      setRequestSaving(false);
    } catch (err) {
      setRequestError(err.response?.data?.error || 'Failed to link Gmail');
      setRequestSaving(false);
    }
  };

  const openRequestModal = () => {
    setRequestModal(true);
    setRequestStep(0);
    setRequestForm({ name: '', category: '', email: '', website: '' });
    setRequestBrandId(null);
    setRequestError('');
    setSelectedGmail('');
  };

  const closeRequestModal = () => {
    setRequestModal(false);
    // Refresh brands list
    fetchBrands().then(({ data }) => setBrands(data || [])).catch(() => {});
  };

  const handleDeleteBrand = async (id) => {
    if (!confirm('Remove this brand? Existing threads will not be affected.')) return;
    try {
      await deleteBrand(id);
      setBrands(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove brand');
    }
  };

  const handleSaveWorkspaceName = async () => {
    if (!wsName.trim() || !user?.workspace_id) return;
    setWsNameSaving(true);
    try {
      await updateWorkspace(user.workspace_id, { name: wsName.trim() });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update workspace name');
    } finally {
      setWsNameSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setAddingUser(true);
    setUserError('');
    try {
      const { data } = await createUser(newUser);
      setUsers(prev => [...prev, data]);
      setNewUser({ name: '', email: '', role: 'agent' });
      setShowAddUser(false);
    } catch (err) {
      setUserError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return;
    try {
      await deactivateUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: 0 } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateSettings(settings);
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type) => {
    setTesting(type);
    setTestResult(null);
    try {
      const fn = type === 'ack' ? testAutoAck : testAutoClose;
      const { data } = await fn();
      setTestResult({ ok: true, msg: data.message });
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.error || err.message });
    } finally {
      setTesting(null);
    }
  };

  const openInvoicePrint = (inv) => {
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to view invoice'); return; }
    const gstRow = parseFloat(inv.gst_amount) > 0
      ? `<tr><td>GST (${inv.gst_percent || 18}%)</td><td style="text-align:right">₹${parseFloat(inv.gst_amount).toLocaleString('en-IN')}</td></tr>`
      : '';
    const couponRow = inv.coupon_code
      ? `<tr><td>Discount (${inv.coupon_code})</td><td style="text-align:right;color:#16a34a">- ₹${parseFloat(inv.coupon_discount || 0).toLocaleString('en-IN')}</td></tr>`
      : '';
    const gstinRow = inv.gst_number ? `<div style="font-size:12px;color:#555">GSTIN: ${inv.gst_number}</div>` : '';
    const payuRow  = inv.payu_mihpayid ? `<div>PayU Ref: ${inv.payu_mihpayid}</div>` : '';
    const custGst  = inv.customer_gst ? `<div>GSTIN: ${inv.customer_gst}</div>` : '';
    const dateStr  = new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number || ''}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;margin:0;padding:32px;color:#1a1a1a;font-size:13px}
  .hdr{display:flex;justify-content:space-between;margin-bottom:32px}
  .title{font-size:22px;font-weight:700}.meta{text-align:right;font-size:12px;color:#555}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .box{border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:12px;line-height:1.8}
  .lbl{font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:10px;color:#888;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{text-align:left;font-size:11px;text-transform:uppercase;color:#888;padding:8px 10px;border-bottom:2px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
  .tot td{font-weight:700;font-size:14px;border-top:2px solid #111;border-bottom:none}
  .footer{text-align:center;margin-top:32px;font-size:11px;color:#888}
  @media print{button{display:none!important}}
</style></head><body>
<div class="hdr">
  <div><div class="title">${inv.company_name || 'BrandDesk'}</div>
    <div style="font-size:12px;color:#555;margin-top:4px">${inv.company_address || ''}</div>${gstinRow}</div>
  <div class="meta"><div style="font-size:18px;font-weight:700;color:#111">TAX INVOICE</div>
    <div>Invoice: <strong>${inv.invoice_number || 'N/A'}</strong></div>
    <div>Date: ${dateStr}</div>${payuRow}</div>
</div>
<div class="grid">
  <div class="box"><div class="lbl">Bill To</div><div style="font-weight:600">${inv.workspace_name || 'Customer'}</div>${custGst}</div>
  <div class="box"><div class="lbl">Payment</div><div>Method: ${inv.payment_method || 'N/A'}</div><div>Status: ${inv.status}</div><div>Txn: ${inv.txn_id}</div></div>
</div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
  <tr><td>${inv.plan_name || 'Subscription'} — ${inv.billing_cycle || ''}</td><td style="text-align:right">₹${parseFloat(inv.base_amount || inv.amount).toLocaleString('en-IN')}</td></tr>
  ${couponRow}${gstRow}
  <tr class="tot"><td>Total</td><td style="text-align:right">₹${parseFloat(inv.amount).toLocaleString('en-IN')}</td></tr>
</tbody></table>
<div class="footer">Thank you for your business! This is a computer-generated invoice.</div>
<div style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="padding:10px 24px;border:none;border-radius:6px;background:#4f46e5;color:#fff;font-size:13px;cursor:pointer">Print / Download PDF</button>
</div>
</body></html>`);
    w.document.close();
  };

  const getBasePrice = (plan, cycle) => billingData?.pricing?.[plan]?.[cycle] || 0;
  const getDiscount = (plan, cycle, coupon) => {
    if (!coupon) return 0;
    const base = getBasePrice(plan, cycle);
    return coupon.discount_type === 'percent' ? Math.round(base * coupon.discount_value / 100) : coupon.discount_value;
  };
  const getFinalAmount = (plan, cycle, coupon) => Math.max(0, getBasePrice(plan, cycle) - getDiscount(plan, cycle, coupon));

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setCouponStatus('validating');
    setCouponError('');
    setCouponData(null);
    try {
      const { data } = await validateCoupon({ code: couponCode.trim(), plan: selectedPlan, cycle: billingCycle });
      if (data.valid) {
        setCouponStatus('valid');
        setCouponData(data);
      } else {
        setCouponStatus('invalid');
        setCouponError(data.error || 'Invalid coupon');
      }
    } catch (err) {
      setCouponStatus('invalid');
      setCouponError(err.response?.data?.error || 'Failed to validate coupon');
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponStatus(null);
    setCouponData(null);
    setCouponError('');
  };

  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    try {
      const payload = { plan, cycle: billingCycle };
      if (couponStatus === 'valid' && couponCode.trim()) {
        payload.coupon_code = couponCode.trim();
      }
      if (customerGst.trim()) payload.customer_gst = customerGst.trim();
      const { data } = await initiateSubscription(payload);
      // Auto-submit hidden form to PayU
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${data.payuBaseUrl}/_payment`;
      Object.entries(data.formParams).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = val;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate payment');
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Cancel your subscription? Your plan will remain active until the end of the current billing period.')) return;
    setCancelling(true);
    try {
      const { data } = await cancelSubscription();
      alert(data.message);
      // Refresh billing data
      fetchSubscription().then(({ data }) => setBillingData(data)).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'general' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('general')}>General</button>
          {isAdmin && (
            <button className={`${styles.tab} ${activeTab === 'workspace' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('workspace')}>Workspace</button>
          )}
          {isAdmin && (
            <button className={`${styles.tab} ${activeTab === 'billing' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('billing')}>Billing</button>
          )}
          <button className={`${styles.tab} ${activeTab === 'support' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('support'); setSupportView('list'); }}>Support</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading settings…</div>
        ) : activeTab === 'billing' ? (
          <div className={styles.body}>
            {billingLoading ? (
              <div className={styles.loading}>Loading billing info…</div>
            ) : (
              <>
                {/* Current plan */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <div className={styles.sectionTitle}>Current plan</div>
                      <div className={styles.sectionDesc}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {billingData?.workspace?.plan || 'trial'}
                        </span>
                        {billingData?.subscription?.status === 'active' && (
                          <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#166534' }}>Active</span>
                        )}
                        {billingData?.subscription?.status === 'cancelled' && (
                          <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>
                            Cancels {new Date(billingData.subscription.current_period_end).toLocaleDateString()}
                          </span>
                        )}
                        {billingData?.workspace?.plan === 'trial' && billingData?.workspace?.trial_ends_at && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                            Trial ends {new Date(billingData.workspace.trial_ends_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {billingData?.subscription?.status === 'active' && (
                    <div className={styles.subSettings}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Billing cycle: <strong style={{ textTransform: 'capitalize' }}>{billingData.subscription.billing_cycle}</strong>
                        {' · '}Amount: <strong>₹{billingData.subscription.amount}</strong>
                        {billingData.subscription.current_period_end && (
                          <>{' · '}Next renewal: <strong>{new Date(billingData.subscription.current_period_end).toLocaleDateString()}</strong></>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade options */}
                {(billingData?.plans || []).some(p => p.name !== 'trial' && p.name !== billingData?.workspace?.plan && (p.price_monthly > 0 || p.price_yearly > 0)) && (
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>Upgrade your plan</div>
                        <div className={styles.sectionDesc}>Select a plan, choose billing cycle, and proceed to payment.</div>
                      </div>
                    </div>
                    <div className={styles.subSettings}>
                      {/* Step 1: Select plan */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Choose a plan</div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                        {(billingData?.plans || [])
                          .filter(p => p.name !== 'trial' && p.name !== billingData?.workspace?.plan && (p.price_monthly > 0 || p.price_yearly > 0))
                          .map(p => (
                          <div key={p.name}
                            onClick={() => { setSelectedPlan(p.name); handleRemoveCoupon(); }}
                            style={{
                              flex: 1, border: selectedPlan === p.name ? '2px solid var(--accent)' : '1px solid var(--border)',
                              borderRadius: 10, padding: 16, cursor: 'pointer',
                              background: selectedPlan === p.name ? 'var(--accent-bg, #eef2ff)' : 'transparent',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.display_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{p.description || ''}</div>
                            {selectedPlan === p.name && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>✓ Selected</div>}
                          </div>
                        ))}
                      </div>

                      {/* Step 2 & 3 only show after plan selection */}
                      {selectedPlan && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Billing cycle</div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-primary)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
                            <button
                              style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                                background: billingCycle === 'monthly' ? 'var(--surface)' : 'transparent',
                                color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                boxShadow: billingCycle === 'monthly' ? 'var(--shadow-sm)' : 'none',
                              }}
                              onClick={() => { setBillingCycle('monthly'); handleRemoveCoupon(); }}
                            >
                              Monthly — ₹{getBasePrice(selectedPlan, 'monthly').toLocaleString('en-IN')}/mo
                            </button>
                            <button
                              style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                                background: billingCycle === 'yearly' ? 'var(--surface)' : 'transparent',
                                color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                boxShadow: billingCycle === 'yearly' ? 'var(--shadow-sm)' : 'none',
                              }}
                              onClick={() => { setBillingCycle('yearly'); handleRemoveCoupon(); }}
                            >
                              Yearly — ₹{getBasePrice(selectedPlan, 'yearly').toLocaleString('en-IN')}/yr
                              {getBasePrice(selectedPlan, 'yearly') < getBasePrice(selectedPlan, 'monthly') * 12 && (
                                <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#dcfce7', color: '#166534' }}>
                                  Save {Math.round((1 - getBasePrice(selectedPlan, 'yearly') / (getBasePrice(selectedPlan, 'monthly') * 12)) * 100)}%
                                </span>
                              )}
                            </button>
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Have a coupon? (optional)</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <input type="text" placeholder="Enter coupon code" value={couponCode}
                              onChange={e => { setCouponCode(e.target.value.toUpperCase()); if (couponStatus) handleRemoveCoupon(); }}
                              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, width: 180, textTransform: 'uppercase' }}
                            />
                            {couponStatus === 'valid' ? (
                              <button onClick={handleRemoveCoupon} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                            ) : (
                              <button onClick={handleApplyCoupon} disabled={!couponCode.trim() || couponStatus === 'validating'}
                                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}>
                                {couponStatus === 'validating' ? 'Checking…' : 'Apply'}
                              </button>
                            )}
                          </div>
                          {couponStatus === 'valid' && couponData && (
                            <div style={{ marginBottom: 12, padding: '6px 12px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontSize: 12 }}>
                              ✅ {couponData.discount_type === 'percent' ? `${couponData.discount_value}% off` : `₹${couponData.discount_value} off`}
                            </div>
                          )}
                          {couponStatus === 'invalid' && couponError && (
                            <div style={{ marginBottom: 12, padding: '6px 12px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontSize: 12 }}>{couponError}</div>
                          )}

                          {/* GST Number (optional) */}
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. GST Number (optional)</div>
                          <input type="text" placeholder="Enter your GSTIN to claim GST credit" value={customerGst}
                            onChange={e => setCustomerGst(e.target.value.toUpperCase())}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, width: 260, textTransform: 'uppercase', marginBottom: 8 }}
                          />

                          {/* Order Summary */}
                          <div style={{ marginTop: 12, padding: 16, borderRadius: 10, background: 'var(--bg-primary, #f9fafb)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Order Summary</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{billingData?.plans?.find(p => p.name === selectedPlan)?.display_name || selectedPlan} — {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                              <span>₹{getBasePrice(selectedPlan, billingCycle).toLocaleString('en-IN')}</span>
                            </div>
                            {couponStatus === 'valid' && couponData && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#16a34a' }}>
                                <span>Discount ({couponData.discount_type === 'percent' ? `${couponData.discount_value}%` : `₹${couponData.discount_value}`})</span>
                                <span>- ₹{getDiscount(selectedPlan, billingCycle, couponData).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                              <span>GST (18%)</span>
                              <span>₹{Math.round(getFinalAmount(selectedPlan, billingCycle, couponData) * 0.18).toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                              <span>Total Payable</span>
                              <span style={{ color: 'var(--accent)' }}>₹{Math.round(getFinalAmount(selectedPlan, billingCycle, couponData) * 1.18).toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>Inclusive of 18% GST</div>
                            <button onClick={() => handleUpgrade(selectedPlan)} disabled={upgrading}
                              style={{ width: '100%', marginTop: 14, padding: '12px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', opacity: upgrading ? 0.7 : 1 }}>
                              {upgrading ? 'Redirecting to payment…' : `Pay ₹${Math.round(getFinalAmount(selectedPlan, billingCycle, couponData) * 1.18).toLocaleString('en-IN')} →`}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Cancel subscription */}
                {billingData?.subscription?.status === 'active' && (
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>Cancel subscription</div>
                        <div className={styles.sectionDesc}>Your plan will remain active until the end of the current billing period.</div>
                      </div>
                      <button className={styles.deactivateBtn} onClick={handleCancelSubscription} disabled={cancelling}
                        style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6 }}>
                        {cancelling ? 'Cancelling…' : 'Cancel plan'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment history */}
                {billingData?.transactions?.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>Payment history</div>
                      </div>
                    </div>
                    <div className={styles.userList}>
                      {billingData.transactions.map(txn => (
                        <div key={txn.txn_id} className={styles.userRow}>
                          <div className={styles.userRowLeft}>
                            <div className={styles.userAvatar} style={{
                              background: txn.status === 'success' ? '#dcfce7' : '#fee2e2',
                              color: txn.status === 'success' ? '#166534' : '#991b1b',
                              fontSize: 12,
                            }}>
                              {txn.status === 'success' ? '✓' : '✕'}
                            </div>
                            <div>
                              <div className={styles.userRowName}>₹{txn.amount}{txn.invoice_number ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{txn.invoice_number}</span> : ''}</div>
                              <div className={styles.userRowEmail}>
                                {new Date(txn.created_at).toLocaleDateString()} · {txn.payment_method || 'N/A'}
                                {txn.plan_name ? ` · ${txn.plan_name}` : ''}
                                {txn.coupon_code ? ` · Coupon: ${txn.coupon_code}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className={styles.userRowRight} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {txn.status === 'success' && (
                              <button onClick={async () => {
                                try {
                                  const { data: inv } = await fetchInvoice(txn.txn_id);
                                  openInvoicePrint(inv);
                                } catch { alert('Failed to load invoice'); }
                              }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Invoice
                              </button>
                            )}
                            <span className={`${styles.userRole} ${txn.status === 'success' ? styles.userRoleAdmin : ''}`}
                              style={txn.status !== 'success' ? { color: '#991b1b', background: '#fee2e2' } : {}}>
                              {txn.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'support' ? (
          <div className={styles.body}>
            {ticketsLoading ? (
              <div className={styles.loading}>Loading tickets…</div>
            ) : supportView === 'create' ? (
              /* ── Create ticket form ── */
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Raise a Ticket</div>
                <div className={styles.sectionDesc} style={{ marginBottom: 16 }}>
                  Describe your issue and our team will get back to you.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className={styles.addUserInput}
                    placeholder="Subject *" value={ticketForm.subject}
                    onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className={styles.addUserInput} value={ticketForm.category}
                      onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}>
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="billing">Billing</option>
                    </select>
                    <select className={styles.addUserInput} value={ticketForm.priority}
                      onChange={e => setTicketForm(p => ({ ...p, priority: e.target.value }))}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <textarea className={styles.addUserInput}
                    placeholder="Describe your issue in detail… *"
                    value={ticketForm.description}
                    onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))}
                    rows={5}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                  {ticketError && <div className={styles.userError}>{ticketError}</div>}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className={styles.viewCancelBtn} onClick={() => { setSupportView('list'); setTicketError(''); }}>Cancel</button>
                    <button className={styles.viewSaveBtn} onClick={handleCreateTicket}
                      disabled={ticketSaving || !ticketForm.subject.trim() || !ticketForm.description.trim()}>
                      {ticketSaving ? 'Submitting…' : 'Submit Ticket'}
                    </button>
                  </div>
                </div>
              </div>
            ) : supportView === 'detail' && activeTicket ? (
              /* ── Ticket detail view ── */
              <div className={styles.section} style={{ borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <button className={styles.viewCancelBtn} onClick={() => setSupportView('list')}
                    style={{ padding: '2px 6px', fontSize: 13 }}>← Back</button>
                  <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    #{activeTicket.ticket.id} — {activeTicket.ticket.subject}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={styles.supportBadge} data-status={activeTicket.ticket.status}>
                    {activeTicket.ticket.status.replace(/_/g, ' ')}
                  </span>
                  <span className={styles.supportBadge} data-priority={activeTicket.ticket.priority}>
                    {activeTicket.ticket.priority}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {activeTicket.ticket.category?.replace(/_/g, ' ')} · {new Date(activeTicket.ticket.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className={styles.supportDesc}>{activeTicket.ticket.description}</div>

                {/* Conversation */}
                <div className={styles.supportConvo}>
                  {activeTicket.replies.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                      No replies yet — our team will respond soon.
                    </div>
                  ) : (
                    activeTicket.replies.map(r => (
                      <div key={r.id} className={`${styles.supportReply} ${r.is_admin ? styles.supportReplyAdmin : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            {r.user_name || 'Unknown'}
                            {r.is_admin ? <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 6, padding: '1px 5px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8' }}>Admin</span> : ''}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.message}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply input */}
                {activeTicket.ticket.status !== 'closed' && (
                  <div style={{ marginTop: 12 }}>
                    <textarea className={styles.addUserInput}
                      placeholder="Type your reply…"
                      value={ticketReply}
                      onChange={e => setTicketReply(e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className={styles.viewSaveBtn} onClick={handleTicketReply}
                        disabled={ticketReplying || !ticketReply.trim()}>
                        {ticketReplying ? 'Sending…' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Ticket list ── */
              <div className={styles.section} style={{ borderBottom: 'none' }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>Your Tickets</div>
                    <div className={styles.sectionDesc}>Track your support requests and responses.</div>
                  </div>
                  <button className={styles.testBtn} onClick={() => { setSupportView('create'); setTicketError(''); }}>
                    + New Ticket
                  </button>
                </div>
                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                    No tickets yet. Click "New Ticket" to raise one.
                  </div>
                ) : (
                  <div className={styles.supportTicketList}>
                    {tickets.map(t => (
                      <div key={t.id} className={styles.supportTicketRow} onClick={() => openTicketDetail(t.id)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.supportTicketSubject}>{t.subject}</div>
                          <div className={styles.supportTicketMeta}>
                            #{t.id} · {t.category?.replace(/_/g, ' ')} · {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        <span className={styles.supportBadge} data-status={t.status}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'workspace' ? (
          <div className={styles.body}>

            {/* Workspace name */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Workspace name</div>
                  <div className={styles.sectionDesc}>Display name shown across the app.</div>
                </div>
              </div>
              <div className={styles.subSettings}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className={styles.addUserInput} style={{ flex: 1 }}
                    value={wsName} onChange={e => setWsName(e.target.value)}
                    placeholder="Workspace name" />
                  <button className={styles.viewSaveBtn} onClick={handleSaveWorkspaceName}
                    disabled={wsNameSaving || !wsName.trim()}>
                    {wsNameSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Gmail connection */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Gmail connection</div>
                  <div className={styles.sectionDesc}>
                    {gmailStatus?.connected
                      ? <>Connected as <strong>{gmailStatus.email}</strong></>
                      : 'No Gmail account connected. Connect to start syncing emails.'}
                  </div>
                </div>
                <a
                  className={styles.testBtn}
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/google`}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  {gmailStatus?.connected ? 'Reconnect' : 'Connect Gmail'}
                </a>
              </div>
            </div>

            {/* Brand management */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Brands</div>
                  <div className={styles.sectionDesc}>Each brand maps to a Gmail label and email address. Contact admin to approve new brands.</div>
                </div>
                <button className={styles.testBtn} onClick={openRequestModal}>
                  + Request New Brand
                </button>
              </div>

              {/* Inline editing for existing brands (name, email, shopify only — label is read-only) */}
              {editingBrand && (
                <div className={styles.subSettings}>
                  <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text-tertiary)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    Gmail label: <strong>{editingBrand.label || '—'}</strong>
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>(managed by admin)</span>
                  </div>
                  <input className={styles.addUserInput}
                    placeholder="Brand display name" value={editingBrand.name || ''}
                    onChange={e => setEditingBrand(p => ({ ...p, name: e.target.value }))} />
                  <input className={styles.addUserInput} type="email"
                    placeholder="Support email address" value={editingBrand.email || ''}
                    onChange={e => setEditingBrand(p => ({ ...p, email: e.target.value }))} />
                  <input className={styles.addUserInput}
                    placeholder="Shopify store URL (optional)" value={editingBrand.shopify_store || ''}
                    onChange={e => setEditingBrand(p => ({ ...p, shopify_store: e.target.value }))} />
                  {brandError && <div className={styles.userError}>{brandError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={styles.viewSaveBtn} onClick={handleSaveBrand} disabled={brandSaving}>
                      {brandSaving ? 'Saving…' : 'Save brand'}
                    </button>
                    <button className={styles.viewCancelBtn} onClick={() => { setEditingBrand(null); setBrandError(''); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className={styles.userList} style={{ marginTop: editingBrand ? 12 : 0 }}>
                {brands.map(b => (
                  <div key={b.id} className={styles.userRow}>
                    <div className={styles.userRowLeft}>
                      <div className={styles.userAvatar}>{b.name[0]?.toUpperCase()}</div>
                      <div>
                        <div className={styles.userRowName}>
                          {b.name}
                          {b.brand_status && b.brand_status !== 'approved' && (
                            <span style={{
                              marginLeft: 8, fontSize: 10, fontWeight: 600,
                              padding: '1px 7px', borderRadius: 99,
                              textTransform: 'capitalize',
                              ...(b.brand_status === 'pending_approval'
                                ? { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }
                                : b.brand_status === 'rejected'
                                ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }
                                : { background: 'var(--surface-3)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }
                              ),
                            }}>
                              {b.brand_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        {b.brand_status === 'rejected' && b.rejection_reason && (
                          <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2, lineHeight: 1.4 }}>
                            Reason: {b.rejection_reason}
                          </div>
                        )}
                        <div className={styles.userRowEmail}>{b.email} · label: {b.label || '—'}</div>
                        {b.shopify_store && (
                          <div style={{ fontSize: 11, marginTop: 2 }}>
                            {b.shopify_connected ? (
                              <span style={{ color: 'var(--green, #16a34a)', fontWeight: 600 }}>Shopify connected</span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>{b.shopify_store}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.userRowRight}>
                      {b.shopify_store && !b.shopify_connected && (
                        <a className={styles.testBtn}
                          style={{ padding: '3px 10px', fontSize: 11, textDecoration: 'none' }}
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/shopify?brand_id=${b.id}&shop=${encodeURIComponent(b.shopify_store)}`}>
                          Connect Shopify
                        </a>
                      )}
                      {b.shopify_connected && (
                        <button className={styles.deactivateBtn} style={{ fontSize: 10, padding: '2px 8px' }}
                          onClick={async () => {
                            if (!confirm('Disconnect Shopify for this brand?')) return;
                            await disconnectShopify(b.id);
                            setBrands(prev => prev.map(x => x.id === b.id ? { ...x, shopify_connected: false } : x));
                          }}>
                          Disconnect
                        </button>
                      )}
                      {b.brand_status === 'approved' && (
                        <button className={styles.testBtn} style={{ padding: '3px 10px', fontSize: 11 }}
                          onClick={() => setEditingBrand({ ...b })}>Edit</button>
                      )}
                    </div>
                  </div>
                ))}
                {brands.length === 0 && !editingBrand && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '12px 0' }}>
                    No brands configured yet.
                  </div>
                )}
              </div>
            </div>

            {/* Request New Brand Modal */}
            {requestModal && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(0,0,0,0.35)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }} onClick={closeRequestModal}>
                <div style={{
                  background: 'var(--surface)', borderRadius: 16,
                  width: 480, maxWidth: '92vw', maxHeight: '80vh',
                  overflowY: 'auto', padding: '28px 28px 24px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {requestStep === 0 ? 'Request New Brand' : requestStep === 1 ? 'Connect Services' : 'Request Submitted'}
                    </div>
                    <button onClick={closeRequestModal} style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '4px 8px', borderRadius: 6 }}>✕</button>
                  </div>

                  {/* Step indicator */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: i <= requestStep ? 'var(--accent)' : 'var(--surface-3)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>

                  {requestStep === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input className={styles.addUserInput}
                        placeholder="Brand name *" value={requestForm.name}
                        onChange={e => setRequestForm(p => ({ ...p, name: e.target.value }))} />
                      <select className={styles.addUserInput}
                        value={requestForm.category}
                        onChange={e => setRequestForm(p => ({ ...p, category: e.target.value }))}>
                        <option value="">Select category…</option>
                        <option value="Fashion">Fashion & Apparel</option>
                        <option value="Beauty">Beauty & Cosmetics</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Food">Food & Beverages</option>
                        <option value="Health">Health & Wellness</option>
                        <option value="Home">Home & Living</option>
                        <option value="Jewelry">Jewelry & Accessories</option>
                        <option value="Sports">Sports & Outdoors</option>
                        <option value="Other">Other</option>
                      </select>
                      <input className={styles.addUserInput} type="email"
                        placeholder="Support email address *" value={requestForm.email}
                        onChange={e => setRequestForm(p => ({ ...p, email: e.target.value }))} />
                      <input className={styles.addUserInput} type="url"
                        placeholder="Website URL (optional)" value={requestForm.website}
                        onChange={e => setRequestForm(p => ({ ...p, website: e.target.value }))} />
                      {requestError && <div className={styles.userError}>{requestError}</div>}
                      <button className={styles.viewSaveBtn}
                        onClick={handleRequestBrandSubmit}
                        disabled={requestSaving || !requestForm.name.trim() || !requestForm.email.trim()}
                        style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                        {requestSaving ? 'Creating…' : 'Next →'}
                      </button>
                    </div>
                  )}

                  {requestStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Gmail connection */}
                      <div style={{
                        padding: 16, border: '1px solid var(--border)', borderRadius: 10,
                        background: 'var(--surface-2)',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                          📧 Gmail Account
                        </div>
                        {gmailAccounts.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <select className={styles.addUserInput}
                              value={selectedGmail}
                              onChange={e => setSelectedGmail(e.target.value)}>
                              <option value="">Choose existing Gmail…</option>
                              {gmailAccounts.map(g => (
                                <option key={g.id} value={g.id}>{g.email}</option>
                              ))}
                            </select>
                            {selectedGmail && (
                              <button className={styles.viewSaveBtn}
                                onClick={handleLinkGmail}
                                disabled={requestSaving}
                                style={{ marginTop: 8, fontSize: 11, padding: '4px 12px' }}>
                                Link this Gmail
                              </button>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                          {gmailAccounts.length > 0 ? 'Or connect a new account:' : 'Connect a Gmail account for this brand:'}
                        </div>
                        <a className={styles.testBtn}
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: 12 }}
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/google?brand_id=${requestBrandId}&origin=settings`}>
                          Connect New Gmail
                        </a>
                      </div>

                      {/* Shopify connection */}
                      <div style={{
                        padding: 16, border: '1px solid var(--border)', borderRadius: 10,
                        background: 'var(--surface-2)',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                          🛒 Shopify Store
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                          You can connect Shopify after admin approval, from the brands list.
                        </div>
                      </div>

                      {requestError && <div className={styles.userError}>{requestError}</div>}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <button className={styles.viewCancelBtn} onClick={() => setRequestStep(0)}>← Back</button>
                        <button className={styles.viewSaveBtn}
                          onClick={() => setRequestStep(2)}>
                          Submit for Review
                        </button>
                      </div>
                    </div>
                  )}

                  {requestStep === 2 && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                        Brand request submitted!
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 20px' }}>
                        Our team will review your new brand and assign a Gmail label. You'll be notified once it's approved.
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, padding: '6px 12px', borderRadius: 99,
                          background: '#dcfce7', color: '#166534',
                        }}>✓ Details submitted</div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, padding: '6px 12px', borderRadius: 99,
                          background: '#fffbeb', color: '#92400e',
                        }}>⏳ Admin approval</div>
                      </div>
                      <button className={styles.viewSaveBtn}
                        onClick={closeRequestModal}
                        style={{ marginTop: 20 }}>
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Team members */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Team members</div>
                  <div className={styles.sectionDesc}>
                    People with access to this workspace.
                    {planUsage && planUsage.limits.members && (
                      <span style={{ marginLeft: 6, fontWeight: 600, color: planUsage.usage.members >= planUsage.limits.members ? '#dc2626' : 'var(--text-secondary)' }}>
                        ({planUsage.usage.members}/{planUsage.limits.members} seats used)
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button className={styles.testBtn} onClick={() => setShowAddUser(v => !v)}
                    disabled={planUsage && planUsage.limits.members && planUsage.usage.members >= planUsage.limits.members}
                    title={planUsage && planUsage.limits.members && planUsage.usage.members >= planUsage.limits.members ? 'Member limit reached. Upgrade your plan.' : ''}>
                    + Add member
                  </button>
                )}
              </div>

              {showAddUser && (
                <div className={styles.subSettings}>
                  <div className={styles.addUserForm}>
                    <input className={styles.addUserInput} placeholder="Full name" value={newUser.name}
                      onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                    <input className={styles.addUserInput} placeholder="Email (Google account)" type="email" value={newUser.email}
                      onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    <select className={styles.addUserInput} value={newUser.role}
                      onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    {userError && <div className={styles.userError}>{userError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={styles.viewSaveBtn} onClick={handleAddUser}
                        disabled={addingUser || !newUser.name || !newUser.email}>
                        {addingUser ? 'Adding…' : 'Add member'}
                      </button>
                      <button className={styles.viewCancelBtn} onClick={() => { setShowAddUser(false); setUserError(''); }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.userList}>
                {wsMembers.map(m => {
                  const matchedUser = users.find(u => u.id === m.user_id);
                  const isInactive = matchedUser && !matchedUser.is_active;
                  return (
                    <div key={m.user_id} className={`${styles.userRow} ${isInactive ? styles.userRowInactive : ''}`}>
                      <div className={styles.userRowLeft}>
                        <div className={styles.userAvatar}>{m.name?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                          <div className={styles.userRowName}>{m.name}
                            {m.user_id === user.id && <span className={styles.youBadge}>you</span>}
                          </div>
                          <div className={styles.userRowEmail}>{m.email}</div>
                        </div>
                      </div>
                      <div className={styles.userRowRight}>
                        <span className={`${styles.userRole} ${m.role === 'owner' || m.role === 'admin' ? styles.userRoleAdmin : ''}`}>
                          {m.role}
                        </span>
                        {isInactive && <span className={styles.inactiveBadge}>Inactive</span>}
                        {isAdmin && !isInactive && m.user_id !== user.id && (
                          <button className={styles.deactivateBtn} onClick={() => handleDeactivate(m.user_id)} title="Deactivate">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className={styles.body}>

            {/* My account */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>My account</div>
                  <div className={styles.sectionDesc}>{user?.name} · {user?.email}</div>
                </div>
              </div>
            </div>

            {/* Auto-acknowledgement */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Auto-acknowledgement</div>
                  <div className={styles.sectionDesc}>
                    Automatically send the "Acknowledgement" template to new tickets after a delay.
                    Sends only if no manual reply has been sent yet.
                  </div>
                </div>
                <Toggle
                  value={settings?.auto_ack_enabled === 'true'}
                  onChange={v => set('auto_ack_enabled', v ? 'true' : 'false')}
                />
              </div>

              {settings?.auto_ack_enabled === 'true' && (
                <div className={styles.subSettings}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Send after</label>
                    <div className={styles.fieldInput}>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className={styles.numInput}
                        value={settings?.auto_ack_delay_minutes || 5}
                        onChange={e => set('auto_ack_delay_minutes', e.target.value)}
                      />
                      <span className={styles.fieldUnit}>minutes after ticket arrives</span>
                    </div>
                  </div>
                  <div className={styles.fieldNote}>
                    Make sure you have a template titled "Acknowledgement" in your template library.
                    Variables <code>{'{{customer_name}}'}</code>, <code>{'{{brand}}'}</code>,
                    <code>{'{{ticket_id}}'}</code> will be auto-filled.
                  </div>
                  <button
                    className={styles.testBtn}
                    onClick={() => handleTest('ack')}
                    disabled={testing === 'ack'}
                  >
                    {testing === 'ack' ? 'Running…' : 'Test now — send ack to pending tickets'}
                  </button>
                </div>
              )}
            </div>

            {/* Auto-close */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Auto-close stale resolved tickets</div>
                  <div className={styles.sectionDesc}>
                    Archive resolved tickets where the customer hasn't replied after N days.
                    Runs daily at midnight.
                  </div>
                </div>
                <Toggle
                  value={settings?.auto_close_enabled === 'true'}
                  onChange={v => set('auto_close_enabled', v ? 'true' : 'false')}
                />
              </div>

              {settings?.auto_close_enabled === 'true' && (
                <div className={styles.subSettings}>
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Close after</label>
                    <div className={styles.fieldInput}>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        className={styles.numInput}
                        value={settings?.auto_close_days || 7}
                        onChange={e => set('auto_close_days', e.target.value)}
                      />
                      <span className={styles.fieldUnit}>days with no customer reply</span>
                    </div>
                  </div>
                  <button
                    className={styles.testBtn}
                    onClick={() => handleTest('close')}
                    disabled={testing === 'close'}
                  >
                    {testing === 'close' ? 'Running…' : 'Test now — close eligible tickets'}
                  </button>
                </div>
              )}
            </div>

            {/* SLA target */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>SLA configuration</div>
                  <div className={styles.sectionDesc}>
                    SLA is based on business hours: <strong>Mon–Sat, 10 AM – 8 PM IST</strong>. Sundays off.
                  </div>
                </div>
              </div>
              <div className={styles.subSettings}>
                <div className={styles.slaRules}>
                  <div className={styles.slaRule}>
                    <span className={styles.slaRuleIcon}>🕙</span>
                    <div>
                      <div className={styles.slaRuleTitle}>During business hours</div>
                      <div className={styles.slaRuleDesc}>Ticket must be replied within <strong>4 hours</strong></div>
                    </div>
                  </div>
                  <div className={styles.slaRule}>
                    <span className={styles.slaRuleIcon}>🌙</span>
                    <div>
                      <div className={styles.slaRuleTitle}>Outside business hours</div>
                      <div className={styles.slaRuleDesc}>SLA deadline is <strong>next business day 12 PM IST</strong></div>
                    </div>
                  </div>
                  <div className={styles.slaRule}>
                    <span className={styles.slaRuleIcon}>📅</span>
                    <div>
                      <div className={styles.slaRuleTitle}>Sunday</div>
                      <div className={styles.slaRuleDesc}>Off — tickets carry over to Monday 12 PM IST</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {testResult && (
              <div className={`${styles.testResult} ${testResult.ok ? styles.testOk : styles.testErr}`}>
                {testResult.ok ? '✅' : '❌'} {testResult.msg}
              </div>
            )}

          </div>
        )}

        {activeTab === 'general' && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        )}
        {(activeTab === 'workspace' || activeTab === 'billing' || activeTab === 'support') && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
      title={value ? 'Enabled — click to disable' : 'Disabled — click to enable'}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}