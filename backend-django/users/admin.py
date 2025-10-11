from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_email_verified', 'date_joined', 'is_staff')
    list_filter = ('is_staff', 'is_email_verified', 'date_joined')
    search_fields = ('username', 'email')
    ordering = ('-date_joined',)
    inlines = (UserProfileInline,)
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('email', 'profile_picture')}),
        ('Status', {'fields': ('is_email_verified',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )

admin.site.register(User, CustomUserAdmin)
