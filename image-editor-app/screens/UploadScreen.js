import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';

import { IP } from './config';

const screenWidth = Dimensions.get('window').width;

export default function UploadScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

useEffect(() => {
  SystemUI.setBackgroundColorAsync('#11001C');
  (async () => {
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

    if (galleryStatus !== 'granted') {
      triggerModal('Please allow access to the gallery.');
    }
    if (cameraStatus !== 'granted') {
      triggerModal('Please allow access to the camera.');
    }
  })();
}, []);

  const triggerModal = (message) => {
    setModalMessage(message);
    setShowModal(true);
    SystemUI.setBackgroundColorAsync('#11001C');
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const closeModal = () => {
    setShowModal(false);
    SystemUI.setBackgroundColorAsync('#11001C');
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        base64: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        setSelectedImage(image);
        uploadImage(image);
      }
    } catch (err) {
      console.error('Image picker failed:', err);
      triggerModal('Failed to pick image.');
    }
  };

const takePhoto = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      setSelectedImage(image);
      uploadImage(image);
    }
  } catch (err) {
    console.error('Camera failed:', err);
    triggerModal('Failed to take photo.');
  }
};

  const uploadImage = async (image) => {
    const uri = image.uri;
    const filename = uri.split('/').pop();
    const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: filename,
      type,
    });

    try {
      const token = await AsyncStorage.getItem('access');

      const response = await fetch(`http://${IP}:8000/api/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        triggerModal('Image uploaded successfully!');
        await fetch(`http://${IP}:8000/api/faces/cluster/`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      } else {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        triggerModal('Failed to upload image.');
      }
    } catch (error) {
      console.error(error);
      triggerModal('Upload failed!');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Ionicons name="image-outline" size={24} color="#F6CEFC" />
        <Text style={styles.uploadText}>Pick an image from gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
        <Ionicons name="camera-outline" size={24} color="#F6CEFC" />
        <Text style={styles.uploadText}>Take a photo</Text>
      </TouchableOpacity>

      {selectedImage && (
        <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
      )}

      <Modal transparent visible={showModal} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
            <Text style={styles.modalTitle}>Notice</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#11001C',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6CEFC22',
    borderColor: '#F6CEFC',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  uploadText: {
    color: '#F6CEFC',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  preview: {
    width: screenWidth * 0.85,
    height: screenWidth * 0.85,
    borderRadius: 16,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: '#F6CEFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1A001F',
    padding: 20,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F6CEFC',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#F6CEFC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalButtonText: {
    color: '#11001C',
    fontWeight: 'bold',
  },
});