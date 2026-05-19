import os
import django
import shutil
from django.core.files import File
from django.conf import settings

def populate_listings_from_images():
    """
    Populates the database with detailed listings using images from the /items directory.
    Assigned to existing users (excluding superadmin and adamanwar).
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, ItemImage

    # 1. Setup Source and Destination
    source_dir = '/Users/adamanwar/Desktop/FYP/items'
    media_root = settings.MEDIA_ROOT
    items_media_dir = os.path.join(media_root, 'items')
    
    if not os.path.exists(items_media_dir):
        os.makedirs(items_media_dir)

    # 2. Get target users
    excluded_users = ['superadmin', 'adamanwar']
    target_users = list(User.objects.exclude(username__in=excluded_users))
    
    if not target_users:
        print("❌ No target users found. Please run seed.py first.")
        return

    # 3. Get images
    try:
        all_images = sorted([f for f in os.listdir(source_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
    except FileNotFoundError:
        print(f"❌ Source directory {source_dir} not found.")
        return

    if not all_images:
        print("❌ No images found in source directory.")
        return

    print(f"📸 Found {len(all_images)} images. Starting listing generation...")

    # 4. Define product templates for varied, detailed listings
    templates = [
        {
            'name': 'Apple MacBook Pro 14" (M2 Pro)',
            'cat': 'Tech',
            'price': 6800.00,
            'weight': 1.6,
            'desc': 'Space Gray MacBook Pro with M2 Pro chip. 16GB RAM, 512GB SSD. Used for less than a year for light design work. Condition is pristine with no visible scratches. Includes original 67W charger and braided cable.',
            'functional': True, 'scratches': False, 'box': True, 'receipt': True, 'clean': True, 'acc': True
        },
        {
            'name': 'Sony WH-1000XM5 Wireless Headphones',
            'cat': 'Tech',
            'price': 1100.00,
            'weight': 0.25,
            'desc': 'Industry-leading noise canceling headphones in Silver. Excellent battery health. Worn occasionally, sanitized regularly. Comes with original carrying case and all cables.',
            'functional': True, 'scratches': False, 'box': True, 'receipt': False, 'clean': True, 'acc': True
        },
        {
            'name': 'Mens Slim-Fit Italian Wool Suit',
            'cat': 'Men',
            'price': 450.00,
            'weight': 1.2,
            'desc': 'Dark charcoal wool suit, tailored for a slim fit. Only worn twice for weddings. Dry cleaned and ready for use. High quality fabric with premium lining.',
            'functional': True, 'scratches': False, 'box': False, 'receipt': False, 'clean': True, 'acc': True
        },
        {
            'name': 'Mechanical Gaming Keyboard (RGB)',
            'cat': 'Tech',
            'price': 280.00,
            'weight': 0.8,
            'desc': 'Tactile switches with customizable RGB lighting. Fully cleaned and keys tested. Solid aluminum frame. Connects via USB-C.',
            'functional': True, 'scratches': True, 'box': True, 'receipt': True, 'clean': True, 'acc': True
        },
        {
            'name': 'Womens Designer Handbag',
            'cat': 'Women',
            'price': 1200.00,
            'weight': 0.7,
            'desc': 'Premium leather handbag in tan. Classic design that fits all essentials. Well-maintained leather with minor wear on the bottom corners. Interior is spotless.',
            'functional': True, 'scratches': True, 'box': False, 'receipt': True, 'clean': True, 'acc': True
        },
        {
            'name': 'Vintage 35mm Film Camera',
            'cat': 'Tech',
            'price': 350.00,
            'weight': 0.6,
            'desc': 'Classic film camera for enthusiasts. Fully manual. Shutter speeds are accurate. Lens is clean with no fungus. Perfect for lomography and street photography.',
            'functional': True, 'scratches': True, 'box': False, 'receipt': False, 'clean': True, 'acc': False
        },
        {
            'name': 'Minimalist Oak Coffee Table',
            'cat': 'Home & Living',
            'price': 220.00,
            'weight': 8.5,
            'desc': 'Solid oak coffee table with a natural finish. Sturdy and clean design. Small water ring mark on top, otherwise perfect. Fits well in modern living rooms.',
            'functional': True, 'scratches': True, 'box': False, 'receipt': False, 'clean': True, 'acc': True
        },
        {
            'name': 'Leather Chelsea Boots',
            'cat': 'Men',
            'price': 180.00,
            'weight': 1.1,
            'desc': 'Handcrafted leather boots with elastic side panels. Only worn for one season. Well-conditioned leather. Soles have plenty of life left.',
            'functional': True, 'scratches': True, 'box': True, 'receipt': False, 'clean': True, 'acc': True
        }
    ]

    # Ensure categories exist
    for cat_name in set(t['cat'] for t in templates):
        Category.objects.get_or_create(name=cat_name, defaults={'icon_name': 'cube-outline'})

    # 5. Distribute images and create listings
    num_users = len(target_users)
    
    for i, img_name in enumerate(all_images):
        user = target_users[i % num_users]
        template = templates[i % len(templates)]
        category = Category.objects.get(name=template['cat'])
        
        # Create the Item
        item = Item.objects.create(
            name=f"{template['name']} #{i+1}",
            seller=user,
            category=category,
            price=template['price'],
            description=template['desc'],
            weight=template['weight'],
            is_fully_functional=template['functional'],
            has_scratches=template['scratches'],
            has_original_box=template['box'],
            has_receipt=template['receipt'],
            is_clean=template['clean'],
            has_all_accessories=template['acc'],
            is_negotiable=(i % 2 == 0) # Every second item is negotiable
        )
        
        # Add the Image
        src_path = os.path.join(source_dir, img_name)
        with open(src_path, 'rb') as f:
            item_image = ItemImage(item=item)
            item_image.image.save(img_name, File(f), save=True)
            
        print(f"✅ Listed: {item.name} for user @{user.username}")

    print(f"\n✨ Successfully generated {len(all_images)} detailed listings!")

if __name__ == "__main__":
    populate_listings_from_images()
