export default { async fetch(request, env) {
  const url = new URL(request.url); const path = url.pathname;
  const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'}});
  if (request.method === 'OPTIONS') return new Response('', {headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'content-type'}});
  try {
    if (path === '/api/health') return json({ok:true, app:'مسارات ERP'});
    if (path === '/api/dashboard') {
      const [sales, purchases, expenses, customers, products, receivables] = await Promise.all([
        env.DB.prepare("SELECT COALESCE(SUM(total),0) v FROM invoices WHERE type='sale'").first(),
        env.DB.prepare("SELECT COALESCE(SUM(total),0) v FROM invoices WHERE type='purchase'").first(),
        env.DB.prepare("SELECT COALESCE(SUM(amount+tax),0) v FROM expenses").first(),
        env.DB.prepare("SELECT COUNT(*) v FROM customers").first(),
        env.DB.prepare("SELECT COUNT(*) v FROM products WHERE active=1").first(),
        env.DB.prepare("SELECT COALESCE(SUM(total-paid),0) v FROM invoices WHERE type='sale'").first()
      ]); return json({sales:sales.v,purchases:purchases.v,expenses:expenses.v,customers:customers.v,products:products.v,receivables:receivables.v});
    }
    if (path === '/api/customers' && request.method==='GET') return json((await env.DB.prepare('SELECT * FROM customers ORDER BY id DESC').all()).results);
    if (path === '/api/products' && request.method==='GET') return json((await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all()).results);
    if (path === '/api/invoices' && request.method==='GET') return json((await env.DB.prepare('SELECT i.*, c.name customer_name FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id ORDER BY date DESC,id DESC LIMIT 100').all()).results);
    if (path === '/api/expenses' && request.method==='GET') return json((await env.DB.prepare('SELECT * FROM expenses ORDER BY date DESC,id DESC LIMIT 100').all()).results);
    if (path === '/api/journal' && request.method==='GET') return json((await env.DB.prepare('SELECT j.*, COALESCE(SUM(l.debit),0) debit, COALESCE(SUM(l.credit),0) credit FROM journal_entries j LEFT JOIN journal_lines l ON l.entry_id=j.id GROUP BY j.id ORDER BY date DESC,id DESC LIMIT 100').all()).results);
    if (path === '/api/customers' && request.method==='POST') { const b=await request.json(); const r=await env.DB.prepare('INSERT INTO customers(code,name,phone,tax_no,opening_balance,notes) VALUES(?,?,?,?,?,?)').bind(b.code||null,b.name,b.phone||'',b.tax_no||'',Number(b.opening_balance||0),b.notes||'').run(); return json({id:r.meta.last_row_id}); }
    if (path === '/api/products' && request.method==='POST') { const b=await request.json(); const r=await env.DB.prepare('INSERT INTO products(sku,name,unit,sale_price,purchase_price,tax_rate,stock,min_stock) VALUES(?,?,?,?,?,?,?,?)').bind(b.sku||null,b.name,b.unit||'قطعة',Number(b.sale_price||0),Number(b.purchase_price||0),Number(b.tax_rate??15),Number(b.stock||0),Number(b.min_stock||0)).run(); return json({id:r.meta.last_row_id}); }
    if (path === '/api/expenses' && request.method==='POST') { const b=await request.json(); const r=await env.DB.prepare('INSERT INTO expenses(date,category,description,amount,tax,paid_from) VALUES(?,?,?,?,?,?)').bind(b.date,b.category,b.description||'',Number(b.amount||0),Number(b.tax||0),b.paid_from||'cash').run(); return json({id:r.meta.last_row_id}); }
    return env.ASSETS.fetch(request);
  } catch(e) { return json({error:e.message},500); }
} };
