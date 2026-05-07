from django.contrib import admin
from .models import Category, Profile, Item, ItemImage, Review

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon_name')
    search_fields = ('name',)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'trust_score', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('user__username', 'user__email')

class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'seller', 'category', 'price', 'calculated_grade', 'is_sold', 'created_at')
    list_filter = ('calculated_grade', 'is_sold', 'category')
    search_fields = ('name', 'description', 'seller__username')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ItemImageInline]

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('item', 'reviewer', 'seller', 'rating', 'created_at')
    list_filter = ('rating',)
    search_fields = ('reviewer__username', 'seller__username', 'comment')
    readonly_fields = ('created_at',)
