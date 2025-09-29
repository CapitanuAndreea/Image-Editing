# Mobile Application for Intelligent Image Editing and Search
 
**a cross-platform mobile application for editing and intelligently managing images using AI and computer vision techniques**.  

The project combines classical image editing tools with modern **AI-powered features** such as object detection, face recognition, and background removal.  
A key focus is that **all AI processing runs locally**, ensuring low latency and full data privacy.

---

## Features

### Core Features
- Secure user registration and authentication (JWT-based)
- Upload images from device gallery or camera
- Real-time image editing: brightness, contrast, saturation, sharpness, rotation, crop, mirror
- Save edits as a copy or overwrite the original
- Revert functionality to restore the original image
- Trash bin with restore and permanent delete

### AI Features
- **Object detection** with YOLOv8 for automatic labeling and keyword search
- **Face recognition & clustering** with automatic folder creation and thumbnail generation
- **Sticker generation** by background removal (U²-Net via `rembg`)

### User Experience
- Intuitive, responsive UI in **React Native**.
- Dark theme with pastel accents.
- Animated modals, haptic feedback, and validation messages.

---

## Architecture

- **Frontend:** React Native (cross-platform for Android/iOS) 
- **Backend:** Django + Django REST Framework (REST API)
- **Database:** PostgreSQL
- **Image processing & AI:**  
  - Pillow for classical image filters
  - YOLOv8 for object detection 
  - `face_recognition` (dlib-based) for embeddings & clustering
  - `rembg` (U²-Net) for background removal
- **Authentication:** JWT tokens

The app follows a **client–server model**. The React Native client communicates with the Django API, which stores user data and runs AI models locally on the server.

---

## Precalculations Workflow

Every image upload triggers a chain of preprocessing tasks designed for **fast search, clustering, and organization** later on:

1. **Image save:**  
   The raw file is stored in the media directory, and metadata is registered in PostgreSQL.

2. **Object detection:**  
   YOLOv8 runs immediately on the uploaded image. The detected classes (e.g., *cat*, *book*, *car*) are stored as labels in the database. These labels later power the **search engine**, where the user can query by keyword.

3. **Face embedding generation:**  
   All detected faces are transformed into **128-dimensional embeddings** using the `face_recognition` model.  
   - If a match with an existing embedding is found (distance < 0.6), the image is linked to that cluster.  
   - If not, a **new cluster** is created.  
   - Each cluster automatically receives a **thumbnail**, generated from the first image containing that person.

4. **Cluster consistency:**  
   If a thumbnail image is deleted, the system automatically updates it with the next available image in that cluster. Empty clusters are removed, along with all associated embeddings and cropped face images.

5. **Optimized storage for edits:**  
   During editing, a **temporary version** of the image is maintained in `/media/edited/`. Filters are applied incrementally to this version, preserving the original file. The user can then either revert, overwrite, or save a copy. This reduces storage overhead and ensures a consistent workflow.

This pipeline ensures that by the time the user opens the gallery, all images are already **tagged, searchable, and clustered**, without manual effort.

---