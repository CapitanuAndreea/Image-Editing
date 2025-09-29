import { useCallback, useState } from 'react';
import { View, Text, SectionList, Image, StyleSheet, TouchableOpacity, StatusBar, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import { IP } from './config';

export default function HomeScreen() {
  const [images, setImages] = useState([]);
  const navigation = useNavigation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

useFocusEffect(
  useCallback(() => {
    const fetchImages = async () => {
      const token = await AsyncStorage.getItem('access');
      const response = await fetch(`http://${IP}:8000/api/images/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setImages(data);
    };

    fetchImages().catch(console.error);
  }, [])
);

  const grouped = {};
  images.forEach(img => {
    const date = moment(img.uploaded_at);
    const today = moment();
    const yesterday = moment().subtract(1, 'day');

    let label;
    if (date.isSame(today, 'day')) label = 'Today';
    else if (date.isSame(yesterday, 'day')) label = 'Yesterday';
    else if (date.year() === today.year()) label = date.format('D MMM');
    else label = date.format('D MMM YYYY');

    if (!grouped[label]) grouped[label] = [];
    if (!grouped[label].length || grouped[label][grouped[label].length - 1].length === 2) 
    {
        grouped[label].push([img]);
    } 
    else 
    {
        grouped[label][grouped[label].length - 1].push(img);
    }

  });

  const sections = Object.keys(grouped).map(label => ({
    title: label,
    data: grouped[label],
  }));

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.imageWrapper}
      onPress={() => navigation.navigate('ImageDetail', { id: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#11001C" />
          <View style={styles.header}>
            <Text style={styles.title}>My Gallery</Text>
            <View style={styles.iconRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Ionicons name="search" size={28} color="#F6CEFC" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('RecycleBin')}>
                <Ionicons name="trash-bin-outline" size={28} color="#F6CEFC" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLogoutModal(true)}>
                <Ionicons name="log-out-outline" size={28} color="#F6CEFC" />
              </TouchableOpacity>
            </View>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `row-${index}`}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.map(img => (
                  <TouchableOpacity
                    key={img.id}
                    style={styles.imageWrapper}
                    onPress={() => navigation.navigate('ImageDetail', { id: img.id })}
                  >
                    <Image source={{ uri: img.image }} style={styles.image} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.gallery}
            numColumns={2}
          />

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => navigation.navigate('Upload')}
          >
            <Text style={styles.uploadText}>+ Upload New Image</Text>
          </TouchableOpacity>
        
          <Modal
          transparent
          visible={showLogoutModal}
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Log Out</Text>
              <Text style={styles.modalText}>Are you sure you want to log out?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.modalCancel}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    setShowLogoutModal(false);
                    await AsyncStorage.clear();
                    navigation.replace('Login');
                  }}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalButtonText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
      </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10, backgroundColor: '#11001C' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6CEFC',
  },
  sectionHeader: {
    color: '#F6CEFC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 6,
  },
  gallery: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  imageWrapper: {
    flex: 1,
    margin: 5,
    maxWidth: '48%',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  uploadBtn: {
    margin: 20,
    backgroundColor: '#F6CEFC22',
    borderColor: '#F6CEFC',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadText: {
    color: '#F6CEFC',
    fontWeight: '600',
    fontSize: 16,
  },
  row: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
  },
  iconRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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