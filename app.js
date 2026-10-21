/* Referral Engine v1 — personal codes, links, QR, rewards. Offline-first, localStorage. */
(function () {
  'use strict';
  var KEY = 'mfref_v1';
  var HQ_KEY = 'mfhq_v1';
  var REF_BASE = 'https://aldojjriveron02.github.io/miami-fixes-referrals/ref.html';

  function uid(p) { return p + Math.random().toString(36).slice(2, 9); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function todayStr() { var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDate(ds) { if (!ds) return '—';
    var p = ds.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function genCode(name, existing) {
    var base = String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'GUEST';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var code;
    do {
      var tail = '';
      for (var i = 0; i < 3; i++) tail += chars[Math.floor(Math.random() * chars.length)];
      code = base + '-' + tail;
    } while (existing && existing.indexOf(code) !== -1);
    return code;
  }
  function allCodes() { return DB.customers.map(function (c) { return c.code; }); }

  function seed() {
    var code = genCode('Steave', []);
    return {
      customers: [{ id: uid('c'), name: 'Steave', phone: '(305) 490-5626', code: code }],
      referrals: [],
      settings: { businessPhone: '7869297074', reward: 25 }
    };
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    var s = seed(); save(s); return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { toast('Storage full — delete something!'); } }
  var DB = load();
  function persist() { save(DB); }

  var screen = document.getElementById('screen');
  function toast(msg) { var t = document.getElementById('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.add('hidden'); }, 2200); }
  function openSheet(html) {
    document.getElementById('sheet-body').innerHTML = html;
    document.getElementById('sheet').classList.remove('hidden');
    document.getElementById('sheet-backdrop').classList.remove('hidden');
  }
  function closeSheet() {
    document.getElementById('sheet').classList.add('hidden');
    document.getElementById('sheet-backdrop').classList.add('hidden');
  }
  document.getElementById('sheet-backdrop').addEventListener('click', closeSheet);

  var tabBtns = document.querySelectorAll('#tabs button');
  tabBtns.forEach(function (b) { b.addEventListener('click', function () {
    tabBtns.forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active'); render(b.dataset.tab);
  }); });
  document.getElementById('today-line').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function render(tab) {
    window.scrollTo(0, 0);
    if (tab === 'dashboard') renderDashboard();
    else if (tab === 'customers') renderCustomers();
    else renderReferrals();
  }
  function currentTab() { var a = document.querySelector('#tabs button.active'); return a ? a.dataset.tab : 'dashboard'; }

  function refURL(c) {
    return REF_BASE + '?c=' + encodeURIComponent(c.code) +
      '&n=' + encodeURIComponent(c.name) +
      '&p=' + encodeURIComponent(DB.settings.businessPhone || '');
  }
  function inviteText(c) {
    return 'Hey ' + c.name + '! Aldo from Miami Fixes \uD83D\uDD27 — got a neighbor who needs a handyman? ' +
      'Send them your personal link, you BOTH get $25 off: ' + refURL(c);
  }
  function custByCode(code) { return DB.customers.find(function (c) { return c.code === code; }); }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    var total = DB.referrals.length;
    var won = DB.referrals.filter(function (r) { return r.status === 'won'; }).length;
    var owedN = DB.referrals.filter(function (r) { return r.status === 'won' && !r.rewarded; }).length;
    var owed = owedN * (Number(DB.settings.reward) || 0);
    var h = '<div class="section-title">At a glance</div>';
    h += '<div class="card"><div class="row"><span>Total referrals</span><b>' + total + '</b></div>' +
      '<div class="row"><span>Jobs won</span><b>' + won + '</b></div>' +
      '<div class="row"><span>Rewards owed</span><b class="money">' + money(owed) + '</b></div></div>';
    h += '<button class="btn" onclick="MF.importHQ()">⬇ Import customers from HQ</button>';
    h += '<button class="btn secondary" onclick="MF.settingsSheet()">⚙️ Settings</button>';
    screen.innerHTML = h;
  }

  /* ---------- Customers ---------- */
  function renderCustomers() {
    var h = '<button class="btn" onclick="MF.newCustomer()">+ Add customer</button>';
    var sorted = DB.customers.slice().sort(function (a, b) {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
    h += sorted.length ? sorted.map(function (c) {
      var tel = digits(c.phone);
      var url = refURL(c);
      return '<div class="card"><h3>' + esc(c.name) + '</h3>' +
        (c.phone ? '<div><a class="tel" href="tel:' + esc(tel) + '">' + esc(c.phone) + '</a></div>' : '') +
        '<div style="margin:8px 0"><span class="code">' + esc(c.code) + '</span></div>' +
        '<div class="btn-row">' +
        '<a class="btn small" style="text-decoration:none" href="sms:' + esc(tel) + '?&body=' +
          encodeURIComponent(inviteText(c)) + '">📩 Text invite</a>' +
        '<button class="btn small secondary" onclick="MF.qrSheet(\'' + c.id + '\')">🔳 QR</button>' +
        '<button class="btn small secondary" onclick="MF.copyLink(\'' + c.id + '\')">🔗 Copy link</button>' +
        '</div></div>';
    }).join('') : '<div class="card muted">No customers yet.</div>';
    screen.innerHTML = h;
  }

  function customerForm() {
    openSheet('<h2>New customer</h2>' +
      field('Name', inp('f_name', '', 'Full name')) +
      field('Phone', inp('f_phone', '', '(305) 555-0100', 'tel')) +
      '<div class="btn-row"><button class="btn" onclick="MF.saveCustomer()">Save</button></div>' +
      '<button class="btn secondary" onclick="MF.close()">Cancel</button>');
  }

  /* ---------- Referrals ---------- */
  function renderReferrals() {
    var h = '<button class="btn" onclick="MF.logReferral()">+ Log referral</button>';
    var sorted = DB.referrals.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    h += sorted.length ? sorted.map(function (r) {
      var ref = custByCode(r.referrerCode);
      var tel = digits(r.neighborPhone);
      var card = '<div class="card"><div class="row"><h3>' + esc(r.neighborName || 'Neighbor') + '</h3>' +
        '<span class="pill ' + r.status + '">' + r.status + '</span></div>' +
        (r.neighborPhone ? '<div><a class="tel" href="tel:' + esc(tel) + '">' + esc(r.neighborPhone) + '</a></div>' : '') +
        '<div class="muted">referred by ' + esc(ref ? ref.name : '—') + ' (' + esc(r.referrerCode || '') + ') - ' + fmtDate(r.date) + '</div>';
      if (r.status === 'won') {
        card += '<div class="muted">' + (r.rewarded ? '🎁 Reward given' : '🎁 Reward owed: ' + money(DB.settings.reward)) + '</div>';
      }
      card += '<div class="btn-row">';
      if (r.status === 'lead') {
        card += '<button class="btn small" onclick="MF.setStatus(\'' + r.id + '\',\'won\')">✓ Won</button>' +
          '<button class="btn small secondary" onclick="MF.setStatus(\'' + r.id + '\',\'lost\')">✗ Lost</button>';
      } else if (r.status === 'won') {
        card += '<button class="btn small secondary" onclick="MF.toggleReward(\'' + r.id + '\')">' +
          (r.rewarded ? '↩ Undo reward' : '🎁 Reward given') + '</button>';
      }
      card += '</div></div>';
      return card;
    }).join('') : '<div class="card muted">No referrals logged yet.</div>';
    screen.innerHTML = h;
  }

  function referralForm() {
    if (!DB.customers.length) { toast('Add a customer first'); return; }
    var opts = DB.customers.map(function (c) {
      return '<option value="' + esc(c.code) + '">' + esc(c.name) + ' (' + esc(c.code) + ')</option>'; }).join('');
    openSheet('<h2>Log referral</h2>' +
      field('Neighbor name', inp('f_nname', '', 'Neighbor name')) +
      field('Neighbor phone', inp('f_nphone', '', '(305) 555-0100', 'tel')) +
      field('Referred by', '<select id="f_ref">' + opts + '</select>') +
      field('Date', inp('f_date', todayStr(), '', 'date')) +
      '<div class="btn-row"><button class="btn" onclick="MF.saveReferral()">Save</button></div>' +
      '<button class="btn secondary" onclick="MF.close()">Cancel</button>');
  }

  /* ---------- forms helpers ---------- */
  function field(label, inner) { return '<label>' + label + '</label>' + inner; }
  function inp(id, val, ph, type) {
    return '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') +
      '" placeholder="' + esc(ph || '') + '">'; }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  window.MF = {
    close: closeSheet,
    newCustomer: customerForm,
    saveCustomer: function () {
      var name = val('f_name'); if (!name) { toast('Give the customer a name'); return; }
      var phone = val('f_phone');
      var c = { id: uid('c'), name: name, phone: phone, code: genCode(name, allCodes()) };
      DB.customers.push(c);
      persist(); closeSheet(); render(currentTab()); toast('Customer added — ' + c.code);
    },
    qrSheet: function (id) {
      var c = DB.customers.find(function (x) { return x.id === id; }); if (!c) return;
      var url = refURL(c);
      var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url);
      openSheet('<h2>' + esc(c.name) + '</h2>' +
        '<div class="qr-wrap"><img src="' + esc(qr) + '" alt="Referral QR code" width="220" height="220"></div>' +
        '<div class="link-box">' + esc(url) + '</div>' +
        '<button class="btn secondary" onclick="MF.copyLink(\'' + c.id + '\')">🔗 Copy link</button>' +
        '<button class="btn secondary" onclick="MF.close()">Close</button>');
    },
    copyLink: function (id) {
      var c = DB.customers.find(function (x) { return x.id === id; }); if (!c) return;
      var url = refURL(c);
      function done() { toast('Link copied'); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { toast('Could not copy'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('Could not copy'); }
        document.body.removeChild(ta);
      }
    },
    importHQ: function () {
      var added = 0;
      try {
        var raw = localStorage.getItem(HQ_KEY);
        if (!raw) { toast('No HQ data on this phone'); return; }
        var hq = JSON.parse(raw);
        var have = {};
        DB.customers.forEach(function (c) { have[c.name.toLowerCase()] = 1; });
        (hq.customers || []).forEach(function (hc) {
          if (!hc.name || have[String(hc.name).toLowerCase()]) return;
          DB.customers.push({ id: uid('c'), name: hc.name, phone: hc.phone || '',
            code: genCode(hc.name, allCodes()) });
          have[String(hc.name).toLowerCase()] = 1;
          added++;
        });
      } catch (e) { toast('Could not read HQ data'); return; }
      persist(); render(currentTab());
      toast(added ? added + ' customer' + (added === 1 ? '' : 's') + ' imported' : 'Everyone is already here');
    },
    settingsSheet: function () {
      openSheet('<h2>Settings</h2>' +
        field('Business phone (digits)', inp('f_bphone', DB.settings.businessPhone, '7869297074', 'tel')) +
        field('Referral reward ($)', inp('f_reward', DB.settings.reward, '25', 'number')) +
        '<div class="btn-row"><button class="btn" onclick="MF.saveSettings()">Save</button></div>' +
        '<button class="btn secondary" onclick="MF.close()">Cancel</button>');
    },
    saveSettings: function () {
      var p = digits(val('f_bphone')); if (!p) { toast('Enter the business phone'); return; }
      DB.settings.businessPhone = p;
      DB.settings.reward = Number(val('f_reward')) || 0;
      persist(); closeSheet(); render(currentTab()); toast('Settings saved');
    },
    logReferral: referralForm,
    saveReferral: function () {
      var name = val('f_nname'); if (!name) { toast('Give the neighbor a name'); return; }
      var r = { id: uid('r'), neighborName: name, neighborPhone: val('f_nphone'),
        referrerCode: val('f_ref'), date: val('f_date') || todayStr(),
        status: 'lead', rewarded: false };
      DB.referrals.push(r);
      persist(); closeSheet(); render(currentTab()); toast('Referral logged');
    },
    setStatus: function (id, st) {
      var r = DB.referrals.find(function (x) { return x.id === id; }); if (!r) return;
      r.status = st;
      persist(); render(currentTab()); toast(st === 'won' ? 'Nice — job won!' : 'Marked lost');
    },
    toggleReward: function (id) {
      var r = DB.referrals.find(function (x) { return x.id === id; }); if (!r) return;
      r.rewarded = !r.rewarded;
      persist(); render(currentTab()); toast(r.rewarded ? 'Reward marked as given' : 'Reward marked as owed');
    }
  };

  render('dashboard');
})();
