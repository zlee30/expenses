// ============================================================
//  EXPENSES APP — app.js
//  Handles: localStorage, rendering, chart, form, modal, toast
// ============================================================


// ── CATEGORY COLOUR PALETTE ──────────────────────────────────
// Each unique category gets a colour from this list, in order.

const PALETTE = [
  '#c8f55a', '#ff7eb9', '#6ac8f5', '#ffc04a', '#a78bfa',
  '#34d399', '#f87171', '#38bdf8', '#fb923c', '#e879f9',
  '#4ade80', '#facc15', '#60a5fa', '#f472b6', '#a3e635'
];

// Returns a consistent colour for a given category name.
function getCatColor(category) {
  const allCats = getAllCategories();
  const index   = allCats.indexOf(category);
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

// Returns every category that has ever been used, across all months.
function getAllCategories() {
  const seen = {};
  Object.values(loadAllData()).forEach(entries => {
    entries.forEach(e => { seen[e.category] = true; });
  });
  return Object.keys(seen);
}


// ── STATE ────────────────────────────────────────────────────

let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0 = January
let pieChart     = null; // holds the Chart.js instance


// ── LOCALSTORAGE HELPERS ─────────────────────────────────────
// All expenses are stored under one key: 'expenses_all'
// The value is an object where each key is a month string
// like "expenses_2026_5" and the value is an array of entries.

function storageKey() {
  return `expenses_${currentYear}_${currentMonth}`;
}

function budgetKey() {
  return `budget_${currentYear}_${currentMonth}`;
}

function loadAllData() {
  try {
    return JSON.parse(localStorage.getItem('expenses_all') || '{}');
  } catch {
    return {};
  }
}

function saveAllData(data) {
  localStorage.setItem('expenses_all', JSON.stringify(data));
}

function getEntries() {
  return loadAllData()[storageKey()] || [];
}

function saveEntries(entries) {
  const data = loadAllData();
  data[storageKey()] = entries;
  saveAllData(data);
}

function getBudget() {
  return parseFloat(localStorage.getItem(budgetKey()) || '0');
}

function saveBudget(value) {
  localStorage.setItem(budgetKey(), value);
}


// ── MONTH NAVIGATION ─────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March',     'April',   'May',      'June',
  'July',    'August',   'September', 'October', 'November', 'December'
];

function changeMonth(direction) {
  currentMonth += direction;
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  render();
}


// ── CATEGORY SELECT ──────────────────────────────────────────

function handleCategoryChange() {
  const select    = document.getElementById('inputCategory');
  const customBox = document.getElementById('inputCustomCat');

  if (select.value === '__custom__') {
    customBox.style.display = 'block';
    customBox.focus();
  } else {
    customBox.style.display = 'none';
    customBox.value = '';
  }
}

function getSelectedCategory() {
  const select = document.getElementById('inputCategory');
  if (select.value === '__custom__') {
    return document.getElementById('inputCustomCat').value.trim() || null;
  }
  return select.value;
}


// ── ADD EXPENSE ──────────────────────────────────────────────

function addExpense() {
  const amount   = parseFloat(document.getElementById('inputAmount').value);
  const category = getSelectedCategory();
  const note     = document.getElementById('inputNote').value.trim();

  // Basic validation
  if (!amount || isNaN(amount) || amount <= 0) {
    showToast('Enter a valid amount');
    return;
  }
  if (!category) {
    showToast('Enter a category name');
    return;
  }

  // Build the entry object
  const entry = {
    id:       Date.now(),      // unique ID = timestamp
    amount:   amount,
    category: category,
    note:     note,
    date:     new Date().toISOString()
  };

  // Prepend so newest entries appear at the top
  const entries = getEntries();
  entries.unshift(entry);
  saveEntries(entries);

  // Reset the form
  document.getElementById('inputAmount').value    = '';
  document.getElementById('inputNote').value      = '';
  document.getElementById('inputCategory').value  = 'Food';
  document.getElementById('inputCustomCat').style.display = 'none';
  document.getElementById('inputCustomCat').value = '';

  showToast('Expense added');
  render();
}


// ── DELETE EXPENSE ───────────────────────────────────────────

function deleteExpense(id) {
  const updated = getEntries().filter(e => e.id !== id);
  saveEntries(updated);
  render();
}


// ── BUDGET MODAL ─────────────────────────────────────────────

function openBudgetModal() {
  const current = getBudget();
  document.getElementById('budgetInput').value = current || '';
  document.getElementById('budgetModal').classList.add('open');
  setTimeout(() => document.getElementById('budgetInput').focus(), 50);
}

function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('open');
}

function handleSaveBudget() {
  const value = parseFloat(document.getElementById('budgetInput').value);
  if (!isNaN(value) && value >= 0) {
    saveBudget(value);
    showToast('Budget saved');
    render();
  }
  closeBudgetModal();
}


// ── TOAST ────────────────────────────────────────────────────

let toastTimer = null;

function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}


// ── FORMATTING HELPERS ───────────────────────────────────────

function formatBD(amount) {
  return 'BD ' + amount.toFixed(3);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ── MAIN RENDER ──────────────────────────────────────────────
// Called on page load and after every change.

function render() {
  // Update month label in the nav
  document.getElementById('monthLabel').textContent =
    MONTH_NAMES[currentMonth] + ' ' + currentYear;

  const entries   = getEntries();
  const budget    = getBudget();
  const total     = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - total;
  const pct       = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  // ── Metric cards ──
  document.getElementById('metricSpent').textContent = formatBD(total);
  document.getElementById('metricCount').textContent = entries.length;

  const remainingEl = document.getElementById('metricRemaining');
  if (budget === 0) {
    remainingEl.textContent = '—';
    remainingEl.className   = 'metric-value';
  } else {
    remainingEl.textContent = formatBD(Math.abs(remaining));
    remainingEl.className   = 'metric-value ' +
      (remaining < 0 ? 'red' : remaining < budget * 0.15 ? 'amber' : 'green');
  }

  // ── Budget progress bar ──
  document.getElementById('budgetUsedLabel').textContent =
    budget > 0
      ? formatBD(total) + ' of ' + formatBD(budget)
      : 'No budget set';

  document.getElementById('budgetPct').textContent =
    budget > 0 ? Math.round(pct) + '%' : '';

  const fillEl = document.getElementById('budgetFill');
  fillEl.style.width = pct + '%';
  fillEl.className   = 'budget-fill' +
    (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');

  // ── Entries count badge ──
  document.getElementById('entriesCount').textContent =
    entries.length + (entries.length === 1 ? ' entry' : ' entries');

  // ── Category totals (used by chart + legend) ──
  const catTotals = {};
  entries.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  // Sort categories by spend, highest first
  const cats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  // ── Render sub-sections ──
  renderChart(cats, catTotals, total);
  renderLegend(cats, catTotals, total);
  renderEntries(entries);
}


// ── CHART ────────────────────────────────────────────────────

function renderChart(cats, catTotals, total) {
  const canvas = document.getElementById('pieChart');
  const empty  = document.getElementById('emptyChart');

  if (cats.length === 0) {
    canvas.style.display = 'none';
    empty.style.display  = 'flex';
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    return;
  }

  canvas.style.display = 'block';
  empty.style.display  = 'none';

  const data   = cats.map(c => catTotals[c]);
  const colors = cats.map(c => getCatColor(c));

  if (pieChart) {
    // Update existing chart instead of rebuilding it
    pieChart.data.labels                        = cats;
    pieChart.data.datasets[0].data             = data;
    pieChart.data.datasets[0].backgroundColor  = colors;
    pieChart.update();
  } else {
    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: cats,
        datasets: [{
          data:            data,
          backgroundColor: colors,
          borderWidth:     3,
          borderColor:     '#18181c',
          hoverBorderColor:'#18181c'
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx =>
                ' ' + formatBD(ctx.raw) +
                '  (' + Math.round((ctx.raw / (total || 1)) * 100) + '%)'
            },
            backgroundColor: '#222228',
            borderColor:     'rgba(255,255,255,0.1)',
            borderWidth:     1,
            titleColor:      '#f0eff4',
            bodyColor:       '#c8f55a',
            padding:         10
          }
        }
      }
    });
  }
}


// ── LEGEND ───────────────────────────────────────────────────

function renderLegend(cats, catTotals, total) {
  const el = document.getElementById('chartLegend');

  if (cats.length === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = cats.map(cat => {
    const pct   = total > 0 ? Math.round((catTotals[cat] / total) * 100) : 0;
    const color = getCatColor(cat);
    return `
      <div class="legend-row">
        <div class="legend-left">
          <span class="legend-dot" style="background: ${color};"></span>
          <span class="legend-name">${escapeHtml(cat)}</span>
        </div>
        <div class="legend-right">
          <span class="legend-pct">${pct}%</span>
          <span class="legend-amt">${formatBD(catTotals[cat])}</span>
        </div>
      </div>`;
  }).join('');
}


// ── ENTRIES LIST ─────────────────────────────────────────────

function renderEntries(entries) {
  const el = document.getElementById('entriesList');

  if (entries.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="big">◎</div>
        No expenses recorded for this month
      </div>`;
    return;
  }

  el.innerHTML = entries.map(entry => {
    const color = getCatColor(entry.category);
    return `
      <div class="entry-row">
        <span class="entry-cat-dot" style="background: ${color};"></span>
        <div class="entry-info">
          <div class="entry-name">${escapeHtml(entry.category)}</div>
          ${entry.note ? `<div class="entry-note">${escapeHtml(entry.note)}</div>` : ''}
        </div>
        <div class="entry-right">
          <span class="entry-date">${formatDate(entry.date)}</span>
          <span class="entry-amount">${formatBD(entry.amount)}</span>
          <button class="entry-del" onclick="deleteExpense(${entry.id})" aria-label="Delete entry" title="Delete">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}


// ── EVENT LISTENERS ──────────────────────────────────────────

// Month navigation
document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));

// Add expense button
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);

// Category dropdown change
document.getElementById('inputCategory').addEventListener('change', handleCategoryChange);

// Budget modal open/close/save
document.getElementById('openBudgetBtn').addEventListener('click', openBudgetModal);
document.getElementById('cancelBudgetBtn').addEventListener('click', closeBudgetModal);
document.getElementById('saveBudgetBtn').addEventListener('click', handleSaveBudget);

// Close modal by clicking the dark overlay behind it
document.getElementById('budgetModal').addEventListener('click', function(e) {
  if (e.target === this) closeBudgetModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Enter to add expense from any form field
  const formFields = ['inputAmount', 'inputNote', 'inputCustomCat'];
  if (e.key === 'Enter' && formFields.includes(document.activeElement.id)) {
    addExpense();
  }
  // Enter to save budget from budget input
  if (e.key === 'Enter' && document.activeElement.id === 'budgetInput') {
    handleSaveBudget();
  }
  // Escape to close modal
  if (e.key === 'Escape') {
    closeBudgetModal();
  }
});


// ── BOOT ─────────────────────────────────────────────────────
// Run render once when the page first loads.

render();
