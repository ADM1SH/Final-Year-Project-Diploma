from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_favorite'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='battery_health_good',
            field=models.BooleanField(default=True, help_text='Battery lasts a reasonable time (if applicable)'),
        ),
        migrations.AddField(
            model_name='item',
            name='has_all_accessories',
            field=models.BooleanField(default=True, help_text='Includes all original chargers, cables, or parts'),
        ),
        migrations.AddField(
            model_name='item',
            name='has_repair_history',
            field=models.BooleanField(default=False, help_text='Item has been repaired before'),
        ),
        migrations.AddField(
            model_name='item',
            name='is_clean',
            field=models.BooleanField(default=True, help_text='Item is free of stains, dust, or odors'),
        ),
        migrations.AddField(
            model_name='item',
            name='is_modified',
            field=models.BooleanField(default=False, help_text='Item has been customized or altered from original state'),
        ),
    ]
