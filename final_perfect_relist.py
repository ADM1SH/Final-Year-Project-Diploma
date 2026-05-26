import os
import django
from django.core.files import File
from django.conf import settings

def final_perfect_relist():
    """
    Cleans the marketplace and re-lists items with 100% VISUALLY VERIFIED mapping.
    Uses the golden source from verified_populate.py.
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, ItemImage, Notification

    print("🧹 Wiping old data (Items & Notifications) for DEFINITIVE re-listing...")
    Item.objects.all().delete()
    Notification.objects.all().delete()

    source_dir = '/Users/adamanwar/Desktop/FYP/items'
    
    # ... (mapping remains same) ...
    perfect_mapping = [
        # Batch 1: Home & Electronics
        {'name': 'Luxurious Deep Purple Velvet 2-Seater Sofa / Loveseat', 'cat': 'Home & Living', 'price': 1250.00, 'weight': 42.0, 'img': 'WhatsApp Image 2026-05-17 at 12.06.48 (2).jpeg'},
        {'name': 'Sleek White Wired Mouse + Ergonomic Wrist-Rest Mouse Pad Combo', 'cat': 'Tech', 'price': 85.00, 'weight': 0.4, 'img': 'WhatsApp Image 2026-05-17 at 12.06.49 (1).jpeg'},
        {'name': 'Premium Stainless Steel Side-by-Side Double Door Refrigerator', 'cat': 'Home & Living', 'price': 3500.00, 'weight': 95.0, 'img': 'WhatsApp Image 2026-05-17 at 12.06.48.jpeg'},
        {'name': 'Minimalist Royal Blue Ceramic Round Dinner Plate (Perfect Condition)', 'cat': 'Home & Living', 'price': 25.00, 'weight': 0.6, 'img': 'WhatsApp Image 2026-05-17 at 12.06.50 (1).jpeg'},
        {'name': 'LG Slim Flat Screen TV with Stand – Great for Bedroom/Gaming', 'cat': 'Tech', 'price': 850.00, 'weight': 8.5, 'img': 'WhatsApp Image 2026-05-17 at 12.06.51 (1).jpeg'},
        {'name': 'Apple iPod Nano Classic – Vibrant Pink (Collector\'s Item / Vintage Tech)', 'cat': 'Tech', 'price': 220.00, 'weight': 0.1, 'img': 'WhatsApp Image 2026-05-17 at 12.06.50 (2).jpeg'},
        {'name': 'Cozy White Minimalist Table Lamp / Bedside Nightlight', 'cat': 'Home & Living', 'price': 45.00, 'weight': 1.2, 'img': 'WhatsApp Image 2026-05-17 at 12.06.50.jpeg'},
        {'name': 'Seiko Automatic Diver’s Watch with Heavy Duty Black Rubber Strap', 'cat': 'Luxury', 'price': 1100.00, 'weight': 0.2, 'img': 'WhatsApp Image 2026-05-17 at 12.06.48 (1).jpeg'},
        {'name': 'Sennheiser Premium Over-Ear Open-Back Headphones (Crisp Audio)', 'cat': 'Tech', 'price': 980.00, 'weight': 0.3, 'img': 'WhatsApp Image 2026-05-17 at 12.06.49.jpeg'},
        {'name': 'SanDisk Sansa Clip MP3 Player – Ultra-Compact Black', 'cat': 'Tech', 'price': 120.00, 'weight': 0.05, 'img': 'WhatsApp Image 2026-05-17 at 12.06.51.jpeg'},

        # Batch 2: Guitars & Menswear
        {'name': 'Fender Stratocaster Electric Guitar – Gloss Black with Tortoiseshell Pickguard', 'cat': 'Others', 'price': 2400.00, 'weight': 3.6, 'img': 'WhatsApp Image 2026-05-17 at 13.39.50.jpeg'},
        {'name': 'Squier Mini Stratocaster Electric Guitar – Torino Red (Mint Condition)', 'cat': 'Others', 'price': 650.00, 'weight': 2.8, 'img': 'WhatsApp Image 2026-05-17 at 13.39.49.jpeg'},
        {'name': 'Authentic Polo Ralph Lauren Black Cable-Knit Quarter-Zip Sweater', 'cat': 'Men', 'price': 320.00, 'weight': 0.5, 'img': 'WhatsApp Image 2026-05-17 at 13.39.51 (1).jpeg'},
        {'name': 'Classic Navy Blue Crewneck Sweater with Grey Horizontal Stripes', 'cat': 'Men', 'price': 180.00, 'weight': 0.45, 'img': 'WhatsApp Image 2026-05-17 at 13.39.51.jpeg'},
        {'name': 'Ultra-Soft Fluffy Knit Crewneck Sweater – Midnight Blue', 'cat': 'Men', 'price': 150.00, 'weight': 0.4, 'img': 'WhatsApp Image 2026-05-17 at 13.39.52 (1).jpeg'},
        {'name': 'Polo Ralph Lauren Cream/Beige Cable-Knit Quarter-Zip Sweater', 'cat': 'Men', 'price': 320.00, 'weight': 0.5, 'img': 'WhatsApp Image 2026-05-17 at 13.39.52 (2).jpeg'},
        {'name': 'Polo Ralph Lauren Burgundy Striped-Trim Quarter-Zip Sweater', 'cat': 'Men', 'price': 280.00, 'weight': 0.5, 'img': 'WhatsApp Image 2026-05-17 at 13.39.52.jpeg'},
        {'name': 'Classic Nylon Tote Bag with Brown Leather Trim – Elegant Cream/Beige', 'cat': 'Women', 'price': 220.00, 'weight': 0.4, 'img': 'WhatsApp Image 2026-05-17 at 13.39.53 (1).jpeg'},
        {'name': 'Vibrant Red Shoulder Bag with White Lace Bow Accents', 'cat': 'Women', 'price': 180.00, 'weight': 0.35, 'img': 'WhatsApp Image 2026-05-17 at 13.39.53 (2).jpeg'},
        {'name': 'Fender Stratocaster Sunburst Electric Guitar + Fender Amplifier Combo Set', 'cat': 'Others', 'price': 3100.00, 'weight': 12.0, 'img': 'WhatsApp Image 2026-05-17 at 13.39.49 (1).jpeg'},

        # Batch 3 & 4: Bags & Accessories
        {'name': 'Authentic Coach Poppy Signature Monogram Canvas Handbag with Pink Trim', 'cat': 'Women', 'price': 450.00, 'weight': 0.5, 'img': 'WhatsApp Image 2026-05-17 at 13.39.53.jpeg'},
        {'name': 'Vintage Brown Leather Ruched Handbag with Ribbon & Cross Charms', 'cat': 'Women', 'price': 350.00, 'weight': 0.6, 'img': 'WhatsApp Image 2026-05-17 at 13.39.54 (2).jpeg'},
        {'name': 'Classic Red & Green Plaid Tartan Flannel Pajama Set (Super Soft)', 'cat': 'Women', 'price': 120.00, 'weight': 0.8, 'img': 'WhatsApp Image 2026-05-17 at 13.39.54 (3).jpeg'},
        {'name': 'Goth Grunge Black Ribbed Beanie Hat with Crochet Skull Patch', 'cat': 'Others', 'price': 65.00, 'weight': 0.1, 'img': 'WhatsApp Image 2026-05-17 at 13.39.55.jpeg'},
        {'name': 'Polo Ralph Lauren Striped Polo Bear Pajama Set', 'cat': 'Men', 'price': 280.00, 'weight': 0.9, 'img': 'WhatsApp Image 2026-05-17 at 13.39.57 (1).jpeg'},
        {'name': 'Y2K Aesthetic Blue Knit Beanie Hat with White Star Pattern', 'cat': 'Others', 'price': 55.00, 'weight': 0.1, 'img': 'WhatsApp Image 2026-05-17 at 13.39.57 (2).jpeg'},
        {'name': 'Flowy Red Paisley Halter Neck Midi Dress', 'cat': 'Women', 'price': 160.00, 'weight': 0.3, 'img': 'WhatsApp Image 2026-05-17 at 13.39.57.jpeg'},
        {'name': 'Vintage Dark Brown Leather Multi-Buckle Statement Shoulder Bag', 'cat': 'Women', 'price': 420.00, 'weight': 0.8, 'img': 'WhatsApp Image 2026-05-17 at 13.39.54.jpeg'},
        {'name': 'Floral Tapestry & Leather Handbag with Exquisite Beaded Details', 'cat': 'Women', 'price': 580.00, 'weight': 0.7, 'img': 'WhatsApp Image 2026-05-17 at 13.39.54 (1).jpeg'},
        {'name': 'Pastel Purple, White & Cream Striped Crochet Beanie Hat', 'cat': 'Others', 'price': 45.00, 'weight': 0.1, 'img': 'WhatsApp Image 2026-05-17 at 13.39.58 (1).jpeg'},
        {'name': 'Earthy Toned Abstract Floral Mesh Ruffle Strapless Dress Set', 'cat': 'Women', 'price': 240.00, 'weight': 0.4, 'img': 'WhatsApp Image 2026-05-17 at 13.39.58.jpeg'},
    ]

    # Map categories to icons
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
    all_users = list(User.objects.all())
    target_users = list(User.objects.filter(username__in=demo_usernames))
    
    if not target_users:
        target_users = list(User.objects.exclude(username__in=['superadmin', 'adamanwar']))

    print(f"📦 Generating {len(perfect_mapping)} DEFINITIVELY mapped listings...")

    created_items = []
    for i, item_data in enumerate(perfect_mapping):
        user = target_users[i % len(target_users)]
        
        # Create the Item
        item = Item.objects.create(
            name=item_data['name'],
            seller=user,
            category=Category.objects.get(name=item_data['cat']),
            price=item_data['price'],
            description=f"Authentic {item_data['name']}. Visually verified quality. Malaysian context, pricing in RM. Photos attached are of the actual item.",
            weight=item_data['weight'],
            is_fully_functional=True,
            is_clean=True,
            has_all_accessories=True,
            is_negotiable=(i % 2 == 0)
        )
        created_items.append(item)
        
        # Add the Image
        img_name = item_data['img']
        src_path = os.path.join(source_dir, img_name)
        if os.path.exists(src_path):
            with open(src_path, 'rb') as f:
                item_image = ItemImage(item=item)
                item_image.image.save(img_name, File(f), save=True)
            print(f"✅ [{i+1}] {item.name} -> {img_name}")
        else:
            print(f"❌ [{i+1}] IMAGE NOT FOUND: {img_name}")

    # Generate test notifications for EVERYONE to test deep-linking
    fridge_item = next(it for it in created_items if 'Refrigerator' in it.name)
    sofa_item = next(it for it in created_items if 'Sofa' in it.name)

    print("\n📣 Creating Spotlight Notifications for all users...")
    for u in all_users:
        Notification.objects.create(
            user=u,
            title="Featured Listing!",
            content=f"Check out this Premium Refrigerator now live!",
            related_id=fridge_item.id
        )
        Notification.objects.create(
            user=u,
            title="Featured Listing!",
            content=f"New Furniture: Luxurious Velvet Sofa is now available.",
            related_id=sofa_item.id
        )

    print(f"\n✨ FINAL DEFINITIVE RESTORATION COMPLETE: 31 items and fresh notifications created.")

if __name__ == "__main__":
    final_perfect_relist()
