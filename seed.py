import os

def create_demo_data():
    """Script to populate the database with multiple demo users and product data in English."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    import django
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Category, Item, Profile

    print("🧹 Cleaning up old demo data...")
    Item.objects.all().delete()

    # 1. Create Categories
    cats = {
        'Men': 'man',
        'Women': 'woman',
        'Tech': 'laptop-outline',
        'Books': 'book-outline',
        'Home & Living': 'home-outline',
        'Luxury': 'diamond-outline',
    }
    for name, icon in cats.items():
        Category.objects.update_or_create(name=name, defaults={'icon_name': icon})

    # 2. Create Demo Users with the SAME password
    demo_users = {
        'adamanwar': 'Adam Anwar',
        'ahmadzaki': 'Ahmad Zaki',
        'sitiaminah': 'Siti Aminah',
        'farhanrosli': 'Farhan Rosli',
        'nurulizzah': 'Nurul Izzah'
    }

    print("👥 Setting up demo users...")
    password = 'password123'
    for username, full_name in demo_users.items():
        user, created = User.objects.get_or_create(username=username, defaults={'email': f'{username}@example.com'})
        user.set_password(password)
        user.save()
        
        # Ensure profile exists (starts as unverified for fresh state)
        Profile.objects.get_or_create(user=user, defaults={'is_verified': False, 'trust_score': 0.0})

    # Create SUPERADMIN
    print("👑 Creating Superadmin...")
    admin_user, created = User.objects.get_or_create(username='superadmin', defaults={'email': 'admin@myprelove.com'})
    admin_user.set_password(password)
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    Profile.objects.get_or_create(user=admin_user, defaults={'is_verified': True})

    # 3. Create Sample Items assigned to different users
    category_men = Category.objects.get(name='Men')
    category_tech = Category.objects.get(name='Tech')
    category_women = Category.objects.get(name='Women')

    # Item 1 (Ahmad)
    Item.objects.create(
        name='Vintage Leather Satchel',
        seller=User.objects.get(username='ahmadzaki'),
        category=category_men,
        price=85.00,
        description='Meticulously cared for vintage leather bag. Extremely durable.',
        is_fully_functional=True,
        has_original_box=True,
        eco_impact=12.4
    )

    # Item 2 (Farhan)
    Item.objects.create(
        name='Fujifilm X-T3 Camera',
        seller=User.objects.get(username='farhanrosli'),
        category=category_tech,
        price=2850.00,
        description='Professional mirrorless digital camera. Lens 18-55mm included.',
        is_fully_functional=True,
        has_scratches=False,
        eco_impact=45.0
    )
    
    # Item 3 (Nurul)
    Item.objects.create(
        name='Denim Trucker Jacket',
        seller=User.objects.get(username='nurulizzah'),
        category=category_men,
        price=120.00,
        description='Classic denim jacket with a perfect vintage fade.',
        is_fully_functional=True,
        has_scratches=True,
        eco_impact=8.2
    )

    # Item 4 (Siti)
    Item.objects.create(
        name='Designer Silk Scarf',
        seller=User.objects.get(username='sitiaminah'),
        category=category_women,
        price=150.00,
        description='Custom designed silk scarf, never worn.',
        is_fully_functional=True,
        has_receipt=True,
        eco_impact=2.5
    )

    print("✅ All demo data updated to English successfully!")

if __name__ == "__main__":
    create_demo_data()
