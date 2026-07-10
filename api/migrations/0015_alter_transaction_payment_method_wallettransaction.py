import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_profile_wallet_balance'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='payment_method',
            field=models.CharField(choices=[('CASH', 'Cash on Delivery'), ('TRANSFER', 'Bank Transfer'), ('TNG', 'Touch n Go eWallet'), ('GRABPAY', 'GrabPay'), ('WALLET', 'MyPreLove Cash Wallet')], default='CASH', max_length=20),
        ),
        migrations.CreateModel(
            name='WalletTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('tx_type', models.CharField(choices=[('TOP_UP', 'Top Up'), ('PURCHASE', 'Purchase'), ('SALE', 'Sale')], max_length=20)),
                ('description', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wallet_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
