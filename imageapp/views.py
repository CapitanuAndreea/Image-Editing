from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework import status
from rest_framework.generics import RetrieveDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from PIL import Image
from PIL import ImageOps
from PIL import ImageEnhance
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files import File
from django.conf import settings
from .models import EditedImage, ImageUpload, ImageRestorePoint
from .serializers import EditedImageSerializer
from .serializers import ImageUploadCreateSerializer
from .serializers import ImageUploadSerializer
from .serializers import RegisterSerializer
from ultralytics import YOLO
from .utils import resolve_image_path
from rembg import remove
from .views import resolve_image_path
import os
import shutil
import face_recognition
from django.contrib.auth.models import User
from rest_framework.permissions import IsAdminUser
import numpy as np
from .models import FaceEmbedding, FaceMatch, FaceCluster
from . import models
from django.db.models import Count
import requests

model = YOLO('yolov8n.pt') 

def detect_objects(image_path):
    results = model.predict(source=image_path, save=False, conf=0.5)
    labels = set()

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            labels.add(result.names[class_id])

    return list(labels)

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        print("Received data:", request.data)

        upload_serializer = ImageUploadCreateSerializer(data=request.data)

        if upload_serializer.is_valid():
            instance = upload_serializer.save(user=request.user)
            detected_labels = detect_objects(instance.image.path)
            instance.labels = detected_labels
            instance.save()
            
            try:
                img_path = instance.image.path
                img = face_recognition.load_image_file(img_path)
                face_locations = face_recognition.face_locations(img)
                face_encodings = face_recognition.face_encodings(img, face_locations)

                for encoding in face_encodings:
                    FaceEmbedding.objects.create(
                        image=instance,
                        encoding=encoding.tolist(),
                        clustered=False
                    )
            except Exception as e:
                print(f"[FaceEmbedding] Failed for Image {instance.id}: {e}")
            

            print(f"Detected labels: {detected_labels}")
            response_serializer = ImageUploadSerializer(instance, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        print("Serializer errors:", upload_serializer.errors)
        return Response(upload_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ImageListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ImageUploadSerializer

    def get_queryset(self):
        deleted = self.request.query_params.get('deleted')
        if deleted == 'true':
            return ImageUpload.objects.filter(user=self.request.user, is_deleted=True).order_by('-uploaded_at')
        return ImageUpload.objects.filter(user=self.request.user, is_deleted=False).order_by('-uploaded_at')

    def get_serializer_context(self):
        return {'request': self.request}

class ImageDetailView(RetrieveDestroyAPIView):
    queryset = ImageUpload.objects.all()
    serializer_class = ImageUploadSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

        edits = EditedImage.objects.filter(original=instance)
        for edit in edits:
            if edit.edited and os.path.isfile(edit.edited.path):
                os.remove(edit.edited.path)
        edits.delete()

class CropImageView(APIView):
    def post(self, request):
        image_id = request.data.get('image_id')
        x = int(request.data.get('x', 0))
        y = int(request.data.get('y', 0))
        width = int(request.data.get('width', 100))
        height = int(request.data.get('height', 100))

        try:
            original = ImageUpload.objects.get(id=image_id)
            
            last_edit = EditedImage.objects.filter(original=original).order_by('-edited_at').first()
            image_path = last_edit.edited.path if last_edit else original.image.path

            img = Image.open(image_path)
            cropped = img.crop((x, y, x + width, y + height))

            buffer = BytesIO()
            cropped.save(buffer, format='JPEG')
            cropped_file = ContentFile(buffer.getvalue())

            edited_instance = EditedImage.objects.create(
                original=original,
            )
            edited_instance.edited.save(f"cropped_{original.id}.jpg", cropped_file)
            edited_instance.save()

            serializer = EditedImageSerializer(edited_instance)
            return Response(serializer.data, status=201)

        except ImageUpload.DoesNotExist:
            return Response({"error": "Image not found"}, status=404)
        
def resolve_image_path(request, original):
    
    input_path = request.data.get('input_path')
    if input_path and os.path.exists(input_path):
        return input_path

    last_edit = EditedImage.objects.filter(original=original, temporary=True).order_by('-edited_at').first()
    if last_edit and last_edit.edited and os.path.exists(last_edit.edited.path):
        return last_edit.edited.path

    return original.image.path

def resolve_original_image_path(original):
    return original.image.path

class RotateImageView(APIView):
    def post(self, request):
        image_id = request.data.get('image_id')
        degrees = int(request.data.get('degrees', '90'))

        try:
            original = ImageUpload.objects.get(id=image_id)
            
            image_path = resolve_image_path(request, original)
            img = Image.open(image_path)
            rotated = img.rotate(-degrees, expand=True)

            buffer = BytesIO()
            rotated.save(buffer, format='JPEG')
            image_content = ContentFile(buffer.getvalue())

            filename = f'rotated_{image_id}.jpg'
            edited_instance = EditedImage.objects.create(
                original=original, temporary=True
            )
            edited_instance.edited.save(filename, image_content)
            edited_instance.save()

            serializer = EditedImageSerializer(edited_instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)

class MirrorImageView(APIView):
    def post(self, request):
        image_id = request.data.get('image_id')

        try:
            original = ImageUpload.objects.get(id=image_id)
            
            image_path = resolve_image_path(request, original)
            img = Image.open(image_path)

            img = ImageOps.exif_transpose(img)
            mirrored = ImageOps.mirror(img)

            buffer = BytesIO()
            mirrored.save(buffer, format='JPEG')
            image_content = ContentFile(buffer.getvalue())

            filename = f'mirrored_{image_id}.jpg'
            edited_instance = EditedImage.objects.create(original=original, temporary=True)
            edited_instance.edited.save(filename, image_content)
            edited_instance.save()

            serializer = EditedImageSerializer(edited_instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)

class GrayscaleImageView(APIView):
    def post(self, request):
        image_id = request.data.get('image_id')

        try:
            original = ImageUpload.objects.get(id=image_id)
            
            image_path = resolve_image_path(request, original)
            img = Image.open(image_path)

            img = ImageOps.exif_transpose(img) 
            gray = ImageOps.grayscale(img)

            buffer = BytesIO()
            gray.save(buffer, format='JPEG')
            image_content = ContentFile(buffer.getvalue())

            filename = f'grayscale_{image_id}.jpg'
            edited_instance = EditedImage.objects.create(original=original, temporary=True)
            edited_instance.edited.save(filename, image_content)
            edited_instance.save()

            serializer = EditedImageSerializer(edited_instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)

class ImageSearchView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        query = request.query_params.get('q')
        if query:
            images = ImageUpload.objects.filter(
                user=request.user,
                is_deleted=False,
                labels__icontains=query
            )
            serializer = ImageUploadSerializer(images, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No search query provided."}, status=status.HTTP_400_BAD_REQUEST)

class ReplaceImageView(APIView):
    def post(self, request, pk):
        try:
            image = ImageUpload.objects.get(pk=pk)
        except ImageUpload.DoesNotExist:
            return Response({'error': 'Original image not found'}, status=404)

        new_path = resolve_image_path(request, image)

        if not ImageRestorePoint.objects.filter(original=image).exists():
            backup_path = image.image.path
            with open(backup_path, 'rb') as f:
                restore = ImageRestorePoint(original=image)
                restore.backup.save(f"restore_{os.path.basename(backup_path)}", File(f))
                restore.save()

        if os.path.exists(image.image.path):
            os.remove(image.image.path)

        uploads_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)

        original_name = os.path.basename(new_path)

        if original_name.startswith("uploads/"):
            original_name = original_name.replace("uploads/", "")

        final_name = f"saved_{pk}_{original_name}"
        final_path = os.path.join(uploads_dir, final_name)
        shutil.copyfile(new_path, final_path)

        image.image.name = f'uploads/{final_name}'
        image.save()

        EditedImage.objects.filter(original=image).update(temporary=False)

        if "preview_chain_" in original_name and os.path.exists(new_path):
            os.remove(new_path)

        return Response({'message': 'Image replaced successfully'})

class SaveAsCopyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        original_id = request.data.get('original_id')
        if not original_id:
            return Response({'error': 'Missing original_id'}, status=400)

        try:
            original = ImageUpload.objects.get(pk=original_id)
        except ImageUpload.DoesNotExist:
            return Response({'error': 'Original image not found'}, status=404)

        source_path = resolve_image_path(request, original)
        filename = os.path.basename(source_path)
        copy_name = f"copy_{filename}"

        with open(source_path, 'rb') as f:
            new_image = ImageUpload(user=request.user)
            new_image.image.save(copy_name, File(f))
            new_image.save()

        try:
            img_path = new_image.image.path
            img = face_recognition.load_image_file(img_path)
            face_locations = face_recognition.face_locations(img)
            face_encodings = face_recognition.face_encodings(img, face_locations)

            for encoding in face_encodings:
                FaceEmbedding.objects.create(
                    image=new_image,
                    encoding=encoding.tolist(),
                    clustered=False
                )
        except Exception as e:
            print(f"[FaceEmbedding] Failed for copied Image {new_image.id}: {e}")

        serializer = ImageUploadSerializer(new_image, context={'request': request})
        return Response(serializer.data, status=201)


class RevertImageView(APIView):
    def post(self, request, pk):
        try:
            image = ImageUpload.objects.get(pk=pk)

            try:
                restore = ImageRestorePoint.objects.get(original=image)
                backup_path = restore.backup.path

                if os.path.exists(image.image.path):
                    os.remove(image.image.path)

                new_name = f"revert_{os.path.basename(backup_path)}"
                restored_path = os.path.join(os.path.dirname(image.image.path), new_name)
                shutil.copyfile(backup_path, restored_path)

                image.image.name = f'uploads/{new_name}'
                image.save()

            except ImageRestorePoint.DoesNotExist:
                return Response({'error': 'No restore point available.'}, status=404)

            edits = EditedImage.objects.filter(original=image)
            for edit in edits:
                if edit.edited and os.path.exists(edit.edited.path):
                    os.remove(edit.edited.path)
            edits.delete()

            return Response({'message': 'Image reverted'}, status=200)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)

class RecycleBinListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ImageUploadSerializer

    def get_queryset(self):
        return ImageUpload.objects.filter(user=self.request.user, is_deleted=True).order_by('-uploaded_at')

class RestoreImageView(APIView):
    def post(self, request, pk):
        try:
            image = ImageUpload.objects.get(pk=pk)
            image.is_deleted = False
            image.save()
            return Response({'message': 'Image restored.'}, status=200)
        except ImageUpload.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

class PermanentDeleteImageView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            image = ImageUpload.objects.get(pk=pk, user=request.user, is_deleted=True)

            thumbnail_path = os.path.join(settings.MEDIA_ROOT, 'uploads', f'face_{image.id}.jpg')
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)

            FaceEmbedding.objects.filter(image=image).delete()
            FaceMatch.objects.filter(image=image).delete()

            if image.image and os.path.exists(image.image.path):
                os.remove(image.image.path)

            image.delete()
            return Response(status=204)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found or not deleted yet.'}, status=404)

class FaceGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        groups = []

        clusters = FaceCluster.objects.filter(facematch__image__user=user).distinct()

        for cluster in clusters:
            image_ids = FaceMatch.objects.filter(
                cluster=cluster,
                image__user=user,
                image__is_deleted=False
            ).values_list('image_id', flat=True)

            if image_ids:
                groups.append({
                    'id': cluster.id,
                    'image_ids': list(image_ids),
                    'name': cluster.name or 'Unknown'
                })

        return Response({'groups': groups})

class CreateStickerView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        image_id = request.data.get('image_id')
        try:
            original = ImageUpload.objects.get(id=image_id)
            img_path = original.image.path

            with open(img_path, 'rb') as f:
                input_image = f.read()

            output_image = remove(input_image)

            img_bytes = BytesIO(output_image)
            pil_image = Image.open(img_bytes).convert("RGBA")

            buffer = BytesIO()
            pil_image.save(buffer, format="PNG")
            content_file = ContentFile(buffer.getvalue())

            copy = ImageUpload(user=request.user)
            filename = f"sticker_{original.id}.png"
            copy.image.save(filename, content_file)
            copy.save()

            serializer = ImageUploadSerializer(copy, context={'request': request})
            return Response(serializer.data, status=201)

        except ImageUpload.DoesNotExist:
            return Response({"error": "Image not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully."}, status=201)
        return Response(serializer.errors, status=400)

class AdjustImageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            image_id = request.data.get("image_id")
            original = ImageUpload.objects.get(id=image_id)

            image_path = original.image.path

            img = Image.open(image_path).convert("RGB")

            def apply_slider(enhancer_class, value, image):
                if value is None:
                    return image
                scale = (value + 100) / 100
                enhancer = enhancer_class(image)
                return enhancer.enhance(scale)

            img = apply_slider(ImageEnhance.Brightness, request.data.get("brightness"), img)
            img = apply_slider(ImageEnhance.Contrast, request.data.get("contrast"), img)
            img = apply_slider(ImageEnhance.Color, request.data.get("saturation"), img)
            img = apply_slider(ImageEnhance.Sharpness, request.data.get("sharpness"), img)
            
            buffer = BytesIO()
            img.save(buffer, format="JPEG")
            content_file = ContentFile(buffer.getvalue())

            edited = EditedImage.objects.create(original=original, temporary=True)
            edited.edited.save(f"adjusted_{original.id}.jpg", content_file)
            edited.save()

            serializer = EditedImageSerializer(edited, context={'request': request})
            return Response(serializer.data, status=201)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class PreviewStickerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image_id = request.data.get('image_id')
        try:
            original = ImageUpload.objects.get(id=image_id, user=request.user)
            img_path = original.image.path

            with open(img_path, 'rb') as f:
                input_image = f.read()

            output_image = remove(input_image)

            img_bytes = BytesIO(output_image)
            pil_image = Image.open(img_bytes).convert("RGBA")

            filename = f"preview_sticker_{original.id}.png"
            temp_path = os.path.join(settings.MEDIA_ROOT, 'previews', filename)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            pil_image.save(temp_path, format="PNG")

            sticker_url = request.build_absolute_uri(os.path.join(settings.MEDIA_URL, 'previews', filename))
            return Response({'sticker_url': sticker_url}, status=200)

        except ImageUpload.DoesNotExist:
            return Response({"error": "Image not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        
class PreviewEditChainView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from PIL import ImageEnhance

        image_id = request.data.get('image_id')
        edits = request.data.get('edits', [])

        try:
            original = ImageUpload.objects.get(id=image_id, user=request.user)
            image_path = resolve_image_path(request, original)
            img = Image.open(resolve_original_image_path(original)).convert("RGB")

            for edit in edits:
                if edit.startswith('rotate:'):
                    degrees = int(edit.split(':')[1])
                    img = img.rotate(-degrees, expand=True)

                elif edit == 'mirror':
                    img = ImageOps.mirror(ImageOps.exif_transpose(img))

                elif edit == 'grayscale':
                    img = ImageOps.grayscale(img).convert("RGB")

                elif edit.startswith('brightness:'):
                    value = int(edit.split(':')[1])
                    enhancer = ImageEnhance.Brightness(img)
                    img = enhancer.enhance((value + 100) / 100)

                elif edit.startswith('contrast:'):
                    value = int(edit.split(':')[1])
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance((value + 100) / 100)

                elif edit.startswith('saturation:'):
                    value = int(edit.split(':')[1])
                    enhancer = ImageEnhance.Color(img)
                    img = enhancer.enhance((value + 100) / 100)

                elif edit.startswith('sharpness:'):
                    value = int(edit.split(':')[1])
                    enhancer = ImageEnhance.Sharpness(img)
                    img = enhancer.enhance((value + 100) / 100)

            buffer = BytesIO()
            img.save(buffer, format="JPEG")
            content_file = ContentFile(buffer.getvalue())
            filename = f"preview_chain_{image_id}.jpg"

            EditedImage.objects.filter(original=original, temporary=True).delete()

            filename = f"preview_chain_{image_id}.jpg"
            preview_path = os.path.join(settings.MEDIA_ROOT, 'edited', filename)

            with open(preview_path, 'wb') as f:
                f.write(buffer.getvalue())

            edited = EditedImage.objects.create(original=original, temporary=True)
            edited.edited.name = f'edited/{filename}'
            edited.save()

            serializer = EditedImageSerializer(edited, context={'request': request})
            return Response(serializer.data)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class UserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().values('id', 'username', 'email')
        return Response(list(users), status=status.HTTP_200_OK)
    
class FaceClusteringView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        threshold = 0.5

        user_clusters = FaceCluster.objects.filter(facematch__image__user=user).distinct()
        cluster_map = []

        for cluster in user_clusters:
            example_match = FaceMatch.objects.filter(cluster=cluster).first()
            if example_match:
                embedding = FaceEmbedding.objects.filter(image=example_match.image).first()
                if embedding:
                    cluster_map.append((np.array(embedding.encoding), cluster))

        new_embeddings = FaceEmbedding.objects.filter(clustered=False, image__user=user)

        for emb in new_embeddings:
            encoding = np.array(emb.encoding)
            assigned_cluster = None

            for ref_encoding, cluster in cluster_map:
                if face_recognition.compare_faces([ref_encoding], encoding, tolerance=threshold)[0]:
                    assigned_cluster = cluster
                    break

            if not assigned_cluster:

                assigned_cluster = FaceCluster.objects.create()
                cluster_map.append((encoding, assigned_cluster))

            FaceMatch.objects.create(cluster=assigned_cluster, image=emb.image)

            try:
                filename = f'face_{emb.image.id}.jpg'
                save_path = os.path.join('media/uploads', filename)

                if not os.path.exists(save_path):
                    img_path = emb.image.image.path
                    img = face_recognition.load_image_file(img_path)
                    face_locations = face_recognition.face_locations(img)

                    if face_locations:
                        top, right, bottom, left = face_locations[0]
                        pil_img = Image.open(img_path)
                        img_width, img_height = pil_img.size

                        pad = 150
                        top = max(0, top - pad)
                        left = max(0, left - pad)
                        bottom = min(img_height, bottom + pad)
                        right = min(img_width, right + pad)

                        face_crop = pil_img.crop((left, top, right, bottom))
                        face_crop = face_crop.resize((80, 80))
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        face_crop.save(save_path)

            except Exception as e:
                print(f"[Thumbnail] Could not regenerate for image {emb.image.id}: {e}")

            emb.clustered = True
            emb.save()

        return Response({"message": "Face clustering complete."})

class RenameFaceClusterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Missing name'}, status=400)

        try:
            cluster = FaceCluster.objects.get(id=pk)
            cluster.name = name
            cluster.save()
            return Response({'message': 'Cluster renamed successfully'})
        except FaceCluster.DoesNotExist:
            return Response({'error': 'Cluster not found'}, status=404)
        
import requests
from django.core.files.base import ContentFile

class ColorizeImageView(APIView):
    def post(self, request):
        image_id = request.data.get('image_id')
        
        try:
            original = ImageUpload.objects.get(id=image_id)
            image_path = resolve_image_path(request, original)

            # Trimite imaginea către FastAPI (gan_service)
            url = "http://192.168.100.129:8001/colorize/"
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(url, files=files)

            if response.status_code != 200:
                return Response({"error": "Colorization service failed"}, status=500)

            # Primește imaginea colorizată și salvează
            edited_instance = EditedImage.objects.create(original=original, temporary=True)
            edited_instance.edited.save(f"colorized_{image_id}.jpg", ContentFile(response.content))
            edited_instance.save()

            serializer = EditedImageSerializer(edited_instance, context={'request': request})
            return Response(serializer.data, status=201)

        except ImageUpload.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)
