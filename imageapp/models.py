from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.auth.models import User

class ImageUpload(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    labels = models.JSONField(default=list)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Image {self.id}"

class EditedImage(models.Model):
    original = models.ForeignKey(ImageUpload, on_delete=models.CASCADE)
    edited = models.ImageField(upload_to='edited/')
    edited_at = models.DateTimeField(auto_now_add=True)
    temporary = models.BooleanField(default=True)

class ImageRestorePoint(models.Model):
    original = models.OneToOneField(ImageUpload, on_delete=models.CASCADE)
    backup = models.ImageField(upload_to='restore/')
    saved_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RestorePoint for Image {self.original.id}"

class FaceCluster(models.Model):
    name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or f"Cluster {self.id}"

class FaceMatch(models.Model):
    cluster = models.ForeignKey(FaceCluster, on_delete=models.CASCADE)
    image = models.ForeignKey(ImageUpload, on_delete=models.CASCADE)
    face_location = models.JSONField(null=True, blank=True)

class FaceEncoding(models.Model):
    image = models.ForeignKey(ImageUpload, on_delete=models.CASCADE)
    encoding = models.BinaryField()  # we’ll pickle the face encoding
    group_id = models.IntegerField(null=True)  # can be used to group faces

class FaceEmbedding(models.Model):
    image = models.ForeignKey(ImageUpload, on_delete=models.CASCADE, related_name='face_embeddings')
    encoding = ArrayField(models.FloatField())  # 128 floats from face_recognition
    created_at = models.DateTimeField(auto_now_add=True)
    clustered = models.BooleanField(default=False)  # NEW FIELD

    def __str__(self):
        return f"Embedding for Image {self.image.id}"
