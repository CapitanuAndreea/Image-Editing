import os
import face_recognition
from django.core.management.base import BaseCommand
from imageapp.models import ImageUpload, FaceCluster, FaceMatch

class Command(BaseCommand):
    help = 'Detect and cluster faces from uploaded images'

    def handle(self, *args, **options):
        known_encodings = []
        clusters = []

        FaceMatch.objects.all().delete()
        FaceCluster.objects.all().delete()

        for image in ImageUpload.objects.filter(is_deleted=False):
            path = image.image.path
            if not os.path.exists(path):
                continue

            img = face_recognition.load_image_file(path)
            face_locations = face_recognition.face_locations(img)
            face_encodings = face_recognition.face_encodings(img, face_locations)

            for location, encoding in zip(face_locations, face_encodings):
                matched_cluster = None

                for idx, known in enumerate(known_encodings):
                    matches = face_recognition.compare_faces(known, encoding)
                    if any(matches):
                        matched_cluster = clusters[idx]
                        break

                if matched_cluster is None:
                    matched_cluster = FaceCluster.objects.create()
                    known_encodings.append([encoding])
                    clusters.append(matched_cluster)
                else:
                    known_encodings[clusters.index(matched_cluster)].append(encoding)

                FaceMatch.objects.create(
                    cluster=matched_cluster,
                    image=image,
                    face_location=location
                )

        self.stdout.write(self.style.SUCCESS(f'Clustering complete: {FaceCluster.objects.count()} clusters.'))
