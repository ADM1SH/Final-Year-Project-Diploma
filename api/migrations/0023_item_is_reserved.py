from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_profile_verification_document_bundle_block_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='is_reserved',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
