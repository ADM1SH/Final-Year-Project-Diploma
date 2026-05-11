# admin.py
# Admin panel configuration for MyPreLove.
# This file manages database records through the web interface.

from django.contrib import admin
from .models import Category, Profile, Item, ItemImage, Transaction, ScamReport, Review

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    # Manage item categories.
    list_display = ('name', 'icon_name')
    search_fields = ('name',)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    # Manage user profiles and trust levels.
    list_display = ('user', 'trust_score', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('user__username', 'user__email')

class ItemImageInline(admin.TabularInline):
    # Allow image management within the item page.
    model = ItemImage
    extra = 1

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    # Manage marketplace listings. 
    # View grades and condition surveys.
    list_display = ('name', 'seller', 'category', 'price', 'calculated_grade', 'is_sold', 'created_at')
    list_filter = ('calculated_grade', 'is_sold', 'category')
    search_fields = ('name', 'description', 'seller__username')
    readonly_fields = ('calculated_grade', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('seller', 'category', 'name', 'description', 'price', 'is_sold')
        }),
        ('Condition Survey', {
            'fields': ('is_fully_functional', 'has_scratches', 'has_dents_cracks', 'has_original_box', 'has_receipt', 'calculated_grade')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    inlines = [ItemImageInline]

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    # Track marketplace sales.
    list_display = ('item', 'buyer', 'seller', 'final_price', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('item__name', 'buyer__username', 'seller__username')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ScamReport)
class ScamReportAdmin(admin.ModelAdmin):
    # Review fraud reports.
    list_display = ('reporter', 'reported_user', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reporter__username', 'reported_user__username', 'reason')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    # Manage buyer feedback records.
    list_display = ('item', 'reviewer', 'seller', 'rating', 'created_at')
    list_filter = ('rating',)
    search_fields = ('reviewer__username', 'seller__username', 'comment')
    readonly_fields = ('created_at',)
