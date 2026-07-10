from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_item_weight'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='offer_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='payment_method',
            field=models.CharField(choices=[('CASH', 'Cash on Delivery'), ('TRANSFER', 'Bank Transfer'), ('TNG', 'Touch n Go eWallet'), ('GRABPAY', 'GrabPay')], default='CASH', max_length=20),
        ),
    ]
