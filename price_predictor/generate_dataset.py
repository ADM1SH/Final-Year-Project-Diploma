import csv
import random
import os

# Define categories and their corresponding brands and original price ranges
CATEGORY_CONFIGS = {
    "Tech": {
        "brands": {
            "Apple": (1500.0, 6000.0, 0.90),    # Brand: (Min Retail Price, Max Retail Price, Value retention multiplier)
            "Samsung": (800.0, 5000.0, 0.80),
            "Sony": (300.0, 2500.0, 0.85),
            "Dell": (1200.0, 4500.0, 0.75),
            "Asus": (1000.0, 5000.0, 0.78),
        },
        "base_depreciation": 0.80  # Base retention at condition score 10
    },
    "Fashion": {
        "brands": {
            "Nike": (150.0, 800.0, 0.70),
            "Adidas": (150.0, 800.0, 0.68),
            "Gucci": (1000.0, 10000.0, 0.88),  # Luxury brand holds value
            "Chanel": (1500.0, 15000.0, 0.92), # Luxury brand holds value
        },
        "base_depreciation": 0.65
    },
    "Books": {
        "brands": {
            "Pearson": (50.0, 250.0, 0.55),
            "Oxford": (40.0, 200.0, 0.50),
            "Penguin": (20.0, 80.0, 0.40),
        },
        "base_depreciation": 0.45
    }
}

def generate_listing():
    """
    Generates a single listing representing a secondhand item sale in Malaysia (Prices in RM).
    """
    # 1. Randomly choose category
    category = random.choice(list(CATEGORY_CONFIGS.keys()))
    config = CATEGORY_CONFIGS[category]
    
    # 2. Randomly choose brand under that category
    brand = random.choice(list(config["brands"].keys()))
    min_retail, max_retail, brand_retention = config["brands"][brand]
    
    # 3. Generate original retail price
    original_price = round(random.uniform(min_retail, max_retail), 2)
    
    # 4. Generate condition score (1 to 10)
    # Higher condition scores are more common in mock marketplace listings
    condition_score = round(random.triangular(3.0, 10.0, 8.0), 1)
    
    # Calculate condition multiplier: 0.25 base + linear scaling up to 1.0 for perfect score
    condition_multiplier = 0.25 + 0.75 * (condition_score / 10.0)
    
    # 5. Determine listed markup (overpricing factor)
    # Some sellers list at a fair price, others overprice it
    # Overpricing factor represents how much above fair price the seller listed the item
    listed_markup = random.uniform(-0.05, 0.35)  # -5% to +35% markup
    
    # 6. Listing Duration (Days)
    # Strong correlation: Overpriced items stay listed longer!
    # Base duration of 2 days + additional days scaled by listed_markup
    duration_base = max(1, int((listed_markup + 0.05) * 150))
    duration_days = duration_base + random.randint(-5, 10)
    duration_days = max(1, min(90, duration_days))  # Bound between 1 and 90 days
    
    # 7. Fair Market Value (FMV) Calculation
    # FMV = Original Price * Base Category Depreciation * Brand Retention * Condition Multiplier
    fair_market_value = original_price * config["base_depreciation"] * brand_retention * condition_multiplier
    
    # 8. Listed Price (Price shown on the marketplace)
    listed_price = fair_market_value * (1.0 + listed_markup)
    
    # 9. Sold Price (Final transaction price)
    # If the item sits for a long time, the seller accepts lower offers
    negotiation_discount = 0.0
    if duration_days > 7:
        # Scale discount based on duration, maxing out at 20% discount for 90 days listing
        negotiation_discount = min(0.20, (duration_days - 7) * 0.0025)
    
    sold_price = listed_price * (1.0 - negotiation_discount)
    # Add a small random negotiation variation (-2% to +2%)
    sold_price = sold_price * random.uniform(0.98, 1.02)
    
    # Ensure sold price doesn't exceed original price
    sold_price = min(sold_price, original_price * 0.95)
    
    # Format values to 2 decimal places
    fair_market_value = round(fair_market_value, 2)
    listed_price = round(listed_price, 2)
    sold_price = round(sold_price, 2)
    
    return {
        "category": category,
        "brand": brand,
        "condition_score": condition_score,
        "duration_days": duration_days,
        "original_price": original_price,
        "listed_price": listed_price,
        "sold_price": sold_price,
        "is_sold": 1
    }

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "listings_dataset.csv")
    print("Generating synthetic marketplace dataset...")
    
    listings = [generate_listing() for _ in range(1500)]
    
    fields = ["category", "brand", "condition_score", "duration_days", "original_price", "listed_price", "sold_price", "is_sold"]
    
    with open(dataset_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(listings)
        
    print(f"Dataset successfully created at: {dataset_path}")
    print(f"Total records: {len(listings)}")
    
    # Print some stats for sanity check
    categories = {}
    for l in listings:
        cat = l["category"]
        categories[cat] = categories.get(cat, 0) + 1
    print("Distribution of Categories:")
    for cat, val in categories.items():
        print(f" - {cat}: {val}")

if __name__ == "__main__":
    main()
