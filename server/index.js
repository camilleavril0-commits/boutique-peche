import "dotenv/config";
import express from "express";
import Stripe from "stripe";
import { products } from "../src/data/products.js";
import {
  attachStripeSessionToOrder,
  createAdminSession,
  createCustomer,
  createOrder,
  deleteAdminSession,
  deleteExpiredAdminSessions,
  findAdminByEmail,
  findAdminSession,
  findOrderByStripeSessionId,
  listCustomers,
  listOrders,
  markOrderPaidByStripeSessionId,
  upsertAdmin
} from "./db.js";
import {
  createSessionExpiryDate,
  createSessionToken,
  getSecurityHeaders,
  hashPassword,
  hashSessionToken,
  makeRateLimiter,
  normalizeEmail,
  parseCookies,
  serializeCookie,
  verifyPassword
} from "./security.js";

const app = express();
const port = Number(process.env.PORT ?? 4242);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "admin@example.com");
const adminPassword = String(process.env.ADMIN_PASSWORD ?? "change-me-now");

const checkoutRateLimiter = makeRateLimiter({ windowMs: 60_000, maxRequests: 10 });
const authRateLimiter = makeRateLimiter({ windowMs: 60_000, maxRequests: 5 });

if (adminPassword.length < 12) {
  console.warn("ADMIN_PASSWORD is too short. Use at least 12 characters in production.");
}

upsertAdmin({
  email: adminEmail,
  passwordHash: hashPassword(adminPassword)
});

app.use((request, response, next) => {
  response.set(getSecurityHeaders());
  next();
});

function getCookieSettings() {
  return {
    httpOnly: true,
    sameSite: "Strict",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 12
  };
}

function getAuthenticatedAdmin(request) {
  deleteExpiredAdminSessions();
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies.admin_session;

  if (!token) {
    return null;
  }

  const session = findAdminSession(hashSessionToken(token));

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    deleteAdminSession(hashSessionToken(token));
    return null;
  }

  return { id: session.admin_id, email: session.email };
}

function requireAdmin(request, response, next) {
  const admin = getAuthenticatedAdmin(request);

  if (!admin) {
    response.status(401).json({ error: "Authentification admin requise." });
    return;
  }

  request.admin = admin;
  next();
}

function sanitizeCustomerField(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function buildValidatedCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 30) {
    return { error: "Le panier est vide ou invalide." };
  }

  const lineItems = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    const quantity = Number(item.quantity);

    if (!product || !Number.isInteger(quantity) || quantity <= 0 || quantity > 20) {
      return null;
    }

    return {
      productId: product.id,
      productName: product.name,
      description: product.description,
      unitPrice: product.price,
      quantity
    };
  });

  if (lineItems.some((item) => item === null)) {
    return { error: "Le panier contient un article invalide." };
  }

  return { lineItems };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (request, response) => {
  if (!stripe || !stripeWebhookSecret) {
    response.status(400).send("Webhook Stripe non configure.");
    return;
  }

  const signature = request.headers["stripe-signature"];

  if (typeof signature !== "string") {
    response.status(400).send("Signature Stripe manquante.");
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(request.body, signature, stripeWebhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      markOrderPaidByStripeSessionId(session.id);
    }

    response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    response.status(400).send("Webhook invalide.");
  }
});

app.use(express.json({ limit: "100kb" }));

app.post("/api/checkout", checkoutRateLimiter, async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error: "Stripe n'est pas configure. Ajoutez STRIPE_SECRET_KEY dans votre fichier .env."
    });
    return;
  }

  const { cart, customerName, customerPhone } = request.body ?? {};
  const safeCustomerName = sanitizeCustomerField(customerName, 120);
  const safeCustomerPhone = sanitizeCustomerField(customerPhone, 40);

  if (!safeCustomerName || !safeCustomerPhone) {
    response.status(400).json({ error: "Nom et telephone sont obligatoires." });
    return;
  }

  const { lineItems, error } = buildValidatedCart(cart);

  if (error) {
    response.status(400).json({ error });
    return;
  }

  try {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const customer = createCustomer({
      name: safeCustomerName,
      phone: safeCustomerPhone
    });
    const order = createOrder({
      customerId: customer.id,
      totalAmount,
      items: lineItems
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "xaf",
          product_data: {
            name: item.productName,
            description: item.description
          },
          unit_amount: item.unitPrice
        },
        quantity: item.quantity
      })),
      success_url: `${frontendUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}?checkout=cancel`,
      metadata: {
        orderId: String(order.id),
        customerName: safeCustomerName,
        customerPhone: safeCustomerPhone
      }
    });

    attachStripeSessionToOrder({ orderId: order.id, stripeSessionId: session.id });
    response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    response.status(500).json({
      error: "Impossible de creer la session de paiement Stripe."
    });
  }
});

app.get("/api/checkout/session-status", async (request, response) => {
  if (!stripe) {
    response.status(500).json({ error: "Stripe n'est pas configure." });
    return;
  }

  const sessionId = typeof request.query.session_id === "string" ? request.query.session_id : "";

  if (!sessionId) {
    response.status(400).json({ error: "session_id manquant." });
    return;
  }

  const localOrder = findOrderByStripeSessionId(sessionId);

  if (!localOrder) {
    response.status(404).json({ error: "Commande introuvable." });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid" && localOrder.status !== "paid") {
      markOrderPaidByStripeSessionId(sessionId);
    }

    const refreshedOrder = findOrderByStripeSessionId(sessionId);

    response.json({
      orderId: refreshedOrder.id,
      status: refreshedOrder.status,
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error("Stripe session lookup error:", error);
    response.status(500).json({ error: "Impossible de verifier la session Stripe." });
  }
});

app.post("/api/admin/login", authRateLimiter, (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password ?? "");
  const admin = findAdminByEmail(email);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    response.status(401).json({ error: "Identifiants invalides." });
    return;
  }

  const sessionToken = createSessionToken();
  const expiresAt = createSessionExpiryDate();

  createAdminSession({
    adminId: admin.id,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt
  });

  response.setHeader("Set-Cookie", serializeCookie("admin_session", sessionToken, getCookieSettings()));
  response.json({
    admin: {
      id: admin.id,
      email: admin.email
    }
  });
});

app.post("/api/admin/logout", (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  const sessionToken = cookies.admin_session;

  if (sessionToken) {
    deleteAdminSession(hashSessionToken(sessionToken));
  }

  response.setHeader("Set-Cookie", serializeCookie("admin_session", "", {
    ...getCookieSettings(),
    maxAge: 0
  }));
  response.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (request, response) => {
  response.json({ admin: request.admin });
});

app.get("/api/admin/customers", requireAdmin, (_request, response) => {
  response.json({ customers: listCustomers() });
});

app.get("/api/admin/orders", requireAdmin, (_request, response) => {
  response.json({ orders: listOrders() });
});

app.listen(port, () => {
  console.log(`Stripe backend listening on http://localhost:${port}`);
});
