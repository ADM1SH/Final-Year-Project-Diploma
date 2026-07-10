from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_item_view_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='flaw_disclosure',
            field=models.TextField(blank=True, default=''),
        ),
    ]
