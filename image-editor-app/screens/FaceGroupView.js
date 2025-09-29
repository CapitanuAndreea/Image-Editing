import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { IP } from './config';

export default function FaceGroupView({ route, navigation }) {
  const ids = Array.isArray(route.params?.ids) ? route.params.ids : [];
  const groupName = route.params?.name;

  console.log('FaceGroupView → ids:', ids);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        if (ids.length === 0) {
          setImages([]);
          setLoading(false);
          return;
        }

        const results = await Promise.all(
          ids.map(id =>
            fetch(`http://${IP}:8000/api/images/${id}/`).then(res => res.json())
          )
        );

        setImages(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [ids]);

 const renderItem = ({ item }) => (
  <TouchableOpacity
    onPress={() => navigation.navigate('ImageDetail', { id: item.id })}
    style={styles.imageWrapper}
  >
    <Image source={{ uri: item.image }} style={styles.image} />
  </TouchableOpacity>
);

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="folder-outline" size={24} color="#F6CEFC" style={{ marginRight: 8, marginBottom: 17 }} />
        <Text style={styles.title}>
          {groupName ? `Folder: ${groupName}` : 'Person Folder'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F6CEFC" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={images}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.gallery}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11001C',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    color: '#F6CEFC',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
  gallery: {
    paddingBottom: 50,
  },
});