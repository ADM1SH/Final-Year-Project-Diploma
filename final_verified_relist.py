import os
import django
from django.core.files import File
from django.conf import settings

def final_relist_with_correct_names():
    """
    Cleans the marketplace and re-lists items with 100% accurate names and mapping provided by user.
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, ItemImage

    print("🧹 Wiping old data for final accurate re-listing...")
    Item.objects.all().delete()

    source_dir = '/Users/adamanwar/Desktop/FYP/items'
    
    # Precise User provided list (31 items) - Cleaned names and refined categories
    user_list = [
        # Batch 1: Home & Electronics (10)
        {'name': 'Luxurious Deep Purple Velvet 2-Seater Sofa / Loveseat', 'cat': 'Home & Living', 'price': 1250.00, 'weight': 42.0},
        {'name': 'Sleek White Wired Mouse + Ergonomic Wrist-Rest Mouse Pad Combo', 'cat': 'Tech', 'price': 85.00, 'weight': 0.4},
        {'name': 'Premium Stainless Steel Side-by-Side Double Door Refrigerator', 'cat': 'Home & Living', 'price': 3500.00, 'weight': 95.0},
        {'name': 'Minimalist Royal Blue Ceramic Round Dinner Plate (Perfect Condition)', 'cat': 'Home & Living', 'price': 25.00, 'weight': 0.6},
        {'name': 'LG Slim Flat Screen TV with Stand – Great for Bedroom/Gaming', 'cat': 'Tech', 'price': 850.00, 'weight': 8.5},
        {'name': 'Apple iPod Nano Classic – Vibrant Pink (Collector\'s Item / Vintage Tech)', 'cat': 'Tech', 'price': 220.00, 'weight': 0.1},
        {'name': 'Cozy White Minimalist Table Lamp / Bedside Nightlight', 'cat': 'Home & Living', 'price': 45.00, 'weight': 1.2},
        {'name': 'Seiko Automatic Diver’s Watch with Heavy Duty Black Rubber Strap', 'cat': 'Luxury', 'price': 1100.00, 'weight': 0.2},
        {'name': 'Sennheiser Premium Over-Ear Open-Back Headphones (Crisp Audio)', 'cat': 'Tech', 'price': 980.00, 'weight': 0.3},
        {'name': 'SanDisk Sansa Clip MP3 Player – Ultra-Compact Black', 'cat': 'Tech', 'price': 120.00, 'weight': 0.05},
        
        # Batch 2: Guitars & Menswear (10)
        {'name': 'Fender Stratocaster Electric Guitar – Gloss Black with Tortoiseshell Pickguard', 'cat': 'Others', 'price': 2400.00, 'weight': 3.6},
        {'name': 'Squier Mini Stratocaster Electric Guitar – Torino Red (Mint Condition)', 'cat': 'Others', 'price': 650.00, 'weight': 2.8},
        {'name': 'Authentic Polo Ralph Lauren Black Cable-Knit Quarter-Zip Sweater', 'cat': 'Men', 'price': 320.00, 'weight': 0.5},
        {'name': 'Classic Navy Blue Crewneck Sweater with Grey Horizontal Stripes', 'cat': 'Men', 'price': 180.00, 'weight': 0.45},
        {'name': 'Ultra-Soft Fluffy Knit Crewneck Sweater – Midnight Blue', 'cat': 'Men', 'price': 150.00, 'weight': 0.4},
        {'name': 'Polo Ralph Lauren Cream/Beige Cable-Knit Quarter-Zip Sweater', 'cat': 'Men', 'price': 320.00, 'weight': 0.5},
        {'name': 'Polo Ralph Lauren Burgundy Striped-Trim Quarter-Zip Sweater', 'cat': 'Men', 'price': 280.00, 'weight': 0.5},
        {'name': 'Classic Nylon Tote Bag with Brown Leather Trim – Elegant Cream/Beige', 'cat': 'Women', 'price': 220.00, 'weight': 0.4},
        {'name': 'Vibrant Red Shoulder Bag with White Lace Bow Accents', 'cat': 'Women', 'price': 180.00, 'weight': 0.35},
        {'name': 'Fender Stratocaster Sunburst Electric Guitar + Fender Amplifier Combo Set', 'cat': 'Others', 'price': 3100.00, 'weight': 12.0},
        
        # Batch 3 & 4: Bags, Beanies, & Ladieswear (11)
        {'name': 'Authentic Coach Poppy Signature Monogram Canvas Handbag with Pink Trim', 'cat': 'Women', 'price': 450.00, 'weight': 0.5},
        {'name': 'Vintage Brown Leather Ruched Handbag with Ribbon & Cross Charms', 'cat': 'Women', 'price': 350.00, 'weight': 0.6},
        {'name': 'Classic Red & Green Plaid Tartan Flannel Pajama Set (Super Soft)', 'cat': 'Women', 'price': 120.00, 'weight': 0.8},
        {'name': 'Goth Grunge Black Ribbed Beanie Hat with Crochet Skull Patch', 'cat': 'Others', 'price': 65.00, 'weight': 0.1},
        {'name': 'Polo Ralph Lauren Striped Polo Bear Pajama Set', 'cat': 'Men', 'price': 280.00, 'weight': 0.9},
        {'name': 'Aesthetic Blue Knit Beanie Hat with White Star Pattern', 'cat': 'Others', 'price': 55.00, 'weight': 0.1},
        {'name': 'Flowy Red Paisley Halter Neck Midi Dress', 'cat': 'Women', 'price': 160.00, 'weight': 0.3},
        {'name': 'Vintage Dark Brown Leather Multi-Buckle Statement Shoulder Bag', 'cat': 'Women', 'price': 420.00, 'weight': 0.8},
        {'name': 'Floral Tapestry & Leather Handbag with Exquisite Beaded Details', 'cat': 'Women', 'price': 580.00, 'weight': 0.7},
        {'name': 'Pastel Purple, White & Cream Striped Crochet Beanie Hat', 'cat': 'Others', 'price': 45.00, 'weight': 0.1},
        {'name': 'Earthy Toned Abstract Floral Mesh Ruffle Strapless Dress Set', 'cat': 'Women', 'price': 240.00, 'weight': 0.4},
    ]

    # Map categories to icons (Matching seed.py exactly)
    category_icons = {
        'Men': 'man',
        'Women': 'woman',
        'Tech': 'laptop-outline',
        'Books': 'book-outline',
        'Home & Living': 'home-outline',
        'Luxury': 'diamond-outline',
        'Others': 'grid-outline'
    }

    for cat_name, icon in category_icons.items():
        Category.objects.get_or_create(name=cat_name, defaults={'icon_name': icon})

    # Precise Demo Users
    demo_usernames = ['ahmadzaki', 'sitiaminah', 'farhanrosli', 'nurulizzah']
    target_users = list(User.objects.filter(username__in=demo_usernames))
    
    if not target_users:
        target_users = list(User.objects.exclude(username__in=['superadmin', 'adamanwar']))
    
    if not target_users:
        print("❌ No users found in database. Run seed.py first.")
        return

    # Get sorted image files
    all_images = sorted([f for f in os.listdir(source_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
    
    num_to_list = min(len(all_images), len(user_list))
    print(f"📦 Generating {num_to_list} verified listings...")

    for i in range(num_to_list):
        img_name = all_images[i]
        item_data = user_list[i]
        user = target_users[i % len(target_users)]
        
        # Create the Item
        item = Item.objects.create(
            name=item_data['name'],
            seller=user,
            category=Category.objects.get(name=item_data['cat']),
            price=item_data['price'],
            description=f"Authentic pre-loved item: {item_data['name']}. Condition verified. Malaysian context, pricing in RM. Photos attached are of the actual item.",
            weight=item_data['weight'],
            is_fully_functional=True,
            is_clean=True,
            has_all_accessories=True,
            is_negotiable=(i % 2 == 0)
        )
        
        # Add the Image
        src_path = os.path.join(source_dir, img_name)
        with open(src_path, 'rb') as f:
            item_image = ItemImage(item=item)
            item_image.image.save(img_name, File(f), save=True)
            
        print(f"✅ [{i+1}] {item.name} -> {img_name} (@{user.username})")

    print(f"\n✨ SUCCESS: {num_to_list} items re-listed with proper labels, categories, and icons.")

if __name__ == "__main__":
    final_relist_with_correct_names()
