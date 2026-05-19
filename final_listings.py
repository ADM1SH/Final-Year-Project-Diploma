import os
import django
from django.core.files import File
from django.conf import settings

def generate_final_listings():
    """
    Generates 31 unique, detailed listings for the marketplace.
    Ensures NO duplicates and realistic Malaysian context.
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, ItemImage

    print("🧹 Cleaning up old items...")
    Item.objects.all().delete()

    source_dir = '/Users/adamanwar/Desktop/FYP/items'
    target_users = list(User.objects.exclude(username__in=['superadmin', 'adamanwar']))
    
    if not target_users:
        print("❌ No users to assign items to.")
        return

    # 31 Unique Product Data
    unique_products = [
        {'name': 'iPhone 13 Pro (128GB, Sierra Blue)', 'cat': 'Tech', 'price': 2850.00, 'weight': 0.2, 'desc': 'Condition 9/10. Battery health 88%. No scratches on screen. Box and cable included.'},
        {'name': 'Samsung Galaxy S22 Ultra (Phantom Black)', 'cat': 'Tech', 'price': 2400.00, 'weight': 0.23, 'desc': 'Huge 6.8 inch display. S-Pen included. Small dent on bottom corner but works perfectly.'},
        {'name': 'Apple iPad Air 5 (WiFi, Space Gray)', 'cat': 'Tech', 'price': 2100.00, 'weight': 0.46, 'desc': 'M1 chip model. Fast and light. Perfect for students. Apple Pencil 2nd gen compatible.'},
        {'name': 'Sony PlayStation 5 (Disc Edition)', 'cat': 'Tech', 'price': 1850.00, 'weight': 4.5, 'desc': 'Hardly used. Comes with 2 controllers and 3 games (Spider-Man, FIFA). Original box available.'},
        {'name': 'Xbox Series X Console', 'cat': 'Tech', 'price': 1700.00, 'weight': 4.4, 'desc': 'Powerful 4K gaming. Quiet and cool. Includes original controller and power cable.'},
        {'name': 'Canon EOS R6 Mirrorless Camera', 'cat': 'Tech', 'price': 6200.00, 'weight': 0.68, 'desc': 'Pro-grade camera. Body only. Shutter count below 10k. Well maintained in dry box.'},
        {'name': 'Fujifilm X100V Digital Camera', 'cat': 'Tech', 'price': 5800.00, 'weight': 0.47, 'desc': 'Hard to find model. Excellent condition. Includes thumb grip and lens hood.'},
        {'name': 'GoPro Hero 11 Black', 'cat': 'Tech', 'price': 1350.00, 'weight': 0.15, 'desc': 'Used for only one trip. Includes 2 extra batteries and chest mount.'},
        {'name': 'Bose QuietComfort 45 Headphones', 'cat': 'Tech', 'price': 950.00, 'weight': 0.24, 'desc': 'Best noise cancellation. Very comfortable for long flights. Like new condition.'},
        {'name': 'Apple AirPods Max (Silver)', 'cat': 'Tech', 'price': 1750.00, 'weight': 0.38, 'desc': 'Premium audio. Mesh head band is clean. Smart case and lighting cable included.'},
        {'name': 'Dell XPS 13 Laptop (9310)', 'cat': 'Tech', 'price': 3400.00, 'weight': 1.2, 'desc': 'i7 processor, 16GB RAM, 512GB SSD. Beautiful infinity edge display. Very portable.'},
        {'name': 'Razer BlackWidow V3 Keyboard', 'cat': 'Tech', 'price': 450.00, 'weight': 1.0, 'desc': 'Green clicky switches. Customizable Chroma RGB. Fully functional and cleaned.'},
        {'name': 'Logitech MX Master 3S Mouse', 'cat': 'Tech', 'price': 320.00, 'weight': 0.14, 'desc': 'Ergonomic design. Silent clicks. Flow control works great for multiple devices.'},
        {'name': 'Herman Miller Aeron Chair (Size B)', 'cat': 'Home & Living', 'price': 2800.00, 'weight': 18.0, 'desc': 'Post-fit lumbar support. Mesh is tight. No squeaks. Investment for your back.'},
        {'name': 'IKEA Alex Drawer Unit', 'cat': 'Home & Living', 'price': 180.00, 'weight': 25.0, 'desc': 'Classic white drawers. Perfect for desk setups. A few minor surface scratches.'},
        {'name': 'Dyson Airwrap Multi-Styler', 'cat': 'Women', 'price': 1950.00, 'weight': 0.6, 'desc': 'Complete set with all attachments. Nickel/Copper color. Used for 6 months.'},
        {'name': 'Nespresso Vertuo Coffee Machine', 'cat': 'Home & Living', 'price': 650.00, 'weight': 4.0, 'desc': 'Brews large cups of coffee. Free starter pack of capsules included. Descaled recently.'},
        {'name': 'Instant Pot Duo 7-in-1', 'cat': 'Home & Living', 'price': 380.00, 'weight': 5.2, 'desc': 'Pressure cooker, slow cooker, rice cooker etc. Essential kitchen appliance. 6 Quart size.'},
        {'name': 'Le Creuset Dutch Oven (24cm, Cerise)', 'cat': 'Home & Living', 'price': 980.00, 'weight': 4.3, 'desc': 'Iconic cast iron pot. Lifetime warranty. Used carefully, no chips in enamel.'},
        {'name': 'Patagonia Torrentshell 3L Jacket', 'cat': 'Men', 'price': 420.00, 'weight': 0.4, 'desc': 'High performance waterproof jacket. Size M. Used for hiking in New Zealand.'},
        {'name': 'North Face Nuptse 1996 Puffer', 'cat': 'Men', 'price': 850.00, 'weight': 0.7, 'desc': 'Very warm down jacket. Classic 700-fill. Black color, size L. Dry cleaned.'},
        {'name': 'Adidas Ultraboost 22 (Triple Black)', 'cat': 'Men', 'price': 350.00, 'weight': 0.65, 'desc': 'Extremely comfortable running shoes. Size UK 10. Minimal wear on soles.'},
        {'name': 'Converse Chuck 70 (Parchment)', 'cat': 'Men', 'price': 180.00, 'weight': 0.8, 'desc': 'Higher quality than regular chucks. Vintage look. Size UK 9.'},
        {'name': 'Levi\'s 501 Original Fit Jeans', 'cat': 'Men', 'price': 150.00, 'weight': 0.6, 'desc': 'Classic straight leg. Waist 32, Length 30. Worn-in look, very soft denim.'},
        {'name': 'Fossil Gen 6 Smartwatch', 'cat': 'Tech', 'price': 680.00, 'weight': 0.15, 'desc': 'Wear OS by Google. Fast charging. Brown leather strap. Clean screen.'},
        {'name': 'Kindle Paperwhite 11th Gen (8GB)', 'cat': 'Tech', 'price': 480.00, 'weight': 0.2, 'desc': '6.8 inch display with warm light. Waterproof. Battery lasts for weeks.'},
        {'name': 'Fender Player Stratocaster (Black)', 'cat': 'Tech', 'price': 2200.00, 'weight': 3.6, 'desc': 'Mexican made Strat. Maple fretboard. Low action. Plays beautifully.'},
        {'name': 'Marshall Emberton Portable Speaker', 'cat': 'Tech', 'price': 420.00, 'weight': 0.7, 'desc': 'Compact but loud. 20+ hours of playtime. IPX7 waterproof. Classic Marshall look.'},
        {'name': 'DJI Mini 3 Pro (RC Controller)', 'cat': 'Tech', 'price': 3200.00, 'weight': 0.24, 'desc': 'Under 249g. No FAA registration needed. 4K HDR video. Never crashed.'},
        {'name': 'Hydro Flask (32oz Wide Mouth)', 'cat': 'Home & Living', 'price': 120.00, 'weight': 0.43, 'desc': 'Keeps drinks cold for 24 hours. Flex cap included. No dents.'},
        {'name': 'Herschel Little America Backpack', 'cat': 'Men', 'price': 250.00, 'weight': 0.9, 'desc': '25L volume. Laptop sleeve. Red/Blue color scheme. Clean and ready for use.'}
    ]

    # Ensure categories exist
    for cat_name in set(t['cat'] for t in unique_products):
        Category.objects.get_or_create(name=cat_name, defaults={'icon_name': 'cube-outline'})

    all_images = sorted([f for f in os.listdir(source_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
    
    print(f"📦 Generating {len(all_images)} unique listings...")

    for i, img_name in enumerate(all_images):
        user = target_users[i % len(target_users)]
        prod_data = unique_products[i] # 1:1 mapping ensures no duplicates
        
        item = Item.objects.create(
            name=prod_data['name'],
            seller=user,
            category=Category.objects.get(name=prod_data['cat']),
            price=prod_data['price'],
            description=prod_data['desc'],
            weight=prod_data['weight'],
            is_fully_functional=True,
            is_clean=True,
            has_all_accessories=True,
            is_negotiable=(i % 2 == 0)
        )
        
        src_path = os.path.join(source_dir, img_name)
        with open(src_path, 'rb') as f:
            item_image = ItemImage(item=item)
            item_image.image.save(img_name, File(f), save=True)
            
        print(f"✅ Listed: {item.name} for @{user.username}")

    print("\n✨ FINAL GENERATION COMPLETE: 31 unique, professional listings in RM.")

if __name__ == "__main__":
    generate_final_listings()
