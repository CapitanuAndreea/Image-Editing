# imageapp/utils.py
import os
from .models import EditedImage

def resolve_image_path(request, original):
    """
    Return the filesystem path of the latest temporary edit
    for `original`, or fall back to the original image path.
    """
    last = (
        EditedImage.objects
        .filter(original=original, temporary=True)
        .order_by('-edited_at')
        .first()
    )
    return last.edited.path if last else original.image.path