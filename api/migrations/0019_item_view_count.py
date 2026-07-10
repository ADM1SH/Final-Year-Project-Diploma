from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_message_is_offer_message_offer_price_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='view_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
