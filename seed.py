import os

def create_demo_data():
    """Script to populate the database with superadmin, multiple demo users and Malaysian product data."""
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
        
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.is_verified = True
        profile.save()

    # Create SUPERADMIN
    print("👑 Creating Superadmin...")
    admin_user, created = User.objects.get_or_create(username='superadmin', defaults={'email': 'admin@myprelove.com'})
    admin_user.set_password(password)
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    Profile.objects.get_or_create(user=admin_user, defaults={'is_verified': True})

    # 3. Create Sample Items
    category_men = Category.objects.get(name='Men')
    category_tech = Category.objects.get(name='Tech')
    category_women = Category.objects.get(name='Women')

    # Item 1 (Ahmad)
    Item.objects.create(
        name='Vintage Leather Satchel',
        seller=User.objects.get(username='ahmadzaki'),
        category=category_men,
        price=85.00,
        description='Beg kulit vintaj yang dijaga rapi. Lokasi: Shah Alam.',
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
        description='Kamera digital mirrorless professional. Lokasi: Kuala Lumpur.',
        is_fully_functional=True,
        has_scratches=False,
        eco_impact=45.0
    )

    print("✅ Superadmin account set: username 'superadmin', password 'password123'")
    print("✅ All demo data created successfully!")

if __name__ == "__main__":
    create_demo_data()
