import { useState, useEffect } from 'react';
import { fetchCurrentUser, selectWorkspace, fetchMyWorkspaces, fetchBrands } from './utils/api.js';
import LoginPage from './pages/LoginPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import SyncOverlay from './components/SyncOverlay/SyncOverlay.jsx';

export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null });
  // { needsSelection: true, workspaces: [...], preAuthToken: '...' }
  const [wsSelection, setWsSelection] = useState(null);
  // Brands for sync overlay check
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    // Cross-subdomain token handoff: onboarding app redirects with ?token=<jwt>
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('bd_token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetchCurrentUser()
      .then(({ data }) => setAuthState({ loading: false, user: data }))
      .catch(() => setAuthState({ loading: false, user: null }));
  }, []);

  // Fetch brands when user is logged in (for sync overlay check)
  useEffect(() => {
    if (!authState.user) return;
    fetchBrands()
      .then(({ data }) => setBrands(data || []))
      .catch(() => {});
  }, [authState.user]);

  const handleLogin = (data) => {
    if (data.needsWorkspaceSelection) {
      // Multi-workspace user — show switcher
      setWsSelection({ workspaces: data.workspaces, preAuthToken: data.preAuthToken });
      setAuthState({ loading: false, user: null });
    } else {
      setAuthState({ loading: false, user: data.user || data });
    }
  };

  const handleSelectWorkspace = async (workspaceId) => {
    try {
      const { data } = await selectWorkspace({
        token: wsSelection.preAuthToken,
        workspace_id: workspaceId,
      });
      if (data.token) localStorage.setItem('bd_token', data.token);
      setWsSelection(null);
      setAuthState({ loading: false, user: data.user });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to select workspace');
    }
  };

  if (authState.loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (wsSelection) {
    return (
      <WorkspaceSwitcher
        workspaces={wsSelection.workspaces}
        onSelect={handleSelectWorkspace}
      />
    );
  }

  if (!authState.user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <SyncOverlay
        brands={brands}
        onSyncComplete={() => {
          fetchBrands()
            .then(({ data }) => setBrands(data || []))
            .catch(() => {});
        }}
      />
      <InboxPage
        user={authState.user}
        onLogout={() => { localStorage.removeItem('bd_token'); setAuthState({ loading: false, user: null }); }}
      />
    </>
  );
}

function WorkspaceSwitcher({ workspaces, onSelect }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', flexDirection: 'column', gap: 24,
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Select a workspace</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 300 }}>
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => onSelect(ws.id)}
            style={{
              padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
            }}
          >
            {ws.name}
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>
              {ws.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
