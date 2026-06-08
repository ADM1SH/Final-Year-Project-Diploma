import requests
from bs4 import BeautifulSoup
import re
import json

# Setup standard headers to bypass simple bot blockers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

def parse_listing_html(html_content):
    """
    Parses a single listing page's HTML content using BeautifulSoup.
    Extracts item title, price, brand, category, condition, and listing duration.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    data = {}

    # 1. Extract Title
    title_elem = soup.find("h1") or soup.find(class_=re.compile("title|header", re.I))
    data["title"] = title_elem.get_text().strip() if title_elem else "Unknown Item"

    # 2. Extract Price
    # Look for RM, $, ringgit, or price tags
    price_elem = soup.find(string=re.compile(r"RM\s*\d+", re.I)) or soup.find(class_=re.compile("price", re.I))
    if price_elem:
        price_text = price_elem.get_text() if hasattr(price_elem, "get_text") else str(price_elem)
        # Parse numeric digits out
        match = re.search(r"RM\s*([\d,]+(?:\.\d{2})?)", price_text, re.I)
        if match:
            data["price"] = float(match.group(1).replace(",", ""))
        else:
            data["price"] = 0.0
    else:
        data["price"] = 0.0

    # 3. Extract Category
    # Categorize based on keywords in title or breadcrumbs
    breadcrumbs = soup.find(class_=re.compile("breadcrumb|category", re.I))
    category_text = breadcrumbs.get_text().lower() if breadcrumbs else data["title"].lower()
    
    if any(k in category_text for k in ["iphone", "samsung", "phone", "ipad", "laptop", "sony", "tech", "device"]):
        data["category"] = "Tech"
    elif any(k in category_text for k in ["shirt", "shoes", "bag", "dress", "fashion", "nike", "adidas", "gucci"]):
        data["category"] = "Fashion"
    elif any(k in category_text for k in ["book", "novel", "textbook", "read", "pages", "edition"]):
        data["category"] = "Books"
    else:
        data["category"] = "Other"

    # 4. Extract Brand
    # Match against common brands
    brand_matches = re.search(r"\b(apple|samsung|sony|nike|adidas|gucci|chanel|pearson|oxford|dell|hp|asus|lenovo)\b", data["title"].lower())
    data["brand"] = brand_matches.group(1).title() if brand_matches else "Generic"

    # 5. Extract Condition
    # Look for condition keyword or survey rating
    condition_elem = soup.find(string=re.compile(r"condition|state|grade", re.I))
    if condition_elem:
        parent_text = condition_elem.parent.get_text().lower()
        # Look for grades or numbers
        score_match = re.search(r"(\d+)/10", parent_text)
        if score_match:
            data["condition_score"] = float(score_match.group(1))
        elif "excellent" in parent_text or "like new" in parent_text or "grade a" in parent_text:
            data["condition_score"] = 9.0
        elif "good" in parent_text or "grade b" in parent_text:
            data["condition_score"] = 7.0
        elif "fair" in parent_text or "grade c" in parent_text:
            data["condition_score"] = 5.0
        else:
            data["condition_score"] = 4.0
    else:
        # Check title keywords
        title_lower = data["title"].lower()
        if "new" in title_lower or "sealed" in title_lower:
            data["condition_score"] = 10.0
        elif "like new" in title_lower or "mint" in title_lower:
            data["condition_score"] = 9.0
        else:
            data["condition_score"] = 7.0  # Default to Good

    # 6. Extract Listing Duration (days since listed)
    duration_elem = soup.find(string=re.compile(r"listed|posted|ago", re.I))
    if duration_elem:
        parent_text = duration_elem.parent.get_text().lower()
        days_match = re.search(r"(\d+)\s*days?\s*ago", parent_text)
        hours_match = re.search(r"(\d+)\s*hours?\s*ago", parent_text)
        weeks_match = re.search(r"(\d+)\s*weeks?\s*ago", parent_text)
        
        if days_match:
            data["duration_days"] = int(days_match.group(1))
        elif hours_match:
            data["duration_days"] = 0  # Today
        elif weeks_match:
            data["duration_days"] = int(weeks_match.group(1)) * 7
        else:
            data["duration_days"] = 5  # Default
    else:
        data["duration_days"] = 5

    return data

def scrape_url(url):
    """
    Fetches the URL and parses listing details.
    """
    print(f"Scraping {url}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            return parse_listing_html(response.text)
        else:
            print(f"Failed to fetch listing. Status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Network error while scraping: {e}")
        return None

def run_mock_demo():
    """
    Simulates scraping on a mock HTML listing to demonstrate parsing capability offline.
    """
    mock_html = """
    <html>
        <head><title>MyPreLove Scraper Mock Listing</title></head>
        <body>
            <div class="breadcrumb">Home > Tech > Smartphones</div>
            <h1 class="item-title">Apple iPhone 14 Pro 256GB - Deep Purple</h1>
            <div class="price-container">
                <span class="price-label">Price:</span>
                <span class="price-val">RM 3,250.00</span>
            </div>
            <div class="details">
                <p><strong>Condition:</strong> Excellent 9/10 condition. Battery health is 88%.</p>
                <p><strong>Posted:</strong> 3 days ago by user adamanwar</p>
                <p><strong>Description:</strong> Selling my iPhone 14 Pro due to upgrade. No scratches, comes with box.</p>
            </div>
        </body>
    </html>
    """
    print("=== RUNNING OFFLINE MOCK SCRAPER DEMO ===")
    parsed_data = parse_listing_html(mock_html)
    print("Parsed Data Output:")
    print(json.dumps(parsed_data, indent=4))
    return parsed_data

if __name__ == "__main__":
    run_mock_demo()
