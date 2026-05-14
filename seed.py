import os

def create_demo_data():
    """Script to populate the database with real-world Malaysian product data."""
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

    # 2. Create Demo User
    user, created = User.objects.get_or_create(username='adamanwar', defaults={'email': 'adam@example.com'})
    user.set_password('password123')
    user.save()
    
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.is_verified = True
    profile.save()

    # Additional Malaysian Sellers
    sellers = ['Ahmad Zaki', 'Siti Aminah', 'Farhan Rosli', 'Nurul Izzah']
    for s_name in sellers:
        s_user, _ = User.objects.get_or_create(username=s_name.replace(' ', '').lower())
        Profile.objects.get_or_create(user=s_user, defaults={'is_verified': True})

    # 3. Create Sample Items
    category_men = Category.objects.get(name='Men')
    category_tech = Category.objects.get(name='Tech')

    # Item 1
    Item.objects.create(
        name='Vintage Leather Satchel',
        seller=User.objects.get(username='ahmadzaki'),
        category=category_men,
        price=85.00,
        description='Beg kulit vintaj yang dijaga rapi. Sangat tahan lasak dan sesuai untuk kegunaan harian. Lokasi: Shah Alam.',
        is_fully_functional=True,
        has_original_box=True,
        eco_impact=12.4
    )

    # Item 2
    Item.objects.create(
        name='Fujifilm X-T3 Camera',
        seller=User.objects.get(username='farhanrosli'),
        category=category_tech,
        price=2850.00,
        description='Kamera digital mirrorless. Termasuk lens 18-55mm, 2 bateri dan tali kamera asal. Lokasi: Kuala Lumpur.',
        is_fully_functional=True,
        has_scratches=False,
        eco_impact=45.0
    )
    
    # Item 3
    Item.objects.create(
        name='Denim Trucker Jacket',
        seller=User.objects.get(username='nurulizzah'),
        category=category_men,
        price=120.00,
        description='Jaket denim klasik. Sedikit pudar untuk gaya vintaj yang sempurna. Lokasi: Bangi.',
        is_fully_functional=True,
        has_scratches=True,
        eco_impact=8.2
    )

    print("✅ Malaysian Demo data created successfully!")

if __name__ == "__main__":
    create_demo_data()
