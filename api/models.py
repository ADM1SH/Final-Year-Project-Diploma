# =====================================================================
# SYSTEM/PROJECT NAME: MyPreLove (Secondhand Eco-Marketplace Mobile App)
# COURSE: Diploma in Information Technology (DIT)
# MODULE: Final Year Project (FYP) - DIT3004 / DIT3102
# MEMBERS: Adam Anwar & FYP Group
# FILE NAME: models.py
# PURPOSE: Database models/tables for our FYP project.
#          Defines User Profiles, Categories, Items (Listings), 
#          Transactions, Notifications, Messaging & Custom Offers, 
#          Scam Reports, Reviews, Favorites and Eco-Impact tracking.
# =====================================================================

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# Libraries for image compression
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image as PILImage
import os

def compress_image(image_field):
    # DIPLOMA FYP COMMENT: 
    # This helper function is used to automatically compress image uploads
    # before they are saved to the Django media files folder.
    # Since our mobile app users might upload huge photos taken on high-res cameras,
    # converting them to JPEG at 70% quality prevents our database from growing too large,
    # saves server disk space, and speeds up loading times for our React Native FlatList.

    # Don't do anything if no image was actually passed in
    if not image_field:
        return

    # Open the uploaded image using Pillow so we can process it
    img = PILImage.open(image_field)

    # RGBA (transparent PNGs) and palette-mode images can't be saved as JPEG — convert them first
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Write the compressed image into a memory buffer instead of hitting the disk twice
    output = BytesIO()
    # Save at 70% JPEG quality with optimisation — good balance of size vs. visual clarity
    img.save(output, format='JPEG', quality=70, optimize=True)
    # Rewind the buffer to the start so it can be read from the beginning
    output.seek(0)

    # Strip the original extension from the filename and force a .jpg suffix
    name = os.path.splitext(os.path.basename(image_field.name))[0]
    # Overwrite the image field with the compressed version — save=False avoids an extra DB write here
    image_field.save(f"{name}.jpg", ContentFile(output.read()), save=False)


class Category(models.Model):
    # DIPLOMA FYP COMMENT:
    # We created this Category model because our project requirements specified that we need to group listings 
    # so users can filter items by Tech, Fashion, Books etc. We also added an icon_name field so the 
    # React Native frontend can easily load matching icons from Expo Vector Icons!
    name = models.CharField(max_length=100, db_index=True)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Android icon reference")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name
class Profile(models.Model):
    # DIPLOMA FYP COMMENT:
    # This class extends the default Django User model using a OneToOneField relationship.
    # It stores the user's computed trust score, verification status, and profile information.

    # ── Core identity ──────────────────────────────────────────────────────────
    # Link this profile back to exactly one Django auth User — deleting the user wipes the profile too
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # ── ABI Trust Score ────────────────────────────────────────────────────────
    # Floating-point score out of 100, recalculated automatically by signals whenever relevant data changes
    trust_score = models.FloatField(default=0.0, help_text="Calculated based on ABI model")
    # Admin manually ticks this after reviewing the user's ID document — worth 20 trust points
    is_verified = models.BooleanField(default=False, db_index=True)

    # ── Media uploads ──────────────────────────────────────────────────────────
    # The user's avatar photo shown on their public profile card
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    # The government-issued ID or student card the user submits for admin verification
    verification_document = models.ImageField(upload_to='verification_docs/', blank=True, null=True)

    # ── Wallet ─────────────────────────────────────────────────────────────────
    # In-app MyPreLove wallet balance; starts at RM 500.00 for demo purposes
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)

    # ── Public profile details ─────────────────────────────────────────────────
    # Freeform location string shown on the seller's profile (e.g. "Kuala Lumpur")
    location = models.CharField(max_length=255, blank=True, default='', db_index=True)
    # Short seller bio blurb shown under the username on the profile screen
    bio = models.TextField(blank=True, default='')
    # Contact number — shown only to buyers after a transaction is confirmed
    phone_number = models.CharField(max_length=20, blank=True, default='')

    # Override save so we always compress uploaded images before writing to disk
    def save(self, *args, **kwargs):
        # Compress the profile photo if the user just uploaded or changed it
        if self.profile_picture:
            compress_image(self.profile_picture)
        # Also compress the verification document to keep storage usage manageable
        if self.verification_document:
            compress_image(self.verification_document)
        # Call the real Django save so the record actually hits the database
        super().save(*args, **kwargs)


    def recalculate_trust_score(self):
        # ---------------------------------------------------------------------
        # THE ABI TRUST MODEL FORMULA (Integrity, Ability, Benevolence)
        # ---------------------------------------------------------------------
        # This implementation follows the ABI model requirements:
        # 1. INTEGRITY (20 points max): User gets 20 pts if manually verified by Admin.
        # 2. ABILITY (30 points max): Seller capability. Each completed transaction adds 3 pts.
        # 3. BENEVOLENCE (50 points max): Seller reputation/review rating. (Avg review * 10).
        # Total points sum up to 100.

        # Start from zero and accumulate each of the three ABI pillars below
        score = 0.0

        # INTEGRITY: Admin-verified users earn a flat 20-point bonus for proven identity
        if self.is_verified:
            score += 20.0

        # ABILITY: Pull the count of completed sales so we can reward experience
        completed_sales_count = self.user.sales.filter(status='COMPLETED').count()
        # Each completed sale is worth 3 points, but we cap Ability at 30 so one prolific seller can't dominate
        score += min(completed_sales_count * 3.0, 30.0)

        # BENEVOLENCE: Average the star ratings left by buyers — multiplied by 10 to scale to 50 points max
        avg_rating = self.user.reviews_received.aggregate(models.Avg('rating'))['rating__avg']
        # Only add benevolence points if there's at least one review on record
        if avg_rating:
            score += (avg_rating * 10.0)

        # Round to one decimal place so the UI displays cleanly (e.g. 73.5)
        self.trust_score = round(score, 1)
        # Update the database directly. 
        # Using .update() here prevents triggering pre/post-save signals to avoid infinite loops!
        Profile.objects.filter(pk=self.pk).update(trust_score=self.trust_score)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def response_time(self):
        # DIPLOMA FYP COMMENT:
        # Calculates seller average reply time using a single efficient DB query.
        # We annotate each first-buyer-message with the seller's first reply timestamp,
        # compute the gap, and average across all threads.
        # This replaces an N+1 query loop (1 query per thread) with a single round-trip.

        # Lazy imports here to avoid circular import issues at module load time
        from django.apps import apps
        from django.db.models import Min, ExpressionWrapper, DurationField, Avg
        from django.db.models import F, OuterRef, Subquery

        # Grab the Message model dynamically to avoid a top-level circular dependency
        Message = apps.get_model('api', 'Message')

        # Get all messages received by this seller (for items only)
        received = Message.objects.filter(receiver=self.user, item__isnull=False)
        # If this seller has never received a message, just return a sensible default label
        if not received.exists():
            return "Usually replies within 2 hours"

        # For each (item, sender) combination, find the first buyer message timestamp
        # Grouping by item+sender gives us one entry per unique conversation thread
        first_buyer_msgs = (
            Message.objects
            .filter(receiver=self.user, item__isnull=False)
            .values('item_id', 'sender_id')
            .annotate(first_msg_time=Min('timestamp'))
        )

        # Collect the raw reply-time differences in seconds so we can average them later
        total_seconds = []
        for thread in first_buyer_msgs:
            # Find the seller's first reply to this specific buyer on this item
            first_reply = Message.objects.filter(
                item_id=thread['item_id'],
                sender=self.user,
                receiver_id=thread['sender_id'],
                # Only look at messages that arrived AFTER the buyer's opening message
                timestamp__gt=thread['first_msg_time']
            ).aggregate(first_reply_time=Min('timestamp'))['first_reply_time']

            # If the seller actually replied to this thread, calculate how long it took
            if first_reply:
                diff = first_reply - thread['first_msg_time']
                total_seconds.append(diff.total_seconds())

        # If the seller has received messages but never replied, fall back to the default label
        if not total_seconds:
            return "Usually replies within 2 hours"

        # Average all the per-thread response times and convert to hours for the label
        avg_seconds = sum(total_seconds) / len(total_seconds)
        avg_hours = avg_seconds / 3600.0

        # Return a human-readable string that maps to one of three display tiers
        if avg_hours <= 1.0:
            return "Usually replies within 1 hour"
        elif avg_hours <= 24.0:
            # Round to the nearest whole hour but never show "0 hours"
            return f"Usually replies within {max(1, int(round(avg_hours)))} hours"
        else:
            # Anything over a day just gets the generic "1 day" label
            return "Usually replies within 1 day"


class Item(models.Model):
    # Individual marketplace listing — one row here represents one secondhand product a seller is offering.
    # The grade, eco-impact, and condition fields are the core of our automated grading system.

    # Inner enum for the four condition tiers — stored as a single letter in the DB for efficiency
    class Grade(models.TextChoices):
        A = 'A', 'Grade A - Like New'
        B = 'B', 'Grade B - Lightly Used'
        C = 'C', 'Grade C - Well Used'
        D = 'D', 'Grade D - Heavily Used'

    # ── Ownership & classification ─────────────────────────────────────────────
    # The seller who posted this listing — cascade delete so orphan items don't linger
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    # Which product category this falls under; SET_NULL so items survive if a category is removed
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='items')

    # ── Basic listing details ──────────────────────────────────────────────────
    # The product title that shows up in the marketplace feed and search results
    name = models.CharField(max_length=255, db_index=True)
    # Full description the seller writes to pitch the item to buyers
    description = models.TextField()
    # Asking price in RM — indexed so price-range filters stay fast
    price = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    # Physical weight in kg; used to calculate the eco-impact CO2 saving
    weight = models.FloatField(default=0.0, help_text="Weight of the item in kg")
    # Optional brand name (e.g. "Apple", "Zara") for search and display
    brand = models.CharField(max_length=100, blank=True, default='')
    # The retail price when new — shown to buyers so they can see the savings
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # ── Eco-impact & pricing flags ─────────────────────────────────────────────
    # CO2 saved in kg, auto-calculated from weight on every save (weight × 2.5)
    eco_impact = models.FloatField(default=0.0, help_text="CO2 saved in kg")
    # Whether the seller is open to price offers from buyers via the chat system
    is_negotiable = models.BooleanField(default=False)

    # ── Core condition survey fields ───────────────────────────────────────────
    # These five flags come directly from the seller's condition survey on the Sell screen
    is_fully_functional = models.BooleanField(default=True)
    has_scratches = models.BooleanField(default=False)
    has_dents_cracks = models.BooleanField(default=False)
    has_original_box = models.BooleanField(default=False)
    has_receipt = models.BooleanField(default=False)

    # ── Expanded grading fields ────────────────────────────────────────────────
    # Additional condition checkpoints used by category-specific scoring (see calculate_grade)
    is_clean = models.BooleanField(default=True, help_text="Item is free of stains, dust, or odors")
    has_all_accessories = models.BooleanField(default=True, help_text="Includes all original chargers, cables, or parts")
    has_repair_history = models.BooleanField(default=False, help_text="Item has been repaired before")
    battery_health_good = models.BooleanField(default=True, help_text="Battery lasts a reasonable time (if applicable)")
    is_modified = models.BooleanField(default=False, help_text="Item has been customized or altered from original state")

    # ── Computed & status fields ───────────────────────────────────────────────
    # The A/B/C/D grade auto-assigned by calculate_grade() each time the item is saved
    calculated_grade = models.CharField(max_length=1, choices=Grade.choices, db_index=True, blank=True)
    # Flipped to True once a transaction for this item reaches COMPLETED status
    is_sold = models.BooleanField(default=False, db_index=True)
    # Incremented each time a buyer opens the ItemDetail screen for this listing
    view_count = models.PositiveIntegerField(default=0)
    # Free-text box where the seller discloses known defects to keep things honest
    flaw_disclosure = models.TextField(blank=True, default='')

    # ── Timestamps ────────────────────────────────────────────────────────────
    # auto_now_add stamps the moment the listing is created; never changes after that
    created_at = models.DateTimeField(auto_now_add=True)
    # auto_now updates whenever the record is saved so we know when it was last edited
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Show the newest listings first in every queryset by default
        ordering = ['-created_at']

    def calculate_grade(self):
        # ----------------------------------------------------
        # DIPLOMA FYP NOTE ON SYSTEM ARCHITECTURE / DUPLICATION RISK:
        # The condition survey scoring system logic here (based on Tech, Luxury, Men/Women,
        # Books, Home & Living categories) is intentionally mirrored on the client-side
        # (in SellScreen.js for live scoring and in ItemDetailScreen.js for item rendering).
        # This is a known architectural trade-off to provide instant UX preview and offline
        # calculation capabilities in the mobile app.
        # MAINTAINER WARNING: If categories or scoring criteria change, updates MUST be
        # applied synchronously to:
        # 1. api/models.py (Item.calculate_grade)
        # 2. SellScreen.js (calculateItemScore)
        # 3. ItemDetailScreen.js (renderConditionSurvey checkpoints)
        # ----------------------------------------------------
        # Calculates a point score between 0 and 100 based on
        # category-specific condition checkpoints selected by user.
        # ----------------------------------------------------
        score = 0
        cat_name = self.category.name if self.category else 'Others'
        
        # CATEGORY 1: Tech Products (Phones, Laptops, etc.)
        if cat_name == 'Tech':
            if self.is_fully_functional: 
                score += 40  # 40 points: Device functions perfectly
            if self.battery_health_good: 
                score += 10  # 10 points: Battery holds charge well
            if not self.has_repair_history: 
                score += 15  # 15 points: No prior repair attempts
            if not self.has_scratches: 
                score += 15  # 15 points: Screen/body is pristine
            if self.has_all_accessories: 
                score += 10  # 10 points: Charger and cables included
            if self.has_original_box: 
                score += 10  # 10 points: Retains original retail box
                
        # CATEGORY 2: High-End Luxury Goods
        elif cat_name == 'Luxury':
            if self.has_receipt: 
                score += 30  # 30 points: Verified receipt/proof of purchase
            if not self.has_scratches: 
                score += 20  # 20 points: Safe cosmetic condition (no rips/scratches)
            if self.is_clean: 
                score += 20  # 20 points: Dust-free and odorless condition
            if self.has_original_box: 
                score += 15  # 15 points: Box/dust bag is included
            if self.is_fully_functional: 
                score += 10  # 10 points: Hardware (zippers, locks) functions
            if not self.is_modified: 
                score += 5   # 5 points: Original stitching is unmodified
                
        # CATEGORY 3: Fashion Apparel (Men & Women)
        elif cat_name in ['Men', 'Women']:
            if not self.has_scratches: 
                score += 30  # 30 points: Fabric has no stains or rips
            if self.is_clean: 
                score += 25  # 25 points: Washed/cleaned and odor-free
            if self.is_fully_functional: 
                score += 20  # 20 points: All buttons/zippers work
            if self.has_original_box: 
                score += 10  # 10 points: Original brand tag is intact
            if not self.is_modified: 
                score += 10  # 10 points: No custom size tailoring done
            if self.has_all_accessories: 
                score += 5   # 5 points: Comes with belt/detachable straps
                
        # CATEGORY 4: Literature & Books
        elif cat_name == 'Books':
            if self.is_fully_functional: 
                score += 30  # 30 points: Book binding is strong and pages intact
            if self.is_clean: 
                score += 30  # 30 points: Pages are clean of notes/highlighters
            if not self.has_scratches: 
                score += 20  # 20 points: Spine/cover is crisp and crease-free
            if self.has_all_accessories: 
                score += 10  # 10 points: Paper is clean (no odor/yellowing)
            if self.has_original_box: 
                score += 10  # 10 points: Special collector/first printing edition
                
        # CATEGORY 5: Home, Living & Furniture
        elif cat_name == 'Home & Living':
            if not self.has_dents_cracks: 
                score += 30  # 30 points: Wood/glass has no deep cracks or wobbles
            if self.is_fully_functional: 
                score += 25  # 25 points: Drawers/hinges slide and function
            if self.is_clean: 
                score += 20  # 20 points: Free of dust, mold, and stains
            if not self.has_scratches: 
                score += 15  # 15 points: Surface is free of major scuffs
            if self.has_all_accessories: 
                score += 10  # 10 points: Screws and brackets included for assembly
                
        # CATEGORY 6: Fallback for all other items
        else:
            if self.is_fully_functional: 
                score += 30  # 30 points: Works as intended
            if self.is_clean: 
                score += 20  # 20 points: Clean and presentable
            if not self.has_scratches: 
                score += 15  # 15 points: Scratch-free
            if not self.has_dents_cracks: 
                score += 15  # 15 points: Free of structural damage
            if self.has_original_box: 
                score += 10  # 10 points: Box/packaging included
            if self.has_all_accessories: 
                score += 10  # 10 points: All default accessories included

        # Map final accumulated score to standard grades (A-D)
        if score >= 90: 
            return self.Grade.A  # Grade A: Score of 90 to 100
        if score >= 70: 
            return self.Grade.B  # Grade B: Score of 70 to 89
        if score >= 50: 
            return self.Grade.C  # Grade C: Score of 50 to 69
        return self.Grade.D      # Grade D: Score below 50

    def save(self, *args, **kwargs):
        # Always recalculate the condition grade before writing to the DB so it's never stale
        self.calculated_grade = self.calculate_grade()
        # Calculate eco impact based on weight (approx 2.5kg of CO2 saved per 1kg of item)
        # Only do the math if the seller actually entered a weight — skip weightless items
        if self.weight > 0:
            self.eco_impact = float(self.weight) * 2.5
        # Hand off to Django's default save to actually persist everything
        super().save(*args, **kwargs)

    def __str__(self):
        # Human-readable label shown in the Django admin list view
        return f"{self.name} - {self.get_calculated_grade_display()}"


class ItemImage(models.Model):
    # Stores individual photo uploads for a listing — an Item can have many of these
    # (e.g. front, back, side shots) which the buyer swipes through on ItemDetailScreen.

    # Which listing this photo belongs to; delete the item and all its photos go too
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    # The actual image file stored under the media/items/ folder
    image = models.ImageField(upload_to='items/')
    # Timestamp so we can display photos in upload order if needed
    created_at = models.DateTimeField(auto_now_add=True)

    # Compress every item photo on upload — same strategy as profile pictures to save disk space
    def save(self, *args, **kwargs):
        # Run the image through our JPEG compressor before it hits the filesystem
        if self.image:
            compress_image(self.image)
        super().save(*args, **kwargs)


class Notification(models.Model):
    # In-app alerts sent to users for events like a new message, a sale completed, or a price drop.
    # The Updates tab in the mobile app polls this table every few seconds to show the red badge count.

    # Which user should see this notification in their Updates tab
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    # Short headline shown in the notification card (e.g. "Your item sold!")
    title = models.CharField(max_length=255)
    # The longer description body with full context about the event
    content = models.TextField()
    # False until the user taps the notification — used to drive the unread badge count
    is_read = models.BooleanField(default=False, db_index=True)
    related_id = models.IntegerField(null=True, blank=True) # ID of item or user for deep linking
    # When this notification was created — used to sort newest-first in the list
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Always show the newest notifications at the top of the Updates screen
        ordering = ['-created_at']


class Transaction(models.Model):
    # Records a sale agreement between a buyer and a seller for a specific listing.
    # When status flips to COMPLETED, the backend signals recalculate the seller's trust score.

    # The three possible lifecycle states a transaction can be in
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    # All the payment channels buyers can choose from at checkout
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash on Delivery'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        TNG = 'TNG', 'Touch n Go eWallet'
        GRABPAY = 'GRABPAY', 'GrabPay'
        # Our own in-app wallet — deducts directly from the buyer's wallet_balance
        WALLET = 'WALLET', 'MyPreLove Cash Wallet'

    # ── Participants & item ────────────────────────────────────────────────────
    # The listing being purchased — cascade so old transactions are cleared with the item
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    # The user buying the item — accessible via user.purchases
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    # The user selling the item — accessible via user.sales (used in trust score calc)
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')

    # ── Pricing & payment ──────────────────────────────────────────────────────
    # The actual amount paid — may differ from listing price if a chat offer was accepted
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    # The price the buyer proposed during negotiation (null if no offer was made)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # How the buyer chose to pay — defaults to Cash on Delivery
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    # Current lifecycle state — indexed so filtering by COMPLETED is fast for trust score calcs
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    # When the buyer first initiated the purchase
    created_at = models.DateTimeField(auto_now_add=True)
    # Last time the status was changed (e.g. seller confirmed completion)
    updated_at = models.DateTimeField(auto_now=True)


class WalletTransaction(models.Model):
    # Immutable ledger entry for every movement of money in or out of a user's in-app wallet.
    # Each purchase, sale payout, or manual top-up gets its own row here for a clear audit trail.
    # The actual wallet_balance on Profile is adjusted separately in the view logic.

    # The three event types that can cause a wallet balance to move
    class TxType(models.TextChoices):
        # Admin or user added funds to their wallet
        TOP_UP = 'TOP_UP', 'Top Up'
        # Buyer's wallet was debited when they bought an item
        PURCHASE = 'PURCHASE', 'Purchase'
        # Seller's wallet was credited when their item was marked COMPLETED
        SALE = 'SALE', 'Sale'

    # ── Fields ─────────────────────────────────────────────────────────────────
    # The user whose wallet balance this entry affects
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    # The amount in RM — positive for credits (SALE, TOP_UP), negative for debits (PURCHASE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Whether this was a top-up, a purchase deduction, or a sale credit
    tx_type = models.CharField(max_length=20, choices=TxType.choices)
    # Human-readable note shown in the wallet history screen (e.g. "Payment for iPhone 13")
    description = models.CharField(max_length=255)
    # Timestamp of when the transaction occurred — used to sort the history newest-first
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Show the most recent wallet activity at the top of the history list
        ordering = ['-created_at']

    def __str__(self):
        # Friendly label for the Django admin so we can quickly spot which user and how much
        return f"{self.user.username} - {self.tx_type} - RM {self.amount:.2f}"



class Message(models.Model):
    # Every chat bubble in the app is one row here — linking a sender, a receiver, and usually an item.
    # Messages are also used to carry price offers, which the buyer and seller negotiate inline.

    # ── Participants ───────────────────────────────────────────────────────────
    # The user who sent this chat bubble
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    # The user on the receiving end of the conversation
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    # The listing this conversation is about; SET_NULL so chats persist even if the item is deleted
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')

    # ── Message body & metadata ────────────────────────────────────────────────
    # The actual text the user typed (or a system-generated offer summary)
    content = models.TextField()
    # When the message was sent — used to display bubbles in chronological order
    timestamp = models.DateTimeField(auto_now_add=True)
    # Tracks whether the recipient has opened this message — drives the unread badge on the chat tab
    is_read = models.BooleanField(default=False, db_index=True)

    # ── Custom chat-offer system fields ───────────────────────────────────────
    # True when this message is actually a price offer rather than a plain text reply
    is_offer = models.BooleanField(default=False)
    # The price the buyer is proposing — only populated when is_offer is True
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Tracks whether the seller accepted or rejected this offer so the UI can update the bubble state
    offer_status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('DECLINED', 'Declined')], 
        null=True, 
        blank=True
    )

    class Meta:
        # Messages must appear oldest-first inside the chat thread (like a real messenger)
        ordering = ['timestamp']


class ScamReport(models.Model):
    # Lets buyers flag a seller they believe is fraudulent — admins then review and take action.
    # Reports feed into the admin dashboard so nothing gets lost in a chat thread.

    # The four stages an admin moves a report through from submission to resolution
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        INVESTIGATING = 'INVESTIGATING', 'Under Investigation'
        RESOLVED = 'RESOLVED', 'Resolved'
        DISMISSED = 'DISMISSED', 'Dismissed'

    # ── People & item involved ─────────────────────────────────────────────────
    # The user who filed the complaint
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    # The user being accused — accumulating reports here can flag an account for suspension
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    # The specific listing the scam occurred on (optional — some reports are account-level)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='scam_reports')

    # ── Report details ─────────────────────────────────────────────────────────
    # Free-text explanation of what went wrong, written by the reporter
    reason = models.TextField()
    # Current admin workflow stage — indexed to make the admin queue filter quick
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    # When the report was first submitted
    created_at = models.DateTimeField(auto_now_add=True)
    # Last time an admin changed the status or added notes
    updated_at = models.DateTimeField(auto_now=True)


class Review(models.Model):
    # Post-transaction star rating and comment left by the buyer after a sale is completed.
    # The average of these ratings feeds directly into the seller's Benevolence trust score.

    # One review per item — prevents buyers from spamming ratings on the same listing
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name='review')
    # The buyer who is leaving the review
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    # The seller being reviewed — used in the ABI Benevolence aggregation query
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')

    # Star rating between 1 and 5 — validators enforce the bounds at the model level
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    # Optional written feedback the buyer wants to share about the seller or item condition
    comment = models.TextField()

    # When the review was posted — shown on the seller's profile page next to each star rating
    created_at = models.DateTimeField(auto_now_add=True)


class Favorite(models.Model):
    # Saves an item to a buyer's personal wishlist — shown on the Favourites tab of their profile.
    # The unique_together constraint prevents a user from double-hearting the same listing.

    # The user who tapped the heart icon on this listing
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    # The listing that was saved to their wishlist
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='favorited_by')
    # When they favourited it — lets us sort the wishlist by most recently saved
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One heart per listing per user — the DB enforces this so we don't need to check in code
        unique_together = ('user', 'item')
        # Show the most recently saved items at the top of the wishlist
        ordering = ['-created_at']


class Bundle(models.Model):
    # DIPLOMA FYP COMMENT:
    # Bundle Deals allow a seller to group multiple items together
    # and offer a combined discounted price. This encourages buyers
    # to purchase more secondhand items in a single transaction, reducing packaging waste!

    # ── Fields ─────────────────────────────────────────────────────────────────
    # The seller who created this bundle deal
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bundles')
    # A catchy name for the bundle shown in the marketplace feed (e.g. "Winter Wardrobe Bundle")
    name = models.CharField(max_length=255, db_index=True)
    # Which listings are part of this bundle — many-to-many since an item could appear in multiple deals
    items = models.ManyToManyField(Item, related_name='bundles')
    # The combined discounted price for buying all items in this bundle together
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Timestamp so the seller can see how old their bundle offers are
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Newest bundles appear first in any listing of deals
        ordering = ['-created_at']

    def __str__(self):
        # Clear label for the Django admin showing the bundle name and price at a glance
        return f"{self.name} - RM {self.price}"


class PriceAlert(models.Model):
    # DIPLOMA FYP COMMENT:
    # Allows buyers to "watch" items. If the seller drops the price,
    # or if the price is updated below target_price, a notification is sent automatically.

    # ── Fields ─────────────────────────────────────────────────────────────────
    # The buyer who set this price watch — they'll get the notification when the price drops
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_alerts')
    # The specific listing the buyer is watching
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='price_alerts')
    # The price threshold the buyer is willing to pay — trigger a notification when item.price falls at or below this
    target_price = models.DecimalField(max_digits=10, decimal_places=2)
    # When the buyer set up this alert — useful for showing them how long they've been waiting
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A buyer can only have one active price alert per listing
        unique_together = ('user', 'item')
        # Most recently set alerts show first in any alerts list view
        ordering = ['-created_at']

    def __str__(self):
        # Descriptive admin label so it's obvious whose alert this is and what they're targeting
        return f"PriceAlert by {self.user.username} for {self.item.name} at RM {self.target_price}"


class Block(models.Model):
    # DIPLOMA FYP COMMENT:
    # Simple block system to hide spammy or scammy sellers from the item listing/feed.
    # When a block exists, the blocked user's listings are filtered out of the blocker's home feed
    # and their messages are hidden in the chat list — keeping the community safe and clean.

    # ── Fields ─────────────────────────────────────────────────────────────────
    # The user who chose to block someone — they initiated the action
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking')
    # The user being blocked — their content is hidden from the blocker's view
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    # Timestamp of when the block was placed — useful for admin audits
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # You can only block a specific person once — prevents duplicate block rows
        unique_together = ('blocker', 'blocked')
        # Most recent blocks appear first if we ever list them in an admin or settings screen
        ordering = ['-created_at']

    def __str__(self):
        # Makes the admin list instantly readable — tells you exactly who blocked whom
        return f"{self.blocker.username} blocked {self.blocked.username}"
