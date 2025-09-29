import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, Dimensions, StatusBar, TouchableWithoutFeedback, Modal, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { debounce } from 'lodash';
import * as Haptics from 'expo-haptics';
import * as SystemUI from 'expo-system-ui';

import { IP } from './config';

export default function ImageDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [imageData, setImageData] = useState(null);
  const [editedImage, setEditedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [zoomAnim] = useState(new Animated.Value(1));
  const [stickerPreview, setStickerPreview] = useState(null);
  const [stickerScale] = useState(new Animated.Value(0.5));
  const screenWidth = Dimensions.get('window').width;
  const [mainAspectRatio, setMainAspectRatio] = useState(1);
  const [stickerAspectRatio, setStickerAspectRatio] = useState(1);
  const [editChain, setEditChain] = useState([]);
  const [modalMessage, setModalMessage] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetch(`http://${IP}:8000/api/images/${id}/`)
      .then(res => res.json())
      .then(data => {
        setImageData(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id]);

  useEffect(() => {
  if (showStickerModal) {
    Animated.spring(stickerScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  } else {
    stickerScale.setValue(0.8);
  }
}, [showStickerModal]);

useEffect(() => {
  if (showDeleteModal) {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }
}, [showDeleteModal]);

const [customFadeAnim] = useState(new Animated.Value(0));

useEffect(() => {
  if (showCustomModal) {
    customFadeAnim.setValue(0);
    Animated.timing(customFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }
}, [showCustomModal]);

   const refreshImage = () => {
  fetch(`http://${IP}:8000/api/images/${id}/`)
    .then(res => res.json())
    .then(data => {
      setImageData(data);
      setEditedImage(null);

      setTimestamp(Date.now());
    });
};

  useFocusEffect(
  useCallback(() => {
    refreshImage();
  }, [id])
);

const [activeSetting, setActiveSetting] = useState('brightness');
const [adjustments, setAdjustments] = useState({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
});

const triggerModal = (message) => {
  setModalMessage(message);
  setShowCustomModal(true);
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
  setShowCustomModal(false);
  SystemUI.setBackgroundColorAsync('#11001C');
};

 const [timestamp, setTimestamp] = useState(Date.now());

const displayedImage = React.useMemo(() => {
  if (!imageData) return null;
  const base = editedImage || imageData.image;
  return `${base}?t=${timestamp}`;
}, [editedImage, imageData, timestamp]);

const sendEditChain = async (newChain) => {
  const token = await AsyncStorage.getItem('access');
  try {
    const response = await fetch(`http://${IP}:8000/api/edit/preview_chain/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image_id: id, edits: newChain }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Preview error:', errorText);
      triggerModal('Failed to preview edit.');
      return;
    }

    const { edited } = await response.json();
    setEditedImage(edited);
    setTimestamp(Date.now());
  } catch (err) {
    console.error(err);
    triggerModal('Something went wrong.');
  }
};

 const debouncedSendChain = debounce(sendEditChain, 300);

const applyEdit = (edit) => {
  const newChain = [...editChain, edit];
  setEditChain(newChain);
  sendEditChain(newChain);
};

const handleDelete = () => {
  setShowDeleteModal(true);
};

const handleSave = async () => {
  if (!editedImage) return triggerModal('There is no edited image to save.');

  try {
    const token = await AsyncStorage.getItem('access'); 

    const response = await fetch(
      `http://${IP}:8000/api/images/${id}/replace/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (response.ok) {
      await refreshImage();
      setEditedImage(null);
      triggerModal('Image saved and replaced.');
      await fetch(`http://${IP}:8000/api/faces/cluster/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      const errorText = await response.text();
      console.error('Save failed:', errorText);
      triggerModal('Failed to save image.');
    }
  } catch (error) {
    console.error(error);
    triggerModal('Something went wrong.');
  }
};

const [isSavingCopy, setIsSavingCopy] = useState(false);

const handleSaveAsCopy = async () => {
  if (isSavingCopy) return;
  if (!editedImage) {
    return triggerModal('No changes detected to save as a new copy.');
  }

  setIsSavingCopy(true);

  try {
    const token = await AsyncStorage.getItem('access');

    const response = await fetch(
      `http://${IP}:8000/api/images/copy/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ original_id: id }),
      }
    );

    if (response.ok) {
      const { id: newId } = await response.json();
      triggerModal('Saved as copy successfully!');

      setTimeout(async () => {
        try {
          await fetch(`http://${IP}:8000/api/faces/cluster/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (e) {
          console.warn('Clustering after copy failed (silently)', e);
        }
      }, 500);

      setTimeout(() => {
        navigation.replace('ImageDetail', { id: newId });
      }, 1000);
    } else {
      const errorText = await response.text();
      console.error('Save as Copy failed:', errorText);
      triggerModal('Failed to save copy.');
    }
  } catch (error) {
    console.error(error);
    triggerModal('Something went wrong.');
  } finally {
    setIsSavingCopy(false);
  }
};

const handleRevert = () => {
  setEditChain([]);
  setAdjustments({ brightness: 0, contrast: 0, saturation: 0, sharpness: 0 });
  refreshImage();
};

const confirmDelete = async () => {
  try {
    await fetch(`http://${IP}:8000/api/images/${id}/`, {
      method: 'DELETE',
    });
    setShowDeleteModal(false);
    triggerModal('Image has been deleted.');
    navigation.goBack();
  } catch (err) {
    console.error(err);
    setShowDeleteModal(false);
    triggerModal('Failed to delete image.');
  }
};

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#F6CEFC" />;
  }

  return (
  <>
    <StatusBar barStyle="light-content" backgroundColor="#11001C" />

    <SafeAreaView style={styles.container}>

<Modal
  visible={showStickerModal}
  transparent
  animationType="slide"
  onRequestClose={() => {
  setShowStickerModal(false);
  setStickerPreview(null);
}}

>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>

      {stickerPreview && (
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
  <Animated.Image
    source={{ uri: stickerPreview }}
    style={{
            width: '100%',
            maxHeight: Dimensions.get('window').height * 0.5,
            aspectRatio: stickerAspectRatio,
            resizeMode: 'contain',
            transform: [{ scale: stickerScale }],
          }}
    onLoad={({ nativeEvent }) => {
            const { width, height } = nativeEvent.source;
            if (width && height) {
              setStickerAspectRatio(width / height);
            }
    }}
  />
  </View>
)}

      <Text style={styles.modalTitle}>Create Sticker?</Text>
      <Text style={styles.modalText}>Do you want to save this as a sticker in your gallery?</Text>

      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={() => setShowStickerModal(false)} style={styles.modalCancel}>
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
  onPress={async () => {
    setShowStickerModal(false);

    try {
      const token = await AsyncStorage.getItem('access');
      const response = await fetch(`http://${IP}:8000/api/edit/create_sticker/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_id: id }),
      });

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerModal('Sticker saved successfully!');
        setTimeout(() => {
          navigation.navigate('Home');
        }, 1000);
      } else {
        Alert.alert('Error', 'Failed to save sticker.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong.');
    }
  }}
  style={styles.modalConfirm}
>
  <Text style={styles.modalButtonText}>Save</Text>
</TouchableOpacity>

      </View>
    </View>
  </View>
</Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (showEdit) {
              setShowEdit(false);
              setActiveTool(null);
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#F6CEFC" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
  {!showEdit ? (
    <>
      <TouchableOpacity onPress={() => setShowEdit(true)} style={styles.iconButton}>
        <Ionicons name="pencil" size={24} color="#F6CEFC" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
        <Ionicons name="trash" size={24} color="#F6CEFC" />
      </TouchableOpacity>
    </>
  ) : (
    <>
      <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
        <Ionicons name="save-outline" size={24} color="#F6CEFC" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSaveAsCopy} style={styles.iconButton}>
        <Ionicons name="copy-outline" size={24} color="#F6CEFC" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleRevert} style={styles.iconButton}>
        <Ionicons name="refresh-outline" size={24} color="#F6CEFC" />
      </TouchableOpacity>
    </>
  )}
</View>

      </View>
 <View style={styles.imageWrapper}>
  <TouchableWithoutFeedback
    onLongPress={async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      try {
        const token = await AsyncStorage.getItem('access');
        const response = await fetch(`http://${IP}:8000/api/edit/preview_sticker/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ image_id: id }),
        });

        if (response.ok) {
          const { sticker_url } = await response.json();
          setStickerPreview(sticker_url);
          setShowStickerModal(true);
        } else {
          Alert.alert('Error', 'Sticker preview failed.');
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Something went wrong.');
      }
    }}
  >
    <Animated.Image
  source={{ uri: displayedImage }}
  style={[
    styles.detailImage,
    {
      aspectRatio: mainAspectRatio,
      maxHeight: Dimensions.get('window').height * 0.75,
    },
  ]}
  onLoad={({ nativeEvent }) => {
    const { width, height } = nativeEvent.source;
    if (width && height) {
      setMainAspectRatio(width / height);
    }
  }}
/>

  </TouchableWithoutFeedback>
</View>

{showEdit && (
  <>
    <View style={styles.editToolRow}>
      <TouchableOpacity onPress={() => setActiveTool('basic')}>
        <Ionicons name="construct-outline" size={28} color={activeTool === 'basic' ? '#F6CEFC' : '#888'} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setActiveTool('adjust')}>
        <Ionicons name="options-outline" size={28} color={activeTool === 'adjust' ? '#F6CEFC' : '#888'} />
      </TouchableOpacity>
    </View>

    {activeTool === 'basic' && (
      <View style={styles.buttonGroup}>
        <TouchableOpacity onPress={() => applyEdit('rotate:90')} style={styles.editBtn}>
          <Text style={styles.editText}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => applyEdit('mirror')} style={styles.editBtn}>
          <Text style={styles.editText}>Mirror</Text>
        </TouchableOpacity>

        <TouchableOpacity
        onPress={async () => {
          const token = await AsyncStorage.getItem('access');
          const response = await fetch(`http://${IP}:8000/api/edit/colorize/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ image_id: id }),
          });

          if (response.ok) {
            const { edited } = await response.json();
            setEditedImage(edited);
            triggerModal('Image colorized!');
          } else {
            const errorText = await response.text();
            console.error('Colorize error:', errorText);
            triggerModal('Failed to colorize.');
          }
        }}
        style={styles.editBtn}
      >
        <Text style={styles.editText}>Colorize</Text>
    </TouchableOpacity>

      </View>
    )}

    {activeTool === 'adjust' && (
      <>
        <View style={styles.adjustmentRow}>
          {['brightness', 'contrast', 'saturation', 'sharpness'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setActiveSetting(type)}>
              <Ionicons
                name={
                  type === 'brightness'
                    ? 'sunny-outline'
                    : type === 'contrast'
                    ? 'contrast-outline'
                    : type === 'saturation'
                    ? 'color-filter-outline'
                    : 'resize-outline'
                }
                size={30}
                color={activeSetting === type ? '#F6CEFC' : '#888'}
                style={styles.icon}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Slider
          style={{ width: '90%', height: 40 }}
          minimumValue={-100}
          maximumValue={100}
          value={adjustments[activeSetting]}
          minimumTrackTintColor="#F6CEFC"
          maximumTrackTintColor="#444"
          thumbTintColor="#F6CEFC"
          onValueChange={(value) => {
            const updated = {
              ...adjustments,
              [activeSetting]: Math.round(value),
            };
            setAdjustments(updated);

            const baseEdits = editChain.filter(e =>
              !['brightness', 'contrast', 'saturation', 'sharpness'].some(type => e.startsWith(type + ':'))
            );

            const sliders = Object.entries(updated)
              .filter(([_, v]) => v !== 0)
              .map(([k, v]) => `${k}:${v}`);

            const newChain = [...baseEdits, ...sliders];

            setEditChain(newChain);
            debouncedSendChain(newChain);
          }}
        />

        <Text style={{ color: '#F6CEFC', marginBottom: 10 }}>
          {activeSetting.charAt(0).toUpperCase() + activeSetting.slice(1)}: {adjustments[activeSetting]}
        </Text>
      </>
    )}
  </>
)}
      </ScrollView>

      <Modal transparent visible={showCustomModal} animationType="fade" onRequestClose={closeModal}>
  <View style={styles.modalOverlay}>
    <Animated.View style={[styles.modalContainer, { opacity: customFadeAnim }]}>

      <Text style={styles.modalTitle}>Notice</Text>
      <Text style={styles.modalText}>{modalMessage}</Text>
      <TouchableOpacity onPress={closeModal} style={styles.modalConfirm}>
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </Animated.View>
  </View>
</Modal>

<Modal transparent visible={showDeleteModal} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
  <View style={styles.modalOverlay}>
    <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
      <Text style={styles.modalTitle}>Delete Image?</Text>
      <Text style={styles.modalText}>Are you sure you want to delete this image?</Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.modalCancel}>
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} style={styles.modalConfirm}>
          <Text style={styles.modalButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  </View>
</Modal>
    </SafeAreaView>
  </>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11001C',
    padding: 20,
    alignItems: 'center',
  },
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  marginBottom: 10,
},
  scrollContent: {
  flexGrow: 1,
  alignItems: 'center',
  padding: 0,
},

fullImage: {
  width: '100%',
  height: undefined,
  borderRadius: 10,
  marginVertical: 10,
  resizeMode: 'contain',
},
  iconRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  minWidth: 80,
  paddingLeft: 5,
  gap: 12,
},
iconButton: {
  padding: 4,
},
  title: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#F6CEFC',
  flex: 1,
},
  meta: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#F6CEFC',
    marginTop: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 20,
  },
  editBtn: {
    backgroundColor: '#F6CEFC22',
    borderColor: '#F6CEFC',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editText: {
    color: '#F6CEFC',
    fontWeight: '600',
  },
  backButton: {
  padding: 4,
  marginRight: 10,
  marginLeft: 0,
},
iconContainer: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  minWidth: 30,
    paddingRight: 20, 
  gap: 12,
},
saveGroup: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 30,
},
saveBtn: {
  backgroundColor: '#F6CEFC44',
  borderColor: '#F6CEFC',
  borderWidth: 1,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 10,
},
saveText: {
  color: '#F6CEFC',
  fontWeight: '600',
},
adjustmentRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingBottom: 10,
},
icon: {
  marginHorizontal: 8,
},
editToolRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 20,
  marginVertical: 10,
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
  minWidth: 100,
},

modalConfirm: {
 
  paddingVertical: 10,
  paddingHorizontal: 16,
  marginLeft: 5,
  borderRadius: 8,
  backgroundColor: '#F6CEFC',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 140,
},

modalButtonText: {
  fontWeight: 'bold',
  color: '#11001C', 
  textAlign: 'center',      
},

imageWrapper: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 10,
  minHeight: Dimensions.get('window').height * 0.5,
},

detailImage: {
  width: '98%',
    
  
  borderRadius: 10,
},
});