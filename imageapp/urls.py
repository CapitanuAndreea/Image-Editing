from django.urls import path
from .views import ImageUploadView, PreviewEditChainView, RenameFaceClusterView
from .views import ImageListView
from .views import ImageDetailView
from .views import CropImageView
from .views import RotateImageView
from .views import MirrorImageView
from .views import GrayscaleImageView
from .views import ImageSearchView
from .views import ReplaceImageView
from .views import SaveAsCopyView
from .views import RevertImageView
from .views import RecycleBinListView
from .views import RestoreImageView
from .views import PermanentDeleteImageView
from .views import FaceGroupView
from .views import CreateStickerView
from .views import RegisterView
from .views import AdjustImageView
from .views import PreviewStickerView
from .views import UserListView
from .views import FaceClusteringView
from .views import ColorizeImageView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('upload/', ImageUploadView.as_view(), name='image-upload'),
    path('images/', ImageListView.as_view(), name='image-list'),
    path('edit/crop/', CropImageView.as_view(), name='image-crop'),
    path('images/<int:pk>/', ImageDetailView.as_view(), name='image-detail'),
    path('edit/rotate/', RotateImageView.as_view(), name='image-rotate'),
    path('edit/mirror/', MirrorImageView.as_view(), name='image-mirror'),
    path('edit/grayscale/', GrayscaleImageView.as_view(), name='image-grayscale'),
    path('search/', ImageSearchView.as_view(), name='image-search'),
    path('images/<int:pk>/', ImageDetailView.as_view(), name='image-detail'),
    path('images/<int:pk>/replace/', ReplaceImageView.as_view(), name='replace-image'),
    path('images/copy/', SaveAsCopyView.as_view(), name='save-as-copy'),
    path('images/<int:pk>/revert/', RevertImageView.as_view(), name='revert-image'),
    path('recycle/', RecycleBinListView.as_view(), name='recycle-bin'),
    path('images/<int:pk>/restore/', RestoreImageView.as_view()),
    path('images/<int:pk>/permanent-delete/', PermanentDeleteImageView.as_view()),
    path('faces/group/', FaceGroupView.as_view(), name='face-group'),
    path('edit/create_sticker/', CreateStickerView.as_view(), name='create-sticker'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('edit/adjust/', AdjustImageView.as_view(), name='adjust-image'),
    path('edit/preview_sticker/', PreviewStickerView.as_view(), name='preview-sticker'),
    path('edit/preview_chain/', PreviewEditChainView.as_view(), name='preview-edit-chain'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('faces/cluster/', FaceClusteringView.as_view(), name='face-cluster'),
    path('faces/cluster/<int:pk>/rename/', RenameFaceClusterView.as_view()),
    path('edit/colorize/', ColorizeImageView.as_view(), name='colorize-image'),
]