from rest_framework import serializers
from .models import ImageUpload, EditedImage
from django.contrib.auth.models import User

class ImageUploadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageUpload
        exclude = ['user']

class ImageUploadSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ImageUpload
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.image.url)

class EditedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditedImage
        fields = '__all__'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )
        return user

