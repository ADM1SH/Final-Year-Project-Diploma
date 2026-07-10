from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_notification_related_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='wallet_balance',
            field=models.DecimalField(decimal_places=2, default=500.0, max_digits=10),
        ),
    ]
