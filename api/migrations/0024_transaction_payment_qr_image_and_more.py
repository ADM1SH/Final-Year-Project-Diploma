from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_item_is_reserved'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='payment_qr_image',
            field=models.ImageField(blank=True, null=True, upload_to='payment_qrs/'),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='payment_method',
            field=models.CharField(choices=[('WALLET', 'MyPreLove Cash Wallet'), ('DIRECT_QR', 'Direct QR Transfer')], default='WALLET', max_length=20),
        ),
    ]
