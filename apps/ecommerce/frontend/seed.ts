const API_BASE = "http://localhost:3000";

interface ProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
}

const PRODUCTS: ProductInput[] = [
  {
    name: "Wireless Noise-Cancelling Headphones",
    description:
      "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and plush memory foam cushions for all-day comfort.",
    price: 79.99,
    category: "Electronics",
    stock: 50,
    imageUrl: "https://picsum.photos/seed/headphones/400/300",
  },
  {
    name: "Smart Fitness Watch",
    description:
      "Track your heart rate, steps, sleep, and workouts with a vibrant AMOLED display. Water-resistant to 50 meters.",
    price: 249.99,
    category: "Electronics",
    stock: 30,
    imageUrl: "https://picsum.photos/seed/smartwatch/400/300",
  },
  {
    name: "Trail Running Shoes",
    description:
      "Lightweight, breathable trail runners with superior grip and cushioned midsole. Perfect for rugged terrain.",
    price: 129.99,
    category: "Sports",
    stock: 40,
    imageUrl: "https://picsum.photos/seed/runshoes/400/300",
  },
  {
    name: "Pour-Over Coffee Maker",
    description:
      "Elegant borosilicate glass coffee maker with stainless steel filter. Brews rich, full-bodied coffee in minutes.",
    price: 34.99,
    category: "Home & Kitchen",
    stock: 80,
    imageUrl: "https://picsum.photos/seed/coffeemaker/400/300",
  },
  {
    name: "Canvas Laptop Backpack",
    description:
      "Durable waxed canvas backpack with padded 15-inch laptop compartment, organizer pockets, and water-resistant coating.",
    price: 49.99,
    category: "Accessories",
    stock: 60,
    imageUrl: "https://picsum.photos/seed/backpack/400/300",
  },
  {
    name: "Premium Yoga Mat",
    description:
      "Extra-thick 6mm mat with non-slip texture on both sides. Includes carrying strap. Eco-friendly TPE material.",
    price: 29.99,
    category: "Sports",
    stock: 100,
    imageUrl: "https://picsum.photos/seed/yogamat/400/300",
  },
  {
    name: "Adjustable LED Desk Lamp",
    description:
      "Touch-control desk lamp with 5 brightness levels, 3 color temperatures, and USB charging port. Flicker-free for eye comfort.",
    price: 39.99,
    category: "Home & Kitchen",
    stock: 70,
    imageUrl: "https://picsum.photos/seed/desklamp/400/300",
  },
  {
    name: "Portable Bluetooth Speaker",
    description:
      "Compact waterproof speaker with 360-degree sound, 12-hour battery, and built-in microphone for hands-free calls.",
    price: 59.99,
    category: "Electronics",
    stock: 45,
    imageUrl: "https://picsum.photos/seed/speaker/400/300",
  },
  {
    name: "Insulated Water Bottle",
    description:
      "Double-walled stainless steel bottle keeps drinks cold 24 hours or hot 12 hours. 750ml capacity, leak-proof lid.",
    price: 19.99,
    category: "Accessories",
    stock: 150,
    imageUrl: "https://picsum.photos/seed/waterbottle/400/300",
  },
  {
    name: "Mechanical Keyboard",
    description:
      "Compact 75% layout with hot-swappable switches, RGB backlighting, and PBT double-shot keycaps. USB-C connection.",
    price: 149.99,
    category: "Electronics",
    stock: 25,
    imageUrl: "https://picsum.photos/seed/keyboard/400/300",
  },
  {
    name: "Ceramic Plant Pot Set",
    description:
      "Set of 3 minimalist ceramic pots with bamboo saucers. Available in matte white. Drainage holes included.",
    price: 24.99,
    category: "Home & Kitchen",
    stock: 90,
    imageUrl: "https://picsum.photos/seed/plantpots/400/300",
  },
  {
    name: "Polarized Aviator Sunglasses",
    description:
      "Classic aviator frame with polarized UV400 lenses. Lightweight stainless steel frame with spring hinges.",
    price: 89.99,
    category: "Accessories",
    stock: 35,
    imageUrl: "https://picsum.photos/seed/sunglasses/400/300",
  },
];

async function seed() {
  console.log("Seeding products to", API_BASE);
  console.log("─".repeat(50));

  let created = 0;
  for (const product of PRODUCTS) {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  + ${data.name} (${data.id})`);
        created++;
      } else {
        const err = await res.json();
        console.log(`  x ${product.name}: ${err.error}`);
      }
    } catch (err) {
      console.log(`  x ${product.name}: ${(err as Error).message}`);
    }
  }

  console.log("─".repeat(50));
  console.log(`Done! Created ${created}/${PRODUCTS.length} products.`);
}

seed();
