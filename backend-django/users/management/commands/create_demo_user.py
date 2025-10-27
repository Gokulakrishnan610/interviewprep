from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import User

class Command(BaseCommand):
    help = 'Create a demo user for testing'

    def handle(self, *args, **options):
        User = get_user_model()

        # Check if demo user already exists
        if User.objects.filter(email='demo@example.com').exists():
            self.stdout.write(
                self.style.WARNING('Demo user already exists')
            )
            return

        # Create demo user
        user = User.objects.create_user(
            email='demo@example.com',
            password='demo123',
            first_name='Demo',
            last_name='User',
            username='demo@example.com',
            is_active=True,
            is_email_verified=True
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created demo user: {user.email}')
        )