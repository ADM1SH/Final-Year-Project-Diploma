import os
import django
from django.core.files import File
from django.conf import settings

def verified_final_populate():
    """
    Final accurate population using visually verified 1:1 mapping.
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, ItemImage

    print("🧹 Cleaning up old items...")
    Item.objects.all().delete()

    source_dir = '/Users/adamanwar/Desktop/FYP/items'
    target_users = list(User.objects.exclude(username__in=['superadmin', 'adamanwar']))
    
    # 1:1 Visually Verified Mapping
    mapping = [
        # Batch 1
        {'name': 'Luxurious Deep Purple Velvet 2-Seater Sofa / Loveseat', 'file': 'WhatsApp Image 2026-05-17 at 12.06.48 (2).jpeg', 'cat': 'Home & Living', 'price': 1250.00, 'weight': 42.0},
        {'name': 'Sleek White Wired Mouse + Ergonomic Wrist-Rest Mouse Pad Combo', 'file': 'WhatsApp Image 2026-05-17 at 12.06.49 (1).jpeg', 'cat': 'Tech', 'price': 85.00, 'weight': 0.4},
        {'name': 'Premium Stainless Steel Side-by-Side Double Door Refrigerator', 'file': 'WhatsApp Image 2026-05-17 at 12.06.48.jpeg', 'cat': 'Home & Living', 'price': 3500.00, 'weight': 95.0},
        {'name': 'Minimalist Royal Blue Ceramic Round Dinner Plate (Perfect Condition)', 'file': 'WhatsApp Image 2026-05-17 at 12.06.50 (1).jpeg', 'cat': 'Home & Living', 'price': 25.00, 'weight': 0.6},
        {'name': 'LG Slim Flat Screen TV with Stand – Great for Bedroom/Gaming', 'file': 'WhatsApp Image 2026-05-17 at 12.06.51 (1).jpeg', 'cat': 'Tech', 'price': 850.00, 'weight': 8.5},
        {'name': 'Apple iPod Nano Classic – Vibrant Pink (Collector\'s Item / Vintage Tech)', 'file': 'WhatsApp Image 2026-05-17 at 12.06.50 (2).jpeg', 'cat': 'Tech', 'price': 220.00, 'weight': 0.1},
        {'name': 'Cozy White Minimalist Table Lamp / Bedside Nightlight', 'file': 'WhatsApp Image 2026-05-17 at 12.06.50.jpeg', 'cat': 'Home & Living', 'price': 45.00, 'weight': 1.2},
        {'name': 'Seiko Automatic Diver’s Watch with Heavy Duty Black Rubber Strap', 'file': 'WhatsApp Image 2026-05-17 at 12.06.48 (1).jpeg', 'cat': 'Men', 'price': 1100.00, 'weight': 0.2},
        {'name': 'Sennheiser Premium Over-Ear Open-Back Headphones (Crisp Audio)', 'file': 'WhatsApp Image 2026-05-17 at 12.06.49.jpeg', 'cat': 'Tech', 'price': 980.00, 'weight': 0.3},
        {'name': 'SanDisk Sansa Clip MP3 Player – Ultra-Compact Black', 'file': 'WhatsApp Image 2026-05-17 at 12.06.51.jpeg', 'cat': 'Tech', 'price': 120.00, 'weight': 0.05},

        # Batch 2
        {'name': 'Fender Stratocaster Electric Guitar – Gloss Black with Tortoiseshell Pickguard', 'file': 'WhatsApp Image 2026-05-17 at 13.39.50.jpeg', 'cat': 'Tech', 'price': 2400.00, 'weight': 3.6},
        {'name': 'Squier Mini Stratocaster Electric Guitar – Torino Red (Mint Condition)', 'file': 'WhatsApp Image 2026-05-17 at 13.39.49.jpeg', 'cat': 'Tech', 'price': 650.00, 'weight': 2.8},
        {'name': 'Authentic Polo Ralph Lauren Black Cable-Knit Quarter-Zip Sweater', 'file': 'WhatsApp Image 2026-05-17 at 13.39.51 (1).jpeg', 'cat': 'Men', 'price': 320.00, 'weight': 0.5},
        {'name': 'Classic Navy Blue Crewneck Sweater with Grey Horizontal Stripes', 'file': 'WhatsApp Image 2026-05-17 at 13.39.51.jpeg', 'cat': 'Men', 'price': 180.00, 'weight': 0.45},
        {'name': 'Ultra-Soft Fluffy Knit Crewneck Sweater – Midnight Blue', 'file': 'WhatsApp Image 2026-05-17 at 13.39.52 (1).jpeg', 'cat': 'Men', 'price': 150.00, 'weight': 0.4},
        {'name': 'Polo Ralph Lauren Cream/Beige Cable-Knit Quarter-Zip Sweater', 'file': 'WhatsApp Image 2026-05-17 at 13.39.52 (2).jpeg', 'cat': 'Men', 'price': 320.00, 'weight': 0.5},
        {'name': 'Polo Ralph Lauren Burgundy Striped-Trim Quarter-Zip Sweater', 'file': 'WhatsApp Image 2026-05-17 at 13.39.52.jpeg', 'cat': 'Men', 'price': 280.00, 'weight': 0.5},
        {'name': 'Classic Nylon Tote Bag with Brown Leather Trim – Elegant Cream/Beige', 'file': 'WhatsApp Image 2026-05-17 at 13.39.53 (1).jpeg', 'cat': 'Women', 'price': 220.00, 'weight': 0.4},
        {'name': 'Vibrant Red Shoulder Bag with White Lace Bow Accents', 'file': 'WhatsApp Image 2026-05-17 at 13.39.53 (2).jpeg', 'cat': 'Women', 'price': 180.00, 'weight': 0.35},
        {'name': 'Fender Stratocaster Sunburst Electric Guitar + Fender Amplifier Combo Set', 'file': 'WhatsApp Image 2026-05-17 at 13.39.49 (1).jpeg', 'cat': 'Tech', 'price': 3100.00, 'weight': 12.0},

        # Batch 3 & 4
        {'name': 'Authentic Coach Poppy Signature Monogram Canvas Handbag with Pink Trim', 'file': 'WhatsApp Image 2026-05-17 at 13.39.53.jpeg', 'cat': 'Women', 'price': 450.00, 'weight': 0.5},
        {'name': 'Vintage Brown Leather Ruched Handbag with Ribbon & Cross Charms', 'file': 'WhatsApp Image 2026-05-17 at 13.39.54 (2).jpeg', 'cat': 'Women', 'price': 350.00, 'weight': 0.6},
        {'name': 'Classic Red & Green Plaid Tartan Flannel Pajama Set (Super Soft)', 'file': 'WhatsApp Image 2026-05-17 at 13.39.54 (3).jpeg', 'cat': 'Women', 'price': 120.00, 'weight': 0.8},
        {'name': 'Goth Grunge Black Ribbed Beanie Hat with Crochet Skull Patch', 'file': 'WhatsApp Image 2026-05-17 at 13.39.55.jpeg', 'cat': 'Men', 'price': 65.00, 'weight': 0.1},
        {'name': 'Polo Ralph Lauren Striped Polo Bear Pajama Set', 'file': 'WhatsApp Image 2026-05-17 at 13.39.57 (1).jpeg', 'cat': 'Men', 'price': 280.00, 'weight': 0.9},
        {'name': 'Y2K Aesthetic Blue Knit Beanie Hat with White Star Pattern', 'file': 'WhatsApp Image 2026-05-17 at 13.39.57 (2).jpeg', 'cat': 'Men', 'price': 55.00, 'weight': 0.1},
        {'name': 'Flowy Red Paisley Halter Neck Midi Dress', 'file': 'WhatsApp Image 2026-05-17 at 13.39.57.jpeg', 'cat': 'Women', 'price': 160.00, 'weight': 0.3},
        {'name': 'Vintage Dark Brown Leather Multi-Buckle Statement Shoulder Bag', 'file': 'WhatsApp Image 2026-05-17 at 13.39.54.jpeg', 'cat': 'Women', 'price': 420.00, 'weight': 0.8},
        {'name': 'Floral Tapestry & Leather Handbag with Exquisite Beaded Details', 'file': 'WhatsApp Image 2026-05-17 at 13.39.54 (1).jpeg', 'cat': 'Women', 'price': 580.00, 'weight': 0.7},
        {'name': 'Pastel Purple, White & Cream Striped Crochet Beanie Hat', 'file': 'WhatsApp Image 2026-05-17 at 13.39.58 (1).jpeg', 'cat': 'Women', 'price': 45.00, 'weight': 0.1},
        {'name': 'Earthy Toned Abstract Floral Mesh Ruffle Strapless Dress Set', 'file': 'WhatsApp Image 2026-05-17 at 13.39.58.jpeg', 'cat': 'Women', 'price': 240.00, 'weight': 0.4},
    ]

    # Map categories
    cat_objs = {}
    for data in mapping:
        if data['cat'] not in cat_objs:
            obj, _ = Category.objects.get_or_create(name=data['cat'], defaults={'icon_name': 'cube-outline'})
            cat_objs[data['cat']] = obj

    print(f"📦 Re-listing {len(mapping)} verified items...")

    for i, data in enumerate(mapping):
        user = target_users[i % len(target_users)]
        
        # Create Item
        item = Item.objects.create(
            name=data['name'],
            seller=user,
            category=cat_objs[data['cat']],
            price=data['price'],
            description=f"Authentic {data['name']}. Visually verified quality. Excellent pre-loved condition. Malaysian standard pricing in RM.",
            weight=data['weight'],
            is_fully_functional=True,
            is_clean=True,
            has_all_accessories=True,
            is_negotiable=(i % 2 == 0)
        )
        
        # Save Image
        img_path = os.path.join(source_dir, data['file'])
        if os.path.exists(img_path):
            with open(img_path, 'rb') as f:
                img_obj = ItemImage(item=item)
                img_obj.image.save(data['file'], File(f), save=True)
            print(f"✅ [{i+1}] {item.name} -> {data['file']}")
        else:
            print(f"❌ File missing: {data['file']}")

    print("\n✨ FINAL VERIFIED MARKETPLACE READY.")

if __name__ == "__main__":
    verified_final_populate()
