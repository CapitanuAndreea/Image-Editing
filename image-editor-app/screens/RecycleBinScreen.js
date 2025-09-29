import { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IP } from './config';

export default function RecycleBinScreen() {
  const [deletedImages, setDeletedImages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const insets = useSafeAreaInsets(); 

  const fetchDeletedImages = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      const res = await fetch(`http://${IP}:8000/api/recycle/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDeletedImages(data);
    } catch (err) {
      console.error('Failed to fetch deleted images:', err);
    }
  };

  useEffect(() => {
    fetchDeletedImages();
  }, []);

  const restoreImage = async (id) => {
    try {
      const token = await AsyncStorage.getItem('access');
      await fetch(`http://${IP}:8000/api/images/${id}/restore/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setModalMessage('Image has been restored.');
      await fetch(`http://${IP}:8000/api/faces/cluster/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setConfirmAction(null);
      setModalVisible(true);
      fetchDeletedImages();
    } catch {
      setModalMessage('Failed to restore image.');
      setConfirmAction(null);
      setModalVisible(true);
    }
  };

  const deleteForever = async (id) => {
    setModalMessage('Are you sure you want to permanently delete this image?');
    setConfirmAction(() => async () => {
      try {
        const token = await AsyncStorage.getItem('access');
        const res = await fetch(
          `http://${IP}:8000/api/images/${id}/permanent-delete/`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.status === 204 || res.ok) {
          fetchDeletedImages();
          await fetch(`http://${IP}:8000/api/faces/cluster/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setModalMessage('Image permanently removed.');
          setConfirmAction(null);
          setModalVisible(true);
        } else {
          setModalMessage('Could not delete image.');
          setConfirmAction(null);
          setModalVisible(true);
        }
      } catch (err) {
        if (err.message.includes('Network request failed')) {
          fetchDeletedImages();
          setModalMessage('Image removed successfully.');
        } else {
          setModalMessage('Something went wrong.');
        }
        setConfirmAction(null);
        setModalVisible(true);
      }
    });
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.buttonsRow}>
        <TouchableOpacity onPress={() => restoreImage(item.id)} style={styles.restoreBtn}>
          <Ionicons name="refresh" size={20} color="#A0F6CF" />
          <Text style={styles.restoreText}> Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteForever(item.id)} style={styles.permaDeleteBtn}>
          <Ionicons name="trash" size={20} color="#F6A0A0" />
          <Text style={styles.permaDeleteText}> Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={deletedImages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 30,
          
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Your Recycle Bin is empty.</Text>
        }
      />

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Notice</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              {confirmAction && (
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    confirmAction();
                  }}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11001C',
    paddingHorizontal: 12,
  },
  imageContainer: {
    backgroundColor: '#1D012A',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A0F6CF22',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderColor: '#A0F6CF',
    borderWidth: 1,
  },
  restoreText: {
    color: '#A0F6CF',
    fontWeight: '600',
    fontSize: 14,
  },
  permaDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6A0A022',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderColor: '#F6A0A0',
    borderWidth: 1,
  },
  permaDeleteText: {
    color: '#F6A0A0',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 80,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#1A001F',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    color: '#F6CEFC',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 5,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 5,
    borderRadius: 8,
    backgroundColor: '#F6CEFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: '#11001C',
    textAlign: 'center',
  },
});