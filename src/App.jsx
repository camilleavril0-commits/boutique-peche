import { useEffect, useMemo, useState } from "react";

const products = [
  { id: 1, name: "Canne Spinning River 240", category: "Canne", tag: "Polyvalente", price: 48500, description: "Canne 2,40 m pour peche en riviere et lac, action rapide, poignee confort." },
  { id: 2, name: "Canne Telescopique Shore 360", category: "Canne", tag: "Longue portee", price: 39900, description: "Modele telescopique compact pour peche du bord, transport facile." },
  { id: 3, name: "Moulinet Aqua 3000", category: "Canne", tag: "Fluide", price: 32500, description: "Moulinet leger a frein progressif, ideal pour carnassiers et peche mixte." },
  { id: 4, name: "Moulinet Surf Cast 6000", category: "Canne", tag: "Puissant", price: 55900, description: "Grande bobine et ratio robuste pour la peche en mer ou en grands plans d'eau." },
  { id: 5, name: "Tresse ProLine 300 m", category: "Canne", tag: "Resistante", price: 18400, description: "Tresse haute resistance 4 brins, parfaite pour les montages precis." },
  { id: 6, name: "Nylon Invisible 200 m", category: "Canne", tag: "Discret", price: 9600, description: "Fil nylon transparent avec bonne elasticite pour peche polyvalente." },
  { id: 7, name: "Kit Leurres Souples Predator", category: "Leurres", tag: "Lot de 12", price: 14200, description: "Selection de leurres souples pour brochet, perche et sandre." },
  { id: 8, name: "Cuillers Flash Silver", category: "Leurres", tag: "Reflet fort", price: 8900, description: "Ensemble de cuillers tournantes pour eaux claires et poissons actifs." },
  { id: 9, name: "Poppers Surface Attack", category: "Leurres", tag: "Top water", price: 15600, description: "Leurres de surface bruiteurs pour attaques visibles au lever du jour." },
  { id: 10, name: "Appats Vers Naturels", category: "Appats", tag: "Frais", price: 4500, description: "Boite d'appats naturels pour peche au coup, carpe et peche en etang." },
  { id: 11, name: "Mais Aromatise Carpe", category: "Appats", tag: "Attractif", price: 6200, description: "Grains prepares a diffusion lente pour attirer les poissons blancs et carpes." },
  { id: 12, name: "Bottes River Guard", category: "Vetements", tag: "Impermables", price: 27800, description: "Bottes hautes en caoutchouc avec semelle anti-glisse pour berges humides." },
  { id: 13, name: "Waders Delta Chest", category: "Vetements", tag: "Renforces", price: 68900, description: "Waders poitrine avec bretelles reglables pour peche en eau peu profonde." },
  { id: 14, name: "Sac de Peche Compact 35L", category: "Accessoires", tag: "Organise", price: 21400, description: "Compartiments multiples pour boites, pinces, moulinets et petits outils." },
  { id: 15, name: "Boite de Rangement Tackle Box", category: "Accessoires", tag: "Modulable", price: 12700, description: "Boite transparente a separateurs ajustables pour hamecons et leurres." },
  { id: 16, name: "Epuisette Fold Net", category: "Accessoires", tag: "Pliable", price: 16800, description: "Epuisette legere avec manche telescopique pour sorties mobiles." },
  { id: 17, name: "Support de canne inox orientable", category: "Bateau", tag: "Inox", price: 29500, description: "Equivalent de support orientable bateau vu autour de 44,90 EUR sur Pecheur.com." },
  { id: 18, name: "Support encastrable inox", category: "Bateau", tag: "Encastre", price: 5500, description: "Equivalent de porte-canne a encastrer vu a 8,42 EUR sur Orange Marine." },
  { id: 19, name: "Sondeur GPS Helix 7", category: "Bateau", tag: "Electronique", price: 425700, description: "Equivalent de combine sondeur GPS 7 pouces vu a 649,00 EUR sur Orange Marine." },
  { id: 20, name: "Porte-canne ratelier 4 cannes", category: "Bateau", tag: "Ratelier", price: 26000, description: "Equivalent de porte-canne inox 4 cannes vu a 39,58 EUR sur Orange Marine." },
  { id: 21, name: "Treuil electrique Magnum 5 ST", category: "Bateau", tag: "Traine", price: 622500, description: "Equivalent de treuil de peche electrique vu a 949,00 EUR sur Pecheur.com." },
  { id: 22, name: "Trappe de rangement avec serrure", category: "Bateau", tag: "Securite", price: 36700, description: "Equivalent de trappe avec sac de rangement vu a 55,95 EUR sur Orange Marine." },
  { id: 23, name: "Sac de rangement etanche", category: "Bateau", tag: "Securite", price: 8500, description: "Equivalent de sac etanche de rangement vu a 12,99 EUR sur Orange Marine." }
];

const currency = new Intl.NumberFormat("fr-FR");
const storageKey = "pechepro-cart";
const whatsappNumber = "237600000000";
const categories = ["Tous", "Canne", "Leurres", "Appats", "Vetements", "Accessoires", "Bateau"];

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

function App() {
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroTransitionEnabled, setHeroTransitionEnabled] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [selectedProductId]
  );

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

  function handleCheckout() {
    if (cart.length === 0) {
      window.alert("Votre panier est vide.");
      return;
    }

    window.alert(`Commande enregistree pour un total de ${formatPrice(total)}.`);
    setCart([]);
    setCartOpen(false);
  }

  function goToCategory(category) {
    setActiveFilter(category);
    window.location.hash = "catalogue";
  }

  function goToProductCategory(product) {
    setSelectedProductId(product.id);
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
                <p className="eyebrow">Matériel et accessoires de pêche cameroun - nigéria - guinée équatoriale</p>
                <h1>AFRICAN FISH RUNNERS</h1>
              </div>
            </div>
          </nav>

          <section className="hero-content">
            <aside className="hero-panel">
              <p className="panel-title">LES INCONTOURNABLES</p>
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
              <h2>Du bord de rive jusqu'au bateau, l'equipement essentiel au meme endroit.</h2>
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
                <h3>Canne, moulinets & fils</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Vetements")}>
                <h3>Bottes & waders</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Leurres")}>
                <h3>Leurres & appats</h3>
              </button>
            </article>
            <article>
              <button className="category-link" type="button" onClick={() => goToCategory("Accessoires")}>
                <h3>Sacs & accessoires</h3>
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
                  onClick={() => setSelectedProductId(product.id)}
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
                      <button className="detail-button" type="button" onClick={() => setSelectedProductId(product.id)}>+</button>
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
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} aria-label="Nom" />
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} aria-label="Telephone" />
        </div>

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
          <button className="checkout-button" type="button" onClick={handleCheckout}>Commander</button>
        </div>
      </aside>

      {cartOpen ? <div className="overlay" onClick={() => setCartOpen(false)}></div> : null}
    </>
  );
}

export default App;
