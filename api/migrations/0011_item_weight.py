from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_item_battery_health_good_item_has_all_accessories_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='weight',
            field=models.FloatField(default=0.0, help_text='Weight of the item in kg'),
        ),
    ]
