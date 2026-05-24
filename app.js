// ============================================================
//  SWIFTDROP — TAMALE DELIVERY DEMO
//  Real-time simulation with live counters, rider movement,
//  order flow, admin dashboard
// ============================================================

// ---- DEMO DATA ----
const RIDERS = [
  { id:1, name:'Issah Mohammed',   phone:'055-123-4567', plate:'GR-2847-21', status:'online',  rating:4.8, earnings:'GHS 412.50', deliveries:23 },
  { id:2, name:'Abdul Razak',      phone:'024-876-5432', plate:'GR-1102-20', status:'online',  rating:4.6, earnings:'GHS 287.00', deliveries:15 },
  { id:3, name:'Fuseini Alhassan', phone:'050-334-9921', plate:'GR-5589-22', status:'offline', rating:4.9, earnings:'GHS 561.00', deliveries:34 },
  { id:4, name:'Yakubu Dawuni',    phone:'027-445-3310', plate:'GR-0034-21', status:'online',  rating:4.5, earnings:'GHS 194.00', deliveries:12 },
  { id:5, name:'Sumaila Iddrisu',  phone:'026-881-2234', plate:'GR-7723-23', status:'online',  rating:4.7, earnings:'GHS 330.50', deliveries:19 },
  { id:6, name:'Baba Haruna',      phone:'059-003-6671', plate:'GR-4410-22', status:'offline', rating:4.4, earnings:'GHS 145.00', deliveries:9  }
];

const CUSTOMERS = [
  { name:'Sandra Amobea',  phone:'059-993-1348', orders:12, wallet:'GHS 48.50',  joined:'Jan 2025' },
  { name:'Amina Salifu',   phone:'024-112-8890', orders:7,  wallet:'GHS 120.00', joined:'Mar 2025' },
  { name:'Kofi Asante',    phone:'055-774-3312', orders:3,  wallet:'GHS 15.00',  joined:'Apr 2025' },
  { name:'Fatima Alidu',   phone:'026-557-0043', orders:18, wallet:'GHS 240.00', joined:'Oct 2024' },
  { name:'David Boateng',  phone:'050-228-6645', orders:5,  wallet:'GHS 67.50',  joined:'Feb 2025' },
];

const PLACES = [
  ['Central Market','Kaladan Estate'],
  ['Tamale Teaching Hospital','Gurugu'],
  ['Melcom Area','Choggu'],
  ['Ghana Post','Lamashegu'],
  ['Dillard Street','Savelugu Rd'],
  ['Zogbeli','Nyohini'],
  ['Aboabo','Vittin Camp'],
];

const PAYMENTS_DATA = [
  { date:'May 24', customer:'Sandra Amobea',  amount:'GHS 15.00', method:'MTN MoMo',   status:'done' },
  { date:'May 24', customer:'Amina Salifu',   amount:'GHS 8.50',  method:'Telecel Cash', status:'done' },
  { date:'May 23', customer:'Kofi Asante',    amount:'GHS 22.00', method:'MTN MoMo',   status:'done' },
  { date:'May 23', customer:'Fatima Alidu',   amount:'GHS 12.00', method:'Wallet',      status:'done' },
  { date:'May 22', customer:'David Boateng',  amount:'GHS 18.00', method:'MTN MoMo',   status:'done' },
];

// ---- LIVE STATS ----
const stats = { orders:124, riders:4, customers:38, revenue:2840 };

// ---- ORDER COUNTER ----
let orderStep = 0;
const riderSteps = ['Mark Picked Up','Mark In Transit','Mark Delivered','Order Complete ✓'];
const riderStepIds = [null,'rs2','rs3','rs4'];
let riderCurrentStep = 1;
let etaInterval = null;
let riderMoveInterval = null;
let statInterval = null;

// ============================================================
//  SPLASH
// ============================================================
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash').classList.add('out');
    setTimeout(() => {
      document.getElementById('splash').remove();
      document.getElementById('app').classList.remove('hidden');
    }, 500);
  }, 1800);
});

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  el.innerHTML = `${icons[type]||'ℹ️'} ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(60px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, duration);
}

// ============================================================
//  NAVIGATION
// ============================================================
function enterAs(role) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  const target = document.getElementById(`screen-${role}`);
  target.classList.remove('hidden');
  target.classList.add('active');

  if (role === 'admin') {
    initAdmin();
    startStatTicker();
  }
  if (role === 'customer') startRiderMovement();
  if (role === 'rider') {}

  toast(`Welcome to the ${role} view! 👋`, 'success');
}

function goBack() {
  clearAllIntervals();
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  document.getElementById('screen-role').classList.remove('hidden');
  document.getElementById('screen-role').classList.add('active');
}

function clearAllIntervals() {
  clearInterval(etaInterval);
  clearInterval(riderMoveInterval);
  clearInterval(statInterval);
}

// ============================================================
//  CUSTOMER APP
// ============================================================
let selectedCategory = 'Package';

function selectCat(el, cat) {
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selectedCategory = cat;
}

function custTab(tab, btn) {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const tabs = { home: renderCustomerHome, track: renderCustomerTrack, wallet: renderCustomerWallet, profile: renderCustomerProfile };
  if (tabs[tab]) tabs[tab]();
}

function renderCustomerHome() {
  document.getElementById('customer-body').innerHTML = document.getElementById('c-home')?.outerHTML || '';
}

function renderCustomerTrack() {
  document.getElementById('customer-body').innerHTML = `
    <div style="padding:20px">
      <h3 style="margin-bottom:16px;font-size:1rem">Track Your Order</h3>
      <div class="map-area" style="margin:0 0 16px;height:220px">
        <div class="map-bg"></div>
        <div class="map-label">📍 Live Tracking</div>
        <div class="rider-dot" id="track-rider" style="top:45%;left:38%;animation:riderMove 2s ease-in-out infinite alternate">
          <i class="fas fa-motorcycle"></i>
        </div>
        <div class="you-dot" style="top:65%;left:70%"><i class="fas fa-home" style="color:var(--green);font-size:1.2rem"></i></div>
        <svg class="route-svg" viewBox="0 0 300 200">
          <path d="M114,90 Q160,80 210,130" stroke="#6366f1" stroke-width="2" fill="none" stroke-dasharray="6,4"/>
        </svg>
      </div>
      <div class="active-order" style="margin:0;display:block">
        <div class="order-header">
          <span class="order-status-dot"></span>
          <strong>Rider on the way</strong>
          <span class="order-eta">ETA 3 min</span>
        </div>
        <div class="order-steps">
          <div class="step done"><i class="fas fa-check"></i> Order placed</div>
          <div class="step done"><i class="fas fa-check"></i> Rider assigned</div>
          <div class="step active"><i class="fas fa-circle"></i> In transit to you</div>
          <div class="step"><i class="fas fa-circle"></i> Delivered</div>
        </div>
      </div>
    </div>`;
}

function renderCustomerWallet() {
  document.getElementById('customer-body').innerHTML = `
    <div style="padding:20px">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:20px;padding:24px;color:#fff;margin-bottom:20px">
        <p style="opacity:.7;font-size:.8rem;margin-bottom:4px">Available Balance</p>
        <h2 style="font-size:2rem;font-weight:800">GHS 48.50</h2>
        <p style="opacity:.7;font-size:.75rem;margin-top:6px">Last top-up: GHS 50.00 · May 22</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        <button style="padding:14px;border-radius:14px;border:1.5px solid #6366f1;background:rgba(99,102,241,.08);color:#6366f1;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif" onclick="toast('Top-up via MTN MoMo opened!','info')">
          <i class="fas fa-plus"></i> Top Up
        </button>
        <button style="padding:14px;border-radius:14px;border:1.5px solid var(--border);background:#fff;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif" onclick="toast('Withdrawal requested!','success')">
          <i class="fas fa-arrow-up"></i> Withdraw
        </button>
      </div>
      <div class="section-title" style="padding:0 0 10px">Transaction History</div>
      ${[
        ['Delivery — Kaladan','−GHS 15.00','Today'],
        ['Delivery — Gurugu','−GHS 8.50','Yesterday'],
        ['Top-up (MTN MoMo)','+GHS 50.00','May 22'],
        ['Delivery — Melcom','−GHS 12.00','May 21'],
      ].map(([label,amount,date]) => `
        <div class="order-item" style="margin-bottom:10px">
          <div class="order-icon" style="background:${amount.startsWith('+') ? 'rgba(16,185,129,.1)' : 'rgba(99,102,241,.1)'}">
            <i class="fas ${amount.startsWith('+') ? 'fa-arrow-down' : 'fa-arrow-up'}" style="color:${amount.startsWith('+') ? 'var(--green)' : 'var(--primary)'}"></i>
          </div>
          <div class="order-info"><p>${label}</p><span>${date}</span></div>
          <strong style="color:${amount.startsWith('+') ? 'var(--green)' : 'var(--text)'};font-size:.88rem">${amount}</strong>
        </div>`).join('')}
    </div>`;
}

function renderCustomerProfile() {
  document.getElementById('customer-body').innerHTML = `
    <div style="padding:20px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.8rem;margin:0 auto 12px">
          <i class="fas fa-user"></i>
        </div>
        <h3 style="font-weight:700">Sandra Amobea</h3>
        <p style="color:var(--dim);font-size:.85rem">059-993-1348</p>
      </div>
      ${[['Total Orders','12'],['Deliveries Received','12'],['Money Spent','GHS 187.50'],['Member Since','Jan 2025']].map(([k,v]) => `
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--dim);font-size:.88rem">${k}</span>
          <strong style="font-size:.88rem">${v}</strong>
        </div>`).join('')}
      <button onclick="goBack()" style="width:100%;margin-top:20px;padding:14px;border-radius:14px;border:1.5px solid var(--border);background:transparent;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;color:var(--dim)">
        Switch Role
      </button>
    </div>`;
}

function placeOrder() {
  const active = document.getElementById('active-order');
  if (active) {
    active.classList.remove('hidden');
    toast(`🚀 Rider found! Issah M. is heading to pickup your ${selectedCategory}.`, 'success', 4000);
    startEtaCountdown();
    simulateOrderProgress();
  }
}

function startEtaCountdown() {
  let eta = 4;
  const el = document.getElementById('order-eta');
  clearInterval(etaInterval);
  etaInterval = setInterval(() => {
    if (eta <= 0) { clearInterval(etaInterval); return; }
    eta--;
    if (el) el.textContent = eta > 0 ? `ETA ${eta} min` : 'Arriving!';
  }, 8000);
}

function simulateOrderProgress() {
  setTimeout(() => {
    const p = document.getElementById('step-pickup');
    if (p) { p.classList.remove('active'); p.classList.add('done'); p.innerHTML='<i class="fas fa-check"></i> Rider picked up package'; }
    const t = document.getElementById('step-transit');
    if (t) t.classList.add('active');
    toast('📦 Package picked up! Rider is on the way.', 'info', 3500);
  }, 7000);
  setTimeout(() => {
    const t = document.getElementById('step-transit');
    if (t) { t.classList.remove('active'); t.classList.add('done'); t.innerHTML='<i class="fas fa-check"></i> In transit'; }
    const d = document.getElementById('step-done');
    if (d) d.classList.add('active');
    toast('🎉 Delivered! Rate your experience.', 'success', 4000);
  }, 14000);
}

function startRiderMovement() {
  const riders = document.querySelectorAll('.rider-dot');
  clearInterval(riderMoveInterval);
  riderMoveInterval = setInterval(() => {
    riders.forEach(r => {
      const top  = parseFloat(r.style.top)  + (Math.random() - 0.5) * 4;
      const left = parseFloat(r.style.left) + (Math.random() - 0.5) * 4;
      r.style.top  = Math.max(10, Math.min(80, top))  + '%';
      r.style.left = Math.max(10, Math.min(85, left)) + '%';
    });
  }, 2500);
}

// ============================================================
//  RIDER APP
// ============================================================
let isOnline = true;

function toggleOnline() {
  isOnline = !isOnline;
  const toggle = document.getElementById('online-toggle');
  const label  = document.getElementById('online-label');
  toggle.classList.toggle('offline', !isOnline);
  if (label) { label.textContent = isOnline ? 'ONLINE' : 'OFFLINE'; label.style.color = isOnline ? 'var(--green)' : 'var(--dim)'; }
  toast(isOnline ? '✅ You are now Online and accepting deliveries.' : '⏸ You are now Offline.', isOnline ? 'success' : 'warning');
}

function simulateRequest() {
  if (!isOnline) { toast('Go online first to receive requests!', 'warning'); return; }
  const req = document.getElementById('rider-request');
  req.classList.remove('hidden');
  toast('🔔 New delivery request incoming!', 'info');
}

function rejectRide() {
  document.getElementById('rider-request').classList.add('hidden');
  toast('Request rejected. Looking for next job…', 'warning');
}

function acceptRide() {
  document.getElementById('rider-request').classList.add('hidden');
  document.getElementById('rider-active').classList.remove('hidden');
  riderCurrentStep = 1;
  toast('✅ Delivery accepted! Head to pickup point.', 'success');
}

function riderNextStep() {
  const btn = document.getElementById('rider-next-btn');
  const stepEl = document.getElementById(riderStepIds[riderCurrentStep]);

  if (stepEl) { stepEl.classList.add('done'); stepEl.querySelector('i').className = 'fas fa-check-circle'; }
  riderCurrentStep++;

  if (riderCurrentStep < riderSteps.length) {
    if (btn) btn.innerHTML = `<i class="fas fa-check"></i> ${riderSteps[riderCurrentStep - 1]}`;
    toast(`Step ${riderCurrentStep} complete!`, 'success');
  } else {
    if (btn) { btn.innerHTML = '🎉 Delivery Complete!'; btn.disabled = true; btn.style.opacity = '.6'; }
    toast('🎉 Delivery completed! GHS 12.00 added to your wallet.', 'success', 5000);
    setTimeout(() => { document.getElementById('rider-active').classList.add('hidden'); riderCurrentStep = 1; if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerHTML = `<i class="fas fa-check"></i> Mark Picked Up`; } document.querySelectorAll('.rstep').forEach(s => { s.classList.remove('done','active'); s.querySelector('i').className = 'fas fa-circle'; }); }, 3000);
  }
}

// ============================================================
//  ADMIN DASHBOARD
// ============================================================
function initAdmin() {
  renderOrdersTable();
  renderAllOrders();
  renderRidersTable();
  renderCustomersTable();
  renderPaymentsTable();
  renderBarChart();
  animateStats();
}

function adminTab(tab, btn) {
  document.querySelectorAll('.snav').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
  const el = document.getElementById(`tab-${tab}`);
  if (el) { el.classList.add('active'); el.classList.remove('hidden'); }
  document.getElementById('admin-page-title').textContent =
    btn.textContent.trim();
}

function animateStats() {
  animateNum('s-orders',    0, stats.orders,    1400);
  animateNum('s-riders',    0, stats.riders,    800);
  animateNum('s-customers', 0, stats.customers, 1200);
  animateNum('s-revenue',   0, stats.revenue,   1600);
}

function animateNum(id, from, to, dur) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  const step = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = id === 's-revenue'
      ? Math.floor(from + (to - from) * easeOut(p)).toLocaleString()
      : Math.floor(from + (to - from) * easeOut(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function startStatTicker() {
  clearInterval(statInterval);
  statInterval = setInterval(() => {
    stats.orders++;
    const el = document.getElementById('s-orders');
    if (el) el.textContent = stats.orders;
    if (Math.random() > 0.7) {
      stats.revenue += Math.floor(Math.random() * 15 + 8);
      const rev = document.getElementById('s-revenue');
      if (rev) rev.textContent = stats.revenue.toLocaleString();
      addLiveOrderRow();
    }
  }, 5000);
}

function randomOrder() {
  const place = PLACES[Math.floor(Math.random() * PLACES.length)];
  const rider  = RIDERS.filter(r => r.status === 'online')[Math.floor(Math.random() * 3)];
  const cust   = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const price  = (Math.random() * 18 + 7).toFixed(2);
  const statuses = ['In Transit','In Transit','Pending','In Transit'];
  const st = statuses[Math.floor(Math.random() * statuses.length)];
  const id = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  return { id, customer: cust.name, rider: rider?.name || 'Searching…', from: place[0], to: place[1], amount:`GHS ${price}`, status: st };
}

let liveOrders = [];
function renderOrdersTable() {
  liveOrders = Array.from({length:6}, randomOrder);
  refreshOrdersTable('orders-table', liveOrders, true);
}

function addLiveOrderRow() {
  liveOrders.unshift(randomOrder());
  if (liveOrders.length > 10) liveOrders.pop();
  refreshOrdersTable('orders-table', liveOrders, true);
}

function refreshOrdersTable(tbodyId, orders, showStatus) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><code style="font-size:.78rem;color:var(--primary)">${o.id}</code></td>
      <td>${o.customer}</td>
      <td>${o.rider}</td>
      <td>${o.from}</td>
      <td>${o.to}</td>
      <td style="font-weight:700">${o.amount}</td>
      <td><span class="status-pill ${o.status==='Delivered'?'status-done':o.status==='Pending'?'status-pending':'status-transit'}">${o.status}</span></td>
    </tr>`).join('');
}

function renderAllOrders() {
  const all = Array.from({length:12}, () => ({ ...randomOrder(), status: ['Delivered','In Transit','Pending'][Math.floor(Math.random()*3)] }));
  const tbody = document.getElementById('all-orders-table');
  if (!tbody) return;
  tbody.innerHTML = all.map(o => `
    <tr>
      <td><code style="font-size:.78rem;color:var(--primary)">${o.id}</code></td>
      <td>${o.customer}</td>
      <td>${o.rider}</td>
      <td style="font-weight:700">${o.amount}</td>
      <td><span class="status-pill ${o.status==='Delivered'?'status-done':o.status==='Pending'?'status-pending':'status-transit'}">${o.status}</span></td>
      <td>
        <button class="btn-sm" onclick="toast('Order details opened.','info')">View</button>
      </td>
    </tr>`).join('');
}

function renderRidersTable() {
  const tbody = document.getElementById('riders-table');
  if (!tbody) return;
  tbody.innerHTML = RIDERS.map(r => `
    <tr>
      <td style="font-weight:600">${r.name}</td>
      <td style="font-size:.8rem;color:var(--dim)">${r.phone}</td>
      <td><code style="font-size:.78rem">${r.plate}</code></td>
      <td><span class="status-pill ${r.status==='online'?'status-online':'status-offline'}">${r.status}</span></td>
      <td>⭐ ${r.rating}</td>
      <td style="font-weight:700;color:var(--green)">${r.earnings}</td>
      <td style="display:flex;gap:6px">
        <button class="btn-sm" onclick="toast('${r.name} profile opened.','info')">View</button>
        <button class="btn-sm-red" onclick="toast('${r.name} suspended.','warning')">Suspend</button>
      </td>
    </tr>`).join('');
}

function renderCustomersTable() {
  const tbody = document.getElementById('customers-table');
  if (!tbody) return;
  tbody.innerHTML = CUSTOMERS.map(c => `
    <tr>
      <td style="font-weight:600">${c.name}</td>
      <td style="font-size:.8rem;color:var(--dim)">${c.phone}</td>
      <td style="font-weight:700;color:var(--primary)">${c.orders}</td>
      <td style="font-weight:700;color:var(--green)">${c.wallet}</td>
      <td style="font-size:.8rem;color:var(--dim)">${c.joined}</td>
      <td>
        <button class="btn-sm" onclick="toast('${c.name} profile opened.','info')">View</button>
      </td>
    </tr>`).join('');
}

function renderPaymentsTable() {
  const tbody = document.getElementById('payments-table');
  if (!tbody) return;
  tbody.innerHTML = PAYMENTS_DATA.map(p => `
    <tr>
      <td style="font-size:.8rem;color:var(--dim)">${p.date}</td>
      <td>${p.customer}</td>
      <td style="font-weight:700">${p.amount}</td>
      <td><span style="font-size:.8rem;color:var(--dim)">${p.method}</span></td>
      <td><span class="status-pill status-done">Completed</span></td>
    </tr>`).join('');
}

function renderBarChart() {
  const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const values = [14, 22, 18, 31, 26, 38, 19];
  const max    = Math.max(...values);
  const chart  = document.getElementById('bar-chart');
  if (!chart) return;
  chart.innerHTML = values.map((v, i) => `
    <div class="bar-wrap">
      <span class="bar-val">${v}</span>
      <div class="bar" style="height:${Math.round(v/max*120)}px" title="${days[i]}: ${v} deliveries"></div>
      <span class="bar-label">${days[i]}</span>
    </div>`).join('');
}
