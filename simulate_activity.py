import os
import django
import random

def perfect_marketplace_simulation():
    """
    Populates all users with perfectly consistent sales, reviews, and stats.
    Ensures 1 Sold Item = 1 Transaction = 1 Review.
    """
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import Item, Transaction, Review, Favorite, Message, Profile
    from django.db.models import Avg

    print("🚀 Starting Absolute Consistency Simulation...")

    # 0. Clean Slate
    Transaction.objects.all().delete()
    Review.objects.all().delete()
    Favorite.objects.all().delete()
    Message.objects.all().delete()

    # 1. Setup Users
    demo_usernames = ['adamanwar', 'ahmadzaki', 'sitiaminah', 'farhanrosli', 'nurulizzah']
    users = []
    for uname in demo_usernames:
        u, _ = User.objects.get_or_create(username=uname)
        # Ensure all demo users are verified for full Trust Score potential
        p, _ = Profile.objects.get_or_create(user=u)
        p.is_verified = True
        p.save()
        users.append(u)

    # 2. Distribute Items
    all_items = list(Item.objects.all())
    # Reset all items to unsold first
    Item.objects.all().update(is_sold=False)
    
    items_per_user = len(all_items) // len(users)
    print(f"📦 Distributing ~{items_per_user} items to each of the {len(users)} users...")

    review_pool = [
        "Really happy with the purchase, thanks!",
        "Excellent condition, exactly as described.",
        "Smooth transaction and very fast response.",
        "Friendly seller, item was well packaged.",
        "Great deal! The quality is top notch.",
        "Highly recommended seller, very professional."
    ]

    for i, user in enumerate(users):
        user_items = all_items[i*items_per_user : (i+1)*items_per_user]
        
        # Each user gets 3 COMPLETED sales
        sold_subset = user_items[:3]
        # Each user gets the rest as LIVE listings
        live_subset = user_items[3:]

        # Update item ownership
        for it in user_items:
            it.seller = user
            it.save()

        print(f"👤 Processing @{user.username}...")

        # Create 3 Sales + 3 Reviews (1:1 Ratio)
        for j, item in enumerate(sold_subset):
            # Pick a random buyer who isn't the seller
            buyer = random.choice([u for u in users if u != user])
            
            # 1. Create Transaction
            Transaction.objects.create(
                item=item,
                buyer=buyer,
                seller=user,
                final_price=item.price,
                status='COMPLETED',
                payment_method=random.choice(['CASH', 'TRANSFER', 'TNG'])
            )

            # 2. Mark Item as Sold
            item.is_sold = True
            item.save()

            # 3. Create Matching Review
            # Assigning specific ratings to show variety (5, 4, 5)
            # This ensures average is 4.7
            rating = 5 if j != 1 else 4 
            Review.objects.create(
                item=item,
                reviewer=buyer,
                seller=user,
                rating=rating,
                comment=review_comments[j % len(review_comments)] if 'review_comments' in locals() else review_pool[j % len(review_pool)]
            )
        
        print(f"   ✅ Created 3 sales and 3 reviews (Avg Rating: 4.7)")

    # 3. Create some PENDING transactions for adamanwar (badges)
    main_user = users[0] # adamanwar
    remaining_unsold = list(Item.objects.filter(is_sold=False).exclude(seller=main_user))
    
    print("\n⏳ Creating Pending Activity for @adamanwar...")
    for i in range(2):
        item = remaining_unsold[i]
        Transaction.objects.create(
            item=item,
            buyer=main_user,
            seller=item.seller,
            final_price=item.price,
            status='PENDING'
        )
    
    # 4. Final Recalculation
    print("\n⭐ Finalizing Trust Scores and Stats...")
    for u in users:
        u.profile.recalculate_trust_score()
    
    print("\n✨ SIMULATION COMPLETE: All users have consistent 1:1 sales/review data and real stats.")

if __name__ == "__main__":
    perfect_marketplace_simulation()
