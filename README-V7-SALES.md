# J&G Chicken Pastil V7 — Daily Sales Tracker

## Product audit basis
- Pastil: Selling ₱35 / Cost ₱15
- Jar: Selling ₱195 / Cost ₱100
- Drinks: Selling ₱10 / Cost ₱3
- Rice: Selling ₱15 / Cost ₱3
- Egg: Selling ₱15 / Cost ₱8
- Tusok-Tusok: Selling ₱20 / Cost ₱10

## Combo audit guide
- Value Meal = Pastil 1 + Drinks 1
- Busog Meal = Pastil 1 + Egg 1
- Premium Meal = Pastil 1 + Egg 1 + Drinks 1
- Extra Busog = Pastil 1 + Rice 1

## Calculations
Total Sales = sum(quantity × selling price)
Product Cost = sum(quantity × unit cost)
Gross Profit = Total Sales - Product Cost
Total Cost = Product Cost + Other Expenses + Staff Salary
Net Profit = Total Sales - Total Cost

## New features
- Daily per-product sales entry
- Variable staff salary per day
- Multiple expense entries per day
- Live daily totals
- Edit/delete daily records
- Filter by month
- Monthly sales summary
- Monthly product cost
- Monthly expenses + salary
- Monthly net profit
- Sales/profit change vs previous month
- Daily Sales vs Net Profit graph

## One-time Supabase setup
1. Open `supabase-v7-sales-upgrade.sql`
2. Replace every `YOUR_OWNER_EMAIL`
3. Supabase → SQL Editor → New Query
4. Paste the entire SQL
5. Run it once
6. Deploy the updated website files

## Files changed/added
- owner-location.html
- owner-location.css
- owner-sales.js (new)
- supabase-v7-sales-upgrade.sql (setup only)

The rest of the included files are carried forward from your latest V6 website.
