import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { IP } from './config';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#11001C');
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

  const handleRegister = async () => {
    try {
      const response = await fetch(`http://${IP}:8000/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        triggerModal('Account created!');
        setTimeout(() => navigation.replace('Login'), 1500);
      } else {
        const errorText = await response.text();
        console.error('Register failed:', errorText);
        triggerModal('Could not register. Try another username?');
      }
    } catch (error) {
      console.error(error);
      triggerModal('Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#11001C' }}>
      <StatusBar barStyle="light-content" backgroundColor="#11001C" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 30 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.welcome}>Welcome to PixyCut!</Text>

            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} onChangeText={setUsername} value={username} />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              secureTextEntry
            />

            <TouchableOpacity onPress={handleRegister} style={styles.button}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            <Text style={styles.link} onPress={() => navigation.replace('Login')}>
              Already have an account? Login
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11001C',
    padding: 20,
    justifyContent: 'center',
  },
  welcome: {
    fontSize: 28,
    color: '#F6CEFC',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  label: {
    color: '#F6CEFC',
    fontSize: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F6CEFC22',
    borderColor: '#F6CEFC',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#F6CEFC',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  link: {
    color: '#F6CEFC',
    marginTop: 30,
    textAlign: 'center',
    textDecorationLine: 'underline',
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