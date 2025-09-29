import { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Image, StyleSheet, Text, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IP } from './config';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [faceGroups, setFaceGroups] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newName, setNewName] = useState('');

const fetchFaceGroups = async () => {
  try {
    const token = await AsyncStorage.getItem('access');
    const res = await fetch(`http://${IP}:8000/api/faces/group/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setFaceGroups(data.groups || []);
  } catch (err) {
    console.error('Face group fetch failed', err);
  }
};

useEffect(() => {
  fetchFaceGroups();
}, []);

 const handleSearch = async () => {
  if (!query.trim()) return;
  setSearching(true);
  try {
    const token = await AsyncStorage.getItem('access');

    const response = await fetch(`http://${IP}:8000/api/search/?q=${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    setResults(data);
  } catch (error) {
    console.error(error);
  }
  setSearching(false);
};

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ImageDetail', { id: item.id })} style={styles.imageWrapper}>
      <Image source={{ uri: item.image }} style={styles.image} />
    </TouchableOpacity>
  );

  return (
    <>
          <StatusBar barStyle="light-content" backgroundColor="#11001C" />
          <SafeAreaView style={styles.container}>
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#F6CEFC" />
              </TouchableOpacity>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#F6CEFC" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search (e.g. cat, person)"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
          <Text style={styles.searchText}>Go</Text>
        </TouchableOpacity>
      </View>

      {faceGroups.length > 0 && (
        <View style={styles.faceGroupContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="person-circle-outline" size={22} color="#F6CEFC" style={{ marginRight: 5, marginBottom:  9}} />
          <Text style={styles.faceGroupTitle}>People</Text>
        </View>
          <View style={styles.faceGroupRow}>
            {faceGroups.map((group, index) => {
              const firstId = group.image_ids[0];
              const clusterId = group.id;
              const label = group.name || 'Unknown';

              const imageUrl = `http://${IP}:8000/media/uploads/face_${firstId}.jpg`;

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() =>
                    navigation.navigate('FaceGroupView', {
                      ids: Array.isArray(group.image_ids) ? group.image_ids : [], name: group.name === 'Unknown' ? null : group.name,
                    })
                  }

                  style={styles.faceGroupCard}
                >
                  <Image source={{ uri: imageUrl }} style={styles.faceImage} />
                  {editingIndex === index ? (
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      onSubmitEditing={async () => {
                        try {
                          const token = await AsyncStorage.getItem('access');
                          const res = await fetch(`http://${IP}:8000/api/faces/cluster/${clusterId}/rename/`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ name: newName }),
                          });
                          if (res.ok) {
                            setEditingIndex(null);
                            await fetchFaceGroups();
                          }
                        } catch (err) {
                          console.error('Rename failed', err);
                        }
                      }}
                      onBlur={() => setEditingIndex(null)}
                      style={{ color: '#F6CEFC', fontSize: 12, borderBottomColor: '#F6CEFC88', borderBottomWidth: 1 }}
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity onPress={() => {
                      setEditingIndex(index);
                      setNewName('');
                    }}>
                      <Text style={styles.faceLabel}>{label}</Text>
                    </TouchableOpacity>
                  )}

                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {searching ? (
        <ActivityIndicator size="large" color="#F6CEFC" style={{ marginTop: 20 }} />
      ) : results.length === 0 ? (
        <Text style={styles.status}>No results found.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.gallery}
        />
      )}
    </View>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11001C',
    paddingTop: 50,
    paddingHorizontal: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1D012A',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F6CEFC55',
  },
  input: {
    flex: 1,
    color: '#F6CEFC',
    paddingVertical: 10,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#F6CEFC22',
    borderColor: '#F6CEFC',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  searchText: {
    color: '#F6CEFC',
    fontWeight: '600',
  },
  imageWrapper: {
    flex: 1,
    margin: 5,
    maxWidth: '48%',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  gallery: {
    paddingBottom: 40,
  },
  status: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
  },
  faceGroupContainer: {
    marginBottom: 20,
  },
  faceGroupTitle: {
    fontSize: 20,
    color: '#F6CEFC',
    fontWeight: '600',
    marginBottom: 12,
  },
  faceGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  faceGroupCard: {
    marginRight: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  faceImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#F6CEFC88',
  },
  faceLabel: {
    color: '#F6CEFC',
    fontSize: 12,
    opacity: 0.7,
  },
  backButton: {
  position: 'absolute',
  top: 10,
  left: 10,
  zIndex: 10,
},
});