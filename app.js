const products = [
  {
    id: 1,
    name: "Canne Spinning River 240",
    category: "Cannes",
    tag: "Polyvalente",
    price: 48500,
    description: "Canne 2,40 m pour peche en riviere et lac, action rapide, poignee confort."
  },
  {
    id: 2,
    name: "Canne Telescopique Shore 360",
    category: "Cannes",
    tag: "Longue portee",
    price: 39900,
    description: "Modele telescopique compact pour peche du bord, transport facile."
  },
  {
    id: 3,
    name: "Moulinet Aqua 3000",
    category: "Moulinets",
    tag: "Fluide",
    price: 32500,
    description: "Moulinet leger a frein progressif, ideal pour carnassiers et peche mixte."
  },
  {
    id: 4,
    name: "Moulinet Surf Cast 6000",
    category: "Moulinets",
    tag: "Puissant",
    price: 55900,
    description: "Grande bobine et ratio robuste pour la peche en mer ou en grands plans d'eau."
  },
  {
    id: 5,
    name: "Tresse ProLine 300 m",
    category: "Fils",
    tag: "Resistante",
    price: 18400,
    description: "Tresse haute resistance 4 brins, parfaite pour les montages precis."
  },
  {
    id: 6,
    name: "Nylon Invisible 200 m",
    category: "Fils",
    tag: "Discret",
    price: 9600,
    description: "Fil nylon transparent avec bonne elasticite pour peche polyvalente."
  },
  {
    id: 7,
    name: "Kit Leurres Souples Predator",
    category: "Leurres",
    tag: "Lot de 12",
    price: 14200,
    description: "Selection de leurres souples pour brochet, perche et sandre."
  },
  {
    id: 8,
    name: "Cuillers Flash Silver",
    category: "Leurres",
    tag: "Reflet fort",
    price: 8900,
    description: "Ensemble de cuillers tournantes pour eaux claires et poissons actifs."
  },
  {
    id: 9,
    name: "Poppers Surface Attack",
    category: "Leurres",
    tag: "Top water",
    price: 15600,
    description: "Leurres de surface bruiteurs pour attaques visibles au lever du jour."
  },
  {
    id: 10,
    name: "Appats Vers Naturels",
    category: "Appats",
    tag: "Frais",
    price: 4500,
    description: "Boite d'appats naturels pour peche au coup, carpe et peche en etang."
  },
  {
    id: 11,
    name: "Mais Aromatise Carpe",
    category: "Appats",
    tag: "Attractif",
    price: 6200,
    description: "Grains prepares a diffusion lente pour attirer les poissons blancs et carpes."
  },
  {
    id: 12,
    name: "Bottes River Guard",
    category: "Vetements",
    tag: "Impermables",
    price: 27800,
    description: "Bottes hautes en caoutchouc avec semelle anti-glisse pour berges humides."
  },
  {
    id: 13,
    name: "Waders Delta Chest",
    category: "Vetements",
    tag: "Renforces",
    price: 68900,
    description: "Waders poitrine avec bretelles reglables pour peche en eau peu profonde."
  },
  {
    id: 14,
    name: "Sac de Peche Compact 35L",
    category: "Accessoires",
    tag: "Organise",
    price: 21400,
    description: "Compartiments multiples pour boites, pinces, moulinets et petits outils."
  },
  {
    id: 15,
    name: "Boite de Rangement Tackle Box",
    category: "Accessoires",
    tag: "Modulable",
    price: 12700,
    description: "Boite transparente a separateurs ajustables pour hamecons et leurres."
  },
  {
    id: 16,
    name: "Epuisette Fold Net",
    category: "Accessoires",
    tag: "Pliable",
    price: 16800,
    description: "Epuisette legere avec manche telescopique pour sorties mobiles."
  }
];

const currency = new Intl.NumberFormat("fr-FR");
const storageKey = "pechepro-cart";

const productGrid = document.querySelector("[data-product-grid]");
const productTemplate = document.querySelector("#product-card-template");
const cartTemplate = document.querySelector("#cart-item-template");
const cartItemsContainer = document.querySelector("[data-cart-items]");
const cartTotal = document.querySelector("[data-cart-total]");
const cartCount = document.querySelector("[data-cart-count]");
const searchInput = document.querySelector("[data-search-input]");
const filterGroup = document.querySelector("[data-filter-group]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const overlay = document.querySelector("[data-overlay]");
const checkoutButton = document.querySelector("[data-checkout-button]");

let activeFilter = "Tous";
let searchTerm = "";
let cart = loadCart();

function formatPrice(value) {
  return `${currency.format(value)} FCFA`;
}

function loadCart() {
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(storageKey, JSON.stringify(cart));
}

function getVisibleProducts() {
  return products.filter((product) => {
    const matchesFilter = activeFilter === "Tous" || product.category === activeFilter;
    const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  productGrid.innerHTML = "";

  visibleProducts.forEach((product) => {
    const fragment = productTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".product-card");

    fragment.querySelector(".product-category").textContent = product.category;
    fragment.querySelector(".product-tag").textContent = product.tag;
    fragment.querySelector(".product-name").textContent = product.name;
    fragment.querySelector(".product-description").textContent = product.description;
    fragment.querySelector(".product-price").textContent = formatPrice(product.price);

    card.querySelector(".add-button").addEventListener("click", () => addToCart(product.id));
    productGrid.appendChild(fragment);
  });

  if (visibleProducts.length === 0) {
    productGrid.innerHTML = `
      <article class="empty-cart">
        Aucun article ne correspond a votre recherche pour le moment.
      </article>
    `;
  }
}

function addToCart(productId) {
  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart();
  renderCart();
  openCart();
}

function updateQuantity(productId, delta) {
  cart = cart
    .map((item) => item.id === productId ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity > 0);

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function renderCart() {
  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        Votre panier est vide. Ajoutez du materiel pour preparer votre prochaine sortie.
      </div>
    `;
  } else {
    cart.forEach((item) => {
      const product = products.find((entry) => entry.id === item.id);

      if (!product) {
        return;
      }

      const fragment = cartTemplate.content.cloneNode(true);
      const wrapper = fragment.querySelector(".cart-item");

      fragment.querySelector(".cart-item-name").textContent = product.name;
      fragment.querySelector(".cart-item-price").textContent = formatPrice(product.price);
      fragment.querySelector(".cart-item-qty").textContent = item.quantity;

      wrapper.querySelector('[data-action="decrease"]').addEventListener("click", () => updateQuantity(product.id, -1));
      wrapper.querySelector('[data-action="increase"]').addEventListener("click", () => updateQuantity(product.id, 1));
      wrapper.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(product.id));

      cartItemsContainer.appendChild(fragment);
    });
  }

  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return product ? sum + (product.price * item.quantity) : sum;
  }, 0);

  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartTotal.textContent = formatPrice(total);
  cartCount.textContent = quantity;
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function handleCheckout() {
  if (cart.length === 0) {
    window.alert("Votre panier est vide.");
    return;
  }

  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return product ? sum + (product.price * item.quantity) : sum;
  }, 0);

  window.alert(`Commande enregistree pour un total de ${formatPrice(total)}.`);
  cart = [];
  saveCart();
  renderCart();
  closeCart();
}

document.querySelector("[data-open-cart]").addEventListener("click", openCart);
document.querySelector("[data-close-cart]").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
checkoutButton.addEventListener("click", handleCheckout);

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderProducts();
});

filterGroup.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");

  if (!button) {
    return;
  }

  activeFilter = button.dataset.filter;

  filterGroup.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.classList.toggle("active", chip === button);
  });

  renderProducts();
});

renderProducts();
renderCart();
