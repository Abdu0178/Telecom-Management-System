
require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// 15 SQL кесте
const tables = [
  "subscribers",
  "sim_cards",
  "tariffs",
  "subscriptions",
  "tariff_history",
  "calls",
  "sms_usage",
  "internet_usage",
  "service_packages",
  "subscriber_packages",
  "payments",
  "invoices",
  "complaints",
  "branches",
  "employees",
];

const keys = {
  subscribers: "subscriber_id",
  sim_cards: "sim_id",
  tariffs: "tariff_id",
  subscriptions: "subscription_id",
  tariff_history: "history_id",
  calls: "call_id",
  sms_usage: "sms_id",
  internet_usage: "usage_id",
  service_packages: "package_id",
  subscriber_packages: "subscriber_package_id",
  payments: "payment_id",
  invoices: "invoice_id",
  complaints: "complaint_id",
  branches: "branch_id",
  employees: "employee_id",
};

// Қателерді өңдеу
const route = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("API қатесі:", err);

    const status = err.code === "23505" ? 409 : 400;

    res.status(status).json({
      error: err.detail || err.message || "Сервер қатесі",
    });
  }
};

// PostgreSQL байланысын тексеру
app.get(
  "/api/health",
  route(async (req, res) => {
    await db.query("SELECT 1");
    res.json({ ok: true });
  })
);

// Dashboard
app.get(
  "/api/dashboard",
  route(async (req, res) => {
    const [stat, usage, top] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM subscribers)
            AS subscribers,

          (SELECT COUNT(*)
           FROM subscribers
           WHERE status = 'active')
            AS active_subscribers,

          (SELECT COUNT(*)
           FROM sim_cards
           WHERE status = 'active')
            AS active_sims,

          (SELECT COUNT(*)
           FROM tariffs
           WHERE is_active)
            AS tariffs,

          (SELECT COALESCE(SUM(amount), 0)
           FROM payments)
            AS revenue,

          (SELECT COUNT(*)
           FROM complaints
           WHERE status <> 'resolved')
            AS complaints
      `),

      db.query(`
        SELECT
          COALESCE(SUM(mb_used) / 1024.0, 0) AS gb,
          (SELECT COUNT(*) FROM calls) AS calls
        FROM internet_usage
      `),

      db.query(`
        SELECT
          t.name,
          COUNT(s.subscription_id)::int AS total
        FROM tariffs t
        LEFT JOIN subscriptions s
          ON s.tariff_id = t.tariff_id
          AND s.status = 'active'
        GROUP BY t.tariff_id, t.name
        ORDER BY total DESC, t.name
        LIMIT 6
      `),
    ]);

    res.json({
      stats: {
        ...stat.rows[0],
        ...usage.rows[0],
      },
      top: top.rows,
    });
  })
);

// Кестелер тізімі
app.get("/api/tables", (req, res) => {
  res.json(tables);
});

// Кесте мәліметтерін шығару
app.get(
  "/api/table/:name",
  route(async (req, res) => {
    const name = req.params.name;

    if (!tables.includes(name)) {
      return res.status(404).json({
        error: "Кесте табылмады",
      });
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 100, 1),
      300
    );

    const result = await db.query(
      `
        SELECT *
        FROM "${name}"
        ORDER BY "${keys[name]}" DESC
        LIMIT $1
      `,
      [limit]
    );

    res.json({
      rows: result.rows,
      columns: result.fields.map((field) => field.name),
    });
  })
);

// Абоненттер
app.get(
  "/api/subscribers",
  route(async (req, res) => {
    const { rows } = await db.query(`
      SELECT
        s.*,
        b.name AS branch_name
      FROM subscribers s
      LEFT JOIN branches b
        ON b.branch_id = s.branch_id
      ORDER BY s.subscriber_id DESC
      LIMIT 300
    `);

    res.json(rows);
  })
);

// Абонент тіркеу
app.post(
  "/api/subscribers",
  route(async (req, res) => {
    const {
      full_name,
      iin,
      email,
      phone,
      branch_id,
    } = req.body;

    if (
      !full_name?.trim() ||
      !/^\d{12}$/.test(iin || "") ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        error: "Аты, телефон және 12 сандық ЖСН қажет",
      });
    }

    const { rows } = await db.query(
      `
        INSERT INTO subscribers (
          full_name,
          iin,
          email,
          phone,
          branch_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        full_name.trim(),
        iin,
        email?.trim() || null,
        phone.trim(),
        branch_id || null,
      ]
    );

    res.status(201).json(rows[0]);
  })
);

// Абонент статусын өзгерту
app.patch(
  "/api/subscribers/:id",
  route(async (req, res) => {
    const { status } = req.body;

    if (!["active", "inactive", "blocked"].includes(status)) {
      return res.status(400).json({
        error: "Статус жарамсыз",
      });
    }

    const { rows } = await db.query(
      `
        UPDATE subscribers
        SET status = $1
        WHERE subscriber_id = $2
        RETURNING *
      `,
      [status, req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Абонент табылмады",
      });
    }

    res.json(rows[0]);
  })
);

// Тарифтер
app.get(
  "/api/tariffs",
  route(async (req, res) => {
    const { rows } = await db.query(`
      SELECT *
      FROM tariffs
      ORDER BY tariff_id
    `);

    res.json(rows);
  })
);

// SIM-карталар
app.get(
  "/api/sims",
  route(async (req, res) => {
    const { rows } = await db.query(`
      SELECT
        sim_id,
        iccid,
        msisdn,
        subscriber_id,
        status
      FROM sim_cards
      ORDER BY sim_id DESC
    `);

    res.json(rows);
  })
);

// SIM тіркеу
app.post(
  "/api/sims/register",
  route(async (req, res) => {
    const { subscriber_id, sim_id } = req.body;

    if (!subscriber_id || !sim_id) {
      return res.status(400).json({
        error: "Абонент пен SIM таңдаңыз",
      });
    }

    await db.query(
      "CALL register_sim($1, $2)",
      [subscriber_id, sim_id]
    );

    res.json({ ok: true });
  })
);

// Тариф ауыстыру
app.post(
  "/api/tariffs/change",
  route(async (req, res) => {
    const { sim_id, tariff_id } = req.body;

    if (!sim_id || !tariff_id) {
      return res.status(400).json({
        error: "SIM пен тариф таңдаңыз",
      });
    }

    await db.query(
      "CALL change_tariff($1, $2)",
      [sim_id, tariff_id]
    );

    res.json({ ok: true });
  })
);

// Абонентке тариф қосу
app.post(
  "/api/subscriptions",
  route(async (req, res) => {
    const { sim_id, tariff_id } = req.body;

    if (!sim_id || !tariff_id) {
      return res.status(400).json({
        error: "SIM пен тариф таңдаңыз",
      });
    }

    const { rows } = await db.query(
      `
        INSERT INTO subscriptions (
          subscriber_id,
          sim_id,
          tariff_id,
          start_date
        )
        SELECT
          subscriber_id,
          sim_id,
          $2,
          CURRENT_DATE
        FROM sim_cards
        WHERE sim_id = $1
          AND status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM subscriptions
            WHERE sim_id = $1
              AND status = 'active'
          )
        RETURNING *
      `,
      [sim_id, tariff_id]
    );

    if (!rows.length) {
      return res.status(400).json({
        error: "SIM белсенді болуы және бос тарифі болуы керек",
      });
    }

    res.status(201).json(rows[0]);
  })
);

// Абоненттің айлық шығыны
app.get(
  "/api/usage/:subscriber_id",
  route(async (req, res) => {
    const month =
      req.query.month ||
      new Date().toISOString().slice(0, 7) + "-01";

    const { rows } = await db.query(
      "SELECT * FROM monthly_usage($1, $2)",
      [req.params.subscriber_id, month]
    );

    res.json(rows[0] || {});
  })
);

// Айлық шот қалыптастыру
app.post(
  "/api/invoices/generate",
  route(async (req, res) => {
    const { subscriber_id, month } = req.body;

    if (
      !subscriber_id ||
      !/^\d{4}-\d{2}$/.test(month || "")
    ) {
      return res.status(400).json({
        error: "Абонент және YYYY-MM айы қажет",
      });
    }

    await db.query(
      "CALL generate_invoice($1, $2)",
      [subscriber_id, month + "-01"]
    );

    res.json({ ok: true });
  })
);

// Шоттар тізімі
app.get(
  "/api/invoices",
  route(async (req, res) => {
    const { rows } = await db.query(`
      SELECT
        i.*,
        s.full_name
      FROM invoices i
      JOIN subscribers s
        USING (subscriber_id)
      ORDER BY invoice_id DESC
      LIMIT 100
    `);

    res.json(rows);
  })
);

// Төлем жасау
app.post(
  "/api/payments",
  route(async (req, res) => {
    const { invoice_id, amount, method } = req.body;

    if (
      !invoice_id ||
      !(Number(amount) > 0) ||
      !["card", "cash", "bank_transfer"].includes(method)
    ) {
      return res.status(400).json({
        error: "Шот, сома және төлем әдісін таңдаңыз",
      });
    }

    await db.query(
      "CALL pay_invoice($1, $2, $3)",
      [invoice_id, amount, method]
    );

    res.json({ ok: true });
  })
);

// Абонент шағымын тіркеу
app.post(
  "/api/complaints",
  route(async (req, res) => {
    const {
      subscriber_id,
      subject,
      description,
    } = req.body;

    if (
      !subscriber_id ||
      !subject?.trim() ||
      !description?.trim()
    ) {
      return res.status(400).json({
        error: "Барлық өрісті толтырыңыз",
      });
    }

    const { rows } = await db.query(
      `
        INSERT INTO complaints (
          subscriber_id,
          subject,
          description
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [
        subscriber_id,
        subject.trim(),
        description.trim(),
      ]
    );

    res.status(201).json(rows[0]);
  })
);

// ========================================
// АНАЛИТИКА — ТҮЗЕТІЛГЕН БӨЛІМ
// ========================================

app.get(
  "/api/analytics",
  route(async (req, res) => {
    // ARPU: айлық орташа абоненттік табыс
    const arpuResult = await db.query(`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') AS "month",
        ROUND(
          SUM(amount) /
          NULLIF(
            (SELECT COUNT(*) FROM subscribers),
            0
          ),
          2
        ) AS arpu
      FROM payments
      WHERE paid_at IS NOT NULL
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY 1 DESC
      LIMIT 12
    `);

    // Ең танымал тарифтер
    const tariffsResult = await db.query(`
      SELECT
        t.name,
        COUNT(s.subscription_id)::int AS subscribers
      FROM tariffs t
      LEFT JOIN subscriptions s
        ON s.tariff_id = t.tariff_id
        AND s.status = 'active'
      GROUP BY t.tariff_id, t.name
      ORDER BY subscribers DESC, t.name
      LIMIT 8
    `);

    // Интернетті ең көп қолданатын абоненттер
    const heavyResult = await db.query(`
      SELECT
        s.full_name,
        ROUND(
          SUM(i.mb_used) / 1024.0,
          2
        ) AS gb
      FROM internet_usage i
      JOIN sim_cards sc
        ON i.sim_id = sc.sim_id
      JOIN subscribers s
        ON s.subscriber_id = sc.subscriber_id
      GROUP BY s.subscriber_id, s.full_name
      ORDER BY gb DESC
      LIMIT 8
    `);

    res.json({
      arpu: arpuResult.rows,
      tariffs: tariffsResult.rows,
      heavy: heavyResult.rows,
    });
  })
);

// Сайттың басты беті
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// Серверді іске қосу
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Telecom Management: http://localhost:${port}`);
});

