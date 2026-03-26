import { useEffect, useMemo, useState } from "react";
import { categories, products } from "./data/products.js";

const currency = new Intl.NumberFormat("fr-FR");
const storageKey = "pechepro-cart";
const whatsappNumber = "237600000000";

function formatPrice(value) {
  return `${currency.format(value)} FCFA`;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => (row === 0 ? col : col === 0 ? row : 0))
  );

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function matchesFuzzySearch(query, text) {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);

  if (!normalizedQuery) {
    return true;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  const textWords = normalizedText.split(" ").filter(Boolean);

  return queryWords.every((queryWord) => textWords.some((textWord) => {
    if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
      return true;
    }

    const distance = levenshtein(queryWord, textWord);
    const threshold = queryWord.length <= 4 ? 1 : 2;
    return distance <= threshold;
  }));
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "La requete a echoue.");
  }

  return payload;
}

function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard() {
    setLoading(true);

    try {
      const adminPayload = await readJsonResponse(await window.fetch("/api/admin/me"));
      const [customersPayload, ordersPayload] = await Promise.all([
        readJsonResponse(await window.fetch("/api/admin/customers")),
        readJsonResponse(await window.fetch("/api/admin/orders"))
      ]);

      setAdmin(adminPayload.admin);
      setCustomers(customersPayload.customers);
      setOrders(ordersPayload.orders);
      setError("");
    } catch (loadError) {
      setAdmin(null);
      setCustomers([]);
      setOrders([]);

      if (String(loadError.message).includes("Authentification")) {
        setError("");
      } else {
        setError(loadError.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = await readJsonResponse(await window.fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }));

      setAdmin(payload.admin);
      setPassword("");
      await loadDashboard();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await window.fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null);
    setCustomers([]);
    setOrders([]);
  }

  if (loading) {
    return (
      <main className="admin-shell">
        <section className="admin-panel">
          <p className="eyebrow eyebrow-dark">Administration</p>
          <h1>Chargement securise...</h1>
        </section>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="admin-shell">
        <section className="admin-panel admin-login-panel">
          <p className="eyebrow eyebrow-dark">Administration</p>
          <h1>Connexion admin</h1>
          <p className="admin-copy">
            Cette interface n&apos;est accessible qu&apos;avec une session serveur `HttpOnly`.
          </p>
          <form className="admin-form" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="checkout-message">{error}</p> : null}
            <button className="checkout-button" type="submit" disabled={submitting}>
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-topbar">
          <div>
            <p className="eyebrow eyebrow-dark">Administration securisee</p>
            <h1>Clients et commandes</h1>
            <p className="admin-copy">{admin.email}</p>
          </div>
          <div className="admin-actions">
            <a className="secondary-link" href="/">Retour boutique</a>
            <button className="detail-button" type="button" onClick={() => loadDashboard()}>Rafraichir</button>
            <button className="icon-button" type="button" onClick={handleLogout}>Deconnexion</button>
          </div>
        </div>

        {error ? <p className="checkout-message">{error}</p> : null}

        <div className="admin-grid">
          <article className="admin-card">
            <div className="admin-card-header">
              <h2>Clients</h2>
              <span>{customers.length}</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Telephone</th>
                    <th>Commandes</th>
                    <th>Total paye</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="4">Aucun client enregistre pour le moment.</td>
                    </tr>
                  ) : customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.phone}</td>
                      <td>{customer.orders_count}</td>
                      <td>{formatPrice(customer.total_paid_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <h2>Commandes</h2>
              <span>{orders.length}</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Cree le</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="5">Aucune commande enregistree pour le moment.</td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>
                        <strong>{order.customer_name}</strong>
                        <br />
                        <span>{order.customer_phone}</span>
                      </td>
                      <td>
                        <span className={`status-pill status-${order.status}`}>{order.status}</span>
                      </td>
                      <td>{formatPrice(order.total_amount)}</td>
                      <td>{new Date(order.created_at).toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function StorefrontPage() {
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroTransitionEnabled, setHeroTransitionEnabled] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const heroSlides = [
    ...products.filter((product) => product.category === "Canne").slice(0, 3),
    ...categories
      .filter((category) => !["Tous", "Canne"].includes(category))
      .map((category) => products.find((product) => product.category === category))
      .filter(Boolean)
  ];
  const heroSlidesLoop = [...heroSlides, ...heroSlides, ...heroSlides];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setCart(JSON.parse(raw));
      }
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let cancelled = false;

    async function syncCheckoutStatus() {
      const params = new URLSearchParams(window.location.search);
      const checkoutStatus = params.get("checkout");
      const sessionId = params.get("session_id");

      if (checkoutStatus === "cancel") {
        setCheckoutMessage("Paiement annule. Votre panier est toujours disponible.");
        setCartOpen(true);
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        return;
      }

      if (checkoutStatus !== "success") {
        return;
      }

      if (!sessionId) {
        setCheckoutMessage("Retour Stripe recu, mais la session est introuvable.");
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        return;
      }

      setCheckoutMessage("Verification du paiement en cours...");

      try {
        const payload = await readJsonResponse(
          await window.fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`)
        );

        if (cancelled) {
          return;
        }

        if (payload.status === "paid" && payload.paymentStatus === "paid") {
          setCheckoutMessage(`Paiement confirme pour la commande #${payload.orderId}.`);
          setCart([]);
          setCartOpen(false);
        } else {
          setCheckoutMessage("Le paiement n'est pas encore confirme par le serveur.");
          setCartOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          setCheckoutMessage(error.message);
          setCartOpen(true);
        }
      } finally {
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      }
    }

    syncCheckoutStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  useEffect(() => {
    setHeroSlideIndex(heroSlides.length);
  }, [heroSlides.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroTransitionEnabled(true);
      setHeroSlideIndex((current) => current + 1);
    }, 2800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [heroSlides.length]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = activeFilter === "Tous" || product.category === activeFilter;
    const haystack = `${product.name} ${product.description} ${product.category}`;
    const matchesSearch = matchesFuzzySearch(searchTerm, haystack);
    return matchesFilter && matchesSearch;
  }), [activeFilter, searchTerm]);

  const cartItems = useMemo(
    () => cart.map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    }).filter(Boolean),
    [cart]
  );

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const quantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  function addToCart(productId) {
    setCart((current) => {
      const existingItem = current.find((item) => item.id === productId);
      if (existingItem) {
        return current.map((item) => item.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { id: productId, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQuantity(productId, delta) {
    setCart((current) => current
      .map((item) => item.id === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      window.alert("Votre panier est vide.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutMessage("Nom et telephone sont obligatoires.");
      setCartOpen(true);
      return;
    }

    setCheckoutPending(true);
    setCheckoutMessage("");

    try {
      const payload = await readJsonResponse(await window.fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cart,
          customerName,
          customerPhone
        })
      }));

      window.location.href = payload.url;
    } catch (error) {
      setCheckoutMessage(error.message);
      setCheckoutPending(false);
    }
  }

  function goToCategory(category) {
    setActiveFilter(category);
    window.location.hash = "catalogue";
  }

  function goToProductCategory(product) {
    setActiveFilter(product.category);
    window.location.hash = "catalogue";
  }

  function handleHeroTransitionEnd() {
    if (heroSlideIndex >= heroSlides.length * 2) {
      setHeroTransitionEnabled(false);
      setHeroSlideIndex((current) => current - heroSlides.length);
    } else if (heroSlideIndex < heroSlides.length) {
      setHeroTransitionEnabled(false);
      setHeroSlideIndex((current) => current + heroSlides.length);
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setHeroTransitionEnabled(true);
      });
    });
  }

  const whatsappText = encodeURIComponent(
    [
      "Panier",
      ...cartItems.map((item) => `${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`),
      `Total ${formatPrice(total)}`,
      customerName,
      customerPhone
    ].filter(Boolean).join("\n")
  );

  return (
    <>
      <div className="page-shell">
        <header className="hero">
          <nav className="topbar">
            <div className="brand">
              <div>
                <p className="eyebrow">Materiel et accessoires de peche cameroun - nigeria - guinee equatoriale</p>
                <h1>AFRICAN FISH RUNNERS</h1>
              </div>
            </div>
          </nav>

          <section className="hero-content">
            <aside className="hero-panel">
              <p className="panel-title">Les incontournables</p>
              <div className="hero-carousel">
                <div
                  className="hero-carousel-track"
                  onTransitionEnd={handleHeroTransitionEnd}
                  style={{
                    transform: `translateX(-${heroSlideIndex * (100 / 3)}%)`,
                    transition: heroTransitionEnabled ? "transform 420ms ease" : "none"
                  }}
                >
                  {heroSlidesLoop.map((product, index) => (
                    <article key={`${product.id}-${index}`} className="hero-slide">
                      <button
                        className={`detail-visual tone-${product.id % 4}`}
                        type="button"
                        onClick={() => goToProductCategory(product)}
                        aria-label={product.name}
                      ></button>
                      <h3 className="product-name product-name-large">{product.name}</h3>
                    </article>
                  ))}
                </div>
              </div>
              <div className="hero-dots" aria-hidden="true">
                {heroSlides.map((product, index) => (
                  <button
                    key={product.id}
                    className={`hero-dot ${index === (heroSlideIndex % heroSlides.length) ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      setHeroTransitionEnabled(true);
                      setHeroSlideIndex(heroSlides.length + index);
                    }}
                  ></button>
                ))}
              </div>
            </aside>

            <div className="hero-copy">
              <h2>Du bord de rive jusqu&apos;au bateau, l&apos;equipement essentiel au meme endroit.</h2>
              <p className="hero-text">
                Cannes, moulinets, fils, bottes, appats, bagagerie et petit outillage.
                Une boutique simple, claire et rapide a utiliser.
              </p>
              <div className="hero-actions">
                <a href="#catalogue" className="primary-link">Voir les articles</a>
                <a href="#categories" className="secondary-link">Par categorie</a>
              </div>
            </div>
          </section>
        </header>

        <main>
          <section id="categories" className="category-strip">
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Canne")}>
                <h3>Canne, moulinets et fils</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Vetements")}>
                <h3>Bottes et waders</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Leurres")}>
                <h3>Leurres et appats</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Accessoires")}>
                <h3>Sacs et accessoires</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Bateau")}>
                <h3>Equipement bateau</h3>
              </button>
            </article>
          </section>

          <section className="controls">
            <div>
              <p className="eyebrow eyebrow-dark">Catalogue</p>
              <h2 id="catalogue">Articles de peche</h2>
            </div>

            <div className="controls-actions">
              <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
                Panier
                <span className="cart-count">{quantity}</span>
              </button>
              <label className="search">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Ex: canne, bottes, appat..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setActiveFilter("Tous");
                  }}
                />
              </label>
            </div>
          </section>

          <section className="filters">
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-chip ${activeFilter === category ? "active" : ""}`}
                type="button"
                onClick={() => setActiveFilter(category)}
              >
                {category}
              </button>
            ))}
          </section>

          <section className="product-grid" aria-live="polite">
            {visibleProducts.length === 0 ? (
              <article className="empty-cart">Aucun article ne correspond a votre recherche pour le moment.</article>
            ) : visibleProducts.map((product) => (
              <article key={product.id} className="product-card">
                <button
                  className={`product-visual tone-${product.id % 4}`}
                  type="button"
                  onClick={() => goToProductCategory(product)}
                  aria-label={product.name}
                ></button>
                <div className="product-body">
                  <div className="product-meta">
                    <p className="product-category">{product.category}</p>
                    <span className="product-tag">{product.tag}</span>
                  </div>
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <strong className="product-price">{formatPrice(product.price)}</strong>
                    <div className="product-actions-inline">
                      <button className="detail-button" type="button" onClick={() => goToProductCategory(product)}>+</button>
                      <button className="add-button" type="button" onClick={() => addToCart(product.id)}>Ajouter</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>

      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-hidden={cartOpen ? "false" : "true"}>
        <div className="cart-header">
          <div>
            <p className="eyebrow eyebrow-dark">Votre selection</p>
            <h2>Panier</h2>
          </div>
          <div className="drawer-actions">
            <a
              className="whatsapp-button"
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
            >
              <span>⌁</span>
            </a>
            <button className="icon-button" type="button" aria-label="Fermer le panier" onClick={() => setCartOpen(false)}>×</button>
          </div>
        </div>

        <div className="checkout-fields">
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            aria-label="Nom"
            placeholder="Nom complet"
          />
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            aria-label="Telephone"
            placeholder="Telephone"
          />
        </div>

        {checkoutMessage ? <p className="checkout-message">{checkoutMessage}</p> : null}

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              Votre panier est vide. Ajoutez du materiel pour preparer votre prochaine sortie.
            </div>
          ) : cartItems.map((item) => (
            <article key={item.id} className="cart-item">
              <div>
                <h3 className="cart-item-name">{item.name}</h3>
                <p className="cart-item-price">{formatPrice(item.price)}</p>
              </div>
              <div className="cart-item-actions">
                <div className="qty-controls">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                  <span className="cart-item-qty">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>
                <button className="remove-link" type="button" onClick={() => removeFromCart(item.id)}>Retirer</button>
              </div>
            </article>
          ))}
        </div>

        <div className="cart-footer">
          <div className="cart-summary">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <button className="checkout-button" type="button" onClick={handleCheckout} disabled={checkoutPending}>
            {checkoutPending ? "Redirection..." : "Payer avec Stripe"}
          </button>
        </div>
      </aside>

      {cartOpen ? <div className="overlay" onClick={() => setCartOpen(false)}></div> : null}
    </>
  );
}

function App() {
  const isAdminRoute = window.location.pathname === "/admin";
  return isAdminRoute ? <AdminPage /> : <StorefrontPage />;
}

export default App;
