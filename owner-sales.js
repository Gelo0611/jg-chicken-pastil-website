(() => {
  "use strict";

  const cfg = window.JG_LOCATION_CONFIG || {};
  const configured =
    typeof cfg.supabaseUrl === "string" &&
    typeof cfg.supabasePublishableKey === "string" &&
    cfg.supabaseUrl.startsWith("https://");

  const $ = (selector) => document.querySelector(selector);
  const dashboard = $("#dashboardPanel");
  const form = $("#dailySalesForm");

  if (!form) return;

  const SALES_PRODUCTS = {
    pastil: { name: "Pastil", price: 35, cost: 15 },
    jar: { name: "Jar", price: 195, cost: 100 },
    drinks: { name: "Drinks", price: 10, cost: 3 },
    rice: { name: "Rice", price: 15, cost: 3 },
    egg: { name: "Egg", price: 15, cost: 8 },
    tusok: { name: "Tusok-Tusok", price: 20, cost: 10 }
  };

  const dailySalesId = $("#dailySalesId");
  const dailySalesFormTitle = $("#dailySalesFormTitle");
  const salesDate = $("#salesDate");
  const qtyInputs = {
    pastil: $("#salesQtyPastil"),
    jar: $("#salesQtyJar"),
    drinks: $("#salesQtyDrinks"),
    rice: $("#salesQtyRice"),
    egg: $("#salesQtyEgg"),
    tusok: $("#salesQtyTusok")
  };
  const salesSalary = $("#salesSalary");
  const salesNotes = $("#salesNotes");
  const addExpenseButton = $("#addExpenseButton");
  const salesExpenseRows = $("#salesExpenseRows");
  const saveDailySalesButton = $("#saveDailySalesButton");
  const cancelDailySalesEditButton = $("#cancelDailySalesEditButton");
  const newSalesRecordButton = $("#newSalesRecordButton");
  const dailySalesStatus = $("#dailySalesStatus");

  const liveTotalSales = $("#liveTotalSales");
  const liveProductCost = $("#liveProductCost");
  const liveOtherExpenses = $("#liveOtherExpenses");
  const liveSalary = $("#liveSalary");
  const liveTotalCost = $("#liveTotalCost");
  const liveNetProfit = $("#liveNetProfit");

  const salesMonthFilter = $("#salesMonthFilter");
  const monthTotalSales = $("#monthTotalSales");
  const monthProductCost = $("#monthProductCost");
  const monthOperatingCosts = $("#monthOperatingCosts");
  const monthNetProfit = $("#monthNetProfit");
  const monthSalesChange = $("#monthSalesChange");
  const monthProfitChange = $("#monthProfitChange");
  const monthExpenseBreakdown = $("#monthExpenseBreakdown");

  const salesTrendChart = $("#salesTrendChart");
  const salesChartEmpty = $("#salesChartEmpty");
  const salesChartMonthLabel = $("#salesChartMonthLabel");
  const salesRecordsBody = $("#salesRecordsBody");
  const salesRecordsEmpty = $("#salesRecordsEmpty");
  const salesRecordCount = $("#salesRecordCount");

  let records = [];
  let expenseCounter = 0;
  let initialized = false;

  const base = () => cfg.supabaseUrl.replace(/\/+$/, "");
  const token = () => sessionStorage.getItem("jg-owner-access-token") || "";

  function setStatus(message, type = "") {
    dailySalesStatus.textContent = message;
    dailySalesStatus.className = `owner-status ${type}`.trim();
  }

  async function request(path, options = {}) {
    if (!configured) throw new Error("Supabase is not configured.");
    const accessToken = token();
    if (!accessToken) throw new Error("Please sign in again.");

    const response = await fetch(base() + path, {
      ...options,
      headers: {
        apikey: cfg.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const raw = await response.text();
    let body = null;

    if (raw) {
      try { body = JSON.parse(raw); }
      catch { body = raw; }
    }

    if (!response.ok) {
      throw new Error(
        body?.message ||
        body?.hint ||
        body?.details ||
        body?.error_description ||
        `Request failed (${response.status})`
      );
    }

    return body;
  }

  function money(value) {
    const number = Number(value) || 0;
    return `₱${number.toLocaleString("en-PH", {
      maximumFractionDigits: 2
    })}`;
  }

  function safeQty(value) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function safeMoney(value) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function isoDate(date = new Date()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function monthValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function previousMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return monthValue(d);
  }

  function monthLabel(month) {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("en-PH", {
      month: "long",
      year: "numeric"
    }).format(new Date(y, m - 1, 1));
  }

  function addExpenseRow(label = "", amount = "") {
    expenseCounter += 1;

    const row = document.createElement("div");
    row.className = "sales-expense-row";

    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 80;
    name.placeholder = "Expense name";
    name.value = label;
    name.dataset.expenseName = "";

    const amountWrap = document.createElement("div");
    amountWrap.className = "peso-input-wrap";

    const peso = document.createElement("span");
    peso.textContent = "₱";

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.min = "0";
    amountInput.step = "0.01";
    amountInput.placeholder = "0";
    amountInput.inputMode = "decimal";
    amountInput.value = amount;
    amountInput.dataset.expenseAmount = "";
    amountInput.addEventListener("input", updateLiveSummary);

    amountWrap.append(peso, amountInput);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "sales-expense-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove expense");
    remove.addEventListener("click", () => {
      row.remove();
      updateLiveSummary();
    });

    row.append(name, amountWrap, remove);
    salesExpenseRows.append(row);
  }

  function collectExpenses() {
    return [...salesExpenseRows.querySelectorAll(".sales-expense-row")]
      .map((row) => ({
        label: row.querySelector("[data-expense-name]")?.value.trim() || "",
        amount: safeMoney(row.querySelector("[data-expense-amount]")?.value)
      }))
      .filter((item) => item.label || item.amount > 0);
  }

  function calculateForm() {
    const quantities = Object.fromEntries(
      Object.entries(qtyInputs).map(([key, input]) => [key, safeQty(input.value)])
    );

    let sales = 0;
    let productCost = 0;

    Object.entries(quantities).forEach(([key, qty]) => {
      sales += qty * SALES_PRODUCTS[key].price;
      productCost += qty * SALES_PRODUCTS[key].cost;
    });

    const expenses = collectExpenses();
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const salary = safeMoney(salesSalary.value);
    const grossProfit = sales - productCost;
    const totalCost = productCost + expenseTotal + salary;
    const netProfit = sales - totalCost;

    return {
      quantities,
      expenses,
      sales,
      productCost,
      expenseTotal,
      salary,
      grossProfit,
      totalCost,
      netProfit
    };
  }

  function updateLiveSummary() {
    const t = calculateForm();
    liveTotalSales.textContent = money(t.sales);
    liveProductCost.textContent = money(t.productCost);
    liveOtherExpenses.textContent = money(t.expenseTotal);
    liveSalary.textContent = money(t.salary);
    liveTotalCost.textContent = money(t.totalCost);
    liveNetProfit.textContent = money(t.netProfit);
    liveNetProfit.classList.toggle("negative", t.netProfit < 0);
  }

  function resetForm() {
    dailySalesId.value = "";
    dailySalesFormTitle.textContent = "Record today's sales";
    saveDailySalesButton.textContent = "Save Daily Sales";
    salesDate.value = isoDate();

    Object.values(qtyInputs).forEach((input) => input.value = "0");
    salesSalary.value = "0";
    salesNotes.value = "";
    salesExpenseRows.innerHTML = "";
    addExpenseRow();
    setStatus("");
    updateLiveSummary();
  }

  function editRecord(record) {
    dailySalesId.value = record.id;
    dailySalesFormTitle.textContent = `Edit sales — ${record.sale_date}`;
    saveDailySalesButton.textContent = "Save Changes";
    salesDate.value = record.sale_date;

    qtyInputs.pastil.value = record.pastil_qty ?? 0;
    qtyInputs.jar.value = record.jar_qty ?? 0;
    qtyInputs.drinks.value = record.drinks_qty ?? 0;
    qtyInputs.rice.value = record.rice_qty ?? 0;
    qtyInputs.egg.value = record.egg_qty ?? 0;
    qtyInputs.tusok.value = record.tusok_qty ?? 0;

    salesSalary.value = record.employee_salary ?? 0;
    salesNotes.value = record.notes || "";

    salesExpenseRows.innerHTML = "";
    const expenses = Array.isArray(record.expenses) ? record.expenses : [];
    if (expenses.length) expenses.forEach((item) => addExpenseRow(item.label || "", item.amount ?? ""));
    else addExpenseRow();

    updateLiveSummary();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveRecord(event) {
    event.preventDefault();

    if (!salesDate.value) {
      setStatus("Please select a date.", "error");
      return;
    }

    const id = dailySalesId.value.trim();
    const t = calculateForm();

    const payload = {
      sale_date: salesDate.value,
      pastil_qty: t.quantities.pastil,
      jar_qty: t.quantities.jar,
      drinks_qty: t.quantities.drinks,
      rice_qty: t.quantities.rice,
      egg_qty: t.quantities.egg,
      tusok_qty: t.quantities.tusok,
      employee_salary: t.salary,
      expenses: t.expenses,
      other_expenses: t.expenseTotal,
      product_sales: t.sales,
      product_cost: t.productCost,
      gross_profit: t.grossProfit,
      total_cost: t.totalCost,
      net_profit: t.netProfit,
      notes: salesNotes.value.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      setStatus(id ? "Saving changes…" : "Saving daily sales…");

      if (id) {
        await request(`/rest/v1/daily_sales?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(payload)
        });
      } else {
        await request("/rest/v1/daily_sales", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(payload)
        });
      }

      const savedMonth = salesDate.value.slice(0, 7);
      await loadRecords();
      resetForm();
      salesMonthFilter.value = savedMonth;
      renderAnalytics();

      setStatus(id ? "Daily sales updated." : "Daily sales saved.", "success");
    } catch (error) {
      const msg = String(error.message || "");
      if (/duplicate|unique/i.test(msg)) {
        setStatus("A record already exists for this date. Edit that daily record instead.", "error");
      } else {
        setStatus(msg, "error");
      }
    }
  }

  async function deleteRecord(record) {
    if (!confirm(`Delete sales record for ${record.sale_date}?`)) return;

    try {
      await request(`/rest/v1/daily_sales?id=eq.${encodeURIComponent(record.id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });

      await loadRecords();
      renderAnalytics();
      setStatus("Daily sales record deleted.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  async function loadRecords() {
    records = (await request(
      "/rest/v1/daily_sales?select=*&order=sale_date.asc",
      { method: "GET" }
    )) || [];

    renderAnalytics();
  }

  function monthRecords(month) {
    return records.filter((r) => String(r.sale_date || "").startsWith(month));
  }

  function summarize(list) {
    return list.reduce((a, r) => {
      a.sales += Number(r.product_sales) || 0;
      a.productCost += Number(r.product_cost) || 0;
      a.expenses += Number(r.other_expenses) || 0;
      a.salary += Number(r.employee_salary) || 0;
      a.totalCost += Number(r.total_cost) || 0;
      a.profit += Number(r.net_profit) || 0;
      return a;
    }, { sales: 0, productCost: 0, expenses: 0, salary: 0, totalCost: 0, profit: 0 });
  }

  function change(current, previous) {
    current = Number(current) || 0;
    previous = Number(previous) || 0;

    if (previous === 0) {
      if (current === 0) return null;
      return { direction: "up", percent: 100, newBase: true };
    }

    const pct = ((current - previous) / Math.abs(previous)) * 100;
    return { direction: pct >= 0 ? "up" : "down", percent: Math.abs(pct), newBase: false };
  }

  function showChange(el, c, label) {
    el.className = "";

    if (!c) {
      el.textContent = `No previous-month ${label}`;
      return;
    }

    if (c.newBase) {
      el.textContent = `↑ New ${label} vs previous month`;
      el.classList.add("change-up");
      return;
    }

    el.textContent = `${c.direction === "up" ? "↑" : "↓"} ${c.percent.toFixed(1)}% vs previous month`;
    el.classList.add(c.direction === "up" ? "change-up" : "change-down");
  }

  function renderSummary(month, list) {
    const now = summarize(list);
    const prev = summarize(monthRecords(previousMonth(month)));

    monthTotalSales.textContent = money(now.sales);
    monthProductCost.textContent = money(now.productCost);
    monthOperatingCosts.textContent = money(now.expenses + now.salary);
    monthNetProfit.textContent = money(now.profit);
    monthNetProfit.classList.toggle("negative", now.profit < 0);

    monthExpenseBreakdown.textContent =
      `${money(now.expenses)} expenses • ${money(now.salary)} salary`;

    showChange(monthSalesChange, change(now.sales, prev.sales), "sales");
    showChange(monthProfitChange, change(now.profit, prev.profit), "profit");
  }

  function niceMax(value) {
    if (value <= 0) return 100;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
  }

  function renderChart(month, list) {
    salesTrendChart.innerHTML = "";
    salesChartMonthLabel.textContent = monthLabel(month);

    if (!list.length) {
      salesTrendChart.hidden = true;
      salesChartEmpty.hidden = false;
      return;
    }

    salesTrendChart.hidden = false;
    salesChartEmpty.hidden = true;

    const W = 760;
    const H = 330;
    const P = { l: 60, r: 24, t: 24, b: 48 };
    const plotW = W - P.l - P.r;
    const plotH = H - P.t - P.b;

    const maxValue = niceMax(Math.max(
      ...list.flatMap((r) => [Number(r.product_sales) || 0, Math.max(0, Number(r.net_profit) || 0)]),
      100
    ));

    const minProfit = Math.min(...list.map((r) => Number(r.net_profit) || 0), 0);
    const lower = minProfit < 0 ? Math.floor(minProfit / 100) * 100 : 0;
    const range = maxValue - lower || 1;

    const x = (i) => P.l + (list.length === 1 ? plotW / 2 : i / (list.length - 1) * plotW);
    const y = (v) => P.t + (maxValue - v) / range * plotH;

    const ns = "http://www.w3.org/2000/svg";
    const add = (tag, attrs = {}, text = "") => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
      if (text) node.textContent = text;
      salesTrendChart.append(node);
      return node;
    };

    for (let i = 0; i <= 5; i++) {
      const yy = P.t + i / 5 * plotH;
      const value = maxValue - (maxValue - lower) * i / 5;
      add("line", { x1: P.l, y1: yy, x2: W - P.r, y2: yy, class: "sales-chart-grid-line" });
      add("text", { x: P.l - 10, y: yy + 4, "text-anchor": "end", class: "sales-chart-y-label" }, money(Math.round(value)));
    }

    if (lower < 0) {
      const zy = y(0);
      add("line", { x1: P.l, y1: zy, x2: W - P.r, y2: zy, class: "sales-chart-zero-line" });
    }

    const salesPoints = [];
    const profitPoints = [];

    list.forEach((r, i) => {
      const xx = x(i);
      salesPoints.push(`${xx},${y(Number(r.product_sales) || 0)}`);
      profitPoints.push(`${xx},${y(Number(r.net_profit) || 0)}`);

      add("text", {
        x: xx,
        y: H - 20,
        "text-anchor": "middle",
        class: "sales-chart-x-label"
      }, String(r.sale_date).slice(8, 10));
    });

    add("polyline", { points: salesPoints.join(" "), class: "sales-chart-line sales-line" });
    add("polyline", { points: profitPoints.join(" "), class: "sales-chart-line profit-line" });

    list.forEach((r, i) => {
      const xx = x(i);
      const salesValue = Number(r.product_sales) || 0;
      const profitValue = Number(r.net_profit) || 0;

      const sp = add("circle", { cx: xx, cy: y(salesValue), r: 5, class: "sales-chart-point sales-point" });
      const st = document.createElementNS(ns, "title");
      st.textContent = `${r.sale_date}: Sales ${money(salesValue)}`;
      sp.append(st);

      const pp = add("circle", { cx: xx, cy: y(profitValue), r: 5, class: "sales-chart-point profit-point" });
      const pt = document.createElementNS(ns, "title");
      pt.textContent = `${r.sale_date}: Net Profit ${money(profitValue)}`;
      pp.append(pt);
    });
  }

  function renderTable(list) {
    salesRecordsBody.innerHTML = "";
    salesRecordCount.textContent = `${list.length} record${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
      salesRecordsEmpty.hidden = false;
      return;
    }

    salesRecordsEmpty.hidden = true;

    [...list].reverse().forEach((record) => {
      const tr = document.createElement("tr");

      const cells = [
        record.sale_date,
        money(record.product_sales),
        money(record.total_cost),
        money(record.net_profit)
      ].map((text, index) => {
        const td = document.createElement("td");
        td.textContent = text;
        if (index === 3) td.className = Number(record.net_profit) < 0 ? "negative-profit" : "positive-profit";
        return td;
      });

      const actions = document.createElement("td");
      actions.className = "sales-record-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "owner-link-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editRecord(record));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "owner-link-button danger";
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteRecord(record));

      actions.append(edit, del);
      tr.append(...cells, actions);
      salesRecordsBody.append(tr);
    });
  }

  function renderAnalytics() {
    const month = salesMonthFilter.value || monthValue();
    if (!salesMonthFilter.value) salesMonthFilter.value = month;

    const list = monthRecords(month).sort((a, b) =>
      String(a.sale_date).localeCompare(String(b.sale_date))
    );

    renderSummary(month, list);
    renderChart(month, list);
    renderTable(list);
  }

  async function initialize() {
    if (initialized || !token()) return;
    initialized = true;

    salesMonthFilter.value = monthValue();
    resetForm();

    try {
      await loadRecords();
    } catch (error) {
      initialized = false;
      setStatus(
        "Sales tracker database is not ready yet. Run supabase-v7-sales-upgrade.sql first.",
        "error"
      );
    }
  }

  Object.values(qtyInputs).forEach((input) => input.addEventListener("input", updateLiveSummary));
  salesSalary.addEventListener("input", updateLiveSummary);
  addExpenseButton.addEventListener("click", () => addExpenseRow());
  form.addEventListener("submit", saveRecord);
  cancelDailySalesEditButton.addEventListener("click", resetForm);
  newSalesRecordButton.addEventListener("click", () => {
    resetForm();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  salesMonthFilter.addEventListener("change", renderAnalytics);

  // Owner login is handled by owner-location.js.
  // Watch for the authenticated dashboard becoming visible.
  const observer = new MutationObserver(() => {
    if (dashboard && !dashboard.hidden && token()) initialize();
    if (dashboard?.hidden) initialized = false;
  });

  if (dashboard) {
    observer.observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
  }

  if (dashboard && !dashboard.hidden && token()) initialize();
  else resetForm();
})();
