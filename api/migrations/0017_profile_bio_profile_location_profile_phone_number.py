from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_item_brand_item_original_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='bio',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='profile',
            name='location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='profile',
            name='phone_number',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]
