/**
 * Quick Authentication Component
 * Simple login/register interface for the math solver
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { mathSolverApi } from '@/services/mathSolverApi';
import { Ionicons } from '@expo/vector-icons';

interface QuickAuthProps {
  visible: boolean;
  onClose?: () => void; // Make optional since we might not show close button
  onAuthSuccess: () => void;
  fullScreen?: boolean; // New prop to control full screen mode
}

export default function QuickAuth({ visible, onClose, onAuthSuccess, fullScreen = false }: QuickAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const credentials = {
        username: username.trim(),
        password: password.trim(),
      };

      console.log('🔐 Attempting login for:', credentials.username);
      const tokens = await mathSolverApi.login(credentials);

      console.log('✅ Login successful, received tokens');

      Alert.alert('Success', 'Logged in successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onAuthSuccess();
            onClose?.(); // Only call onClose if it exists
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const registerData = {
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
      };

      console.log('📝 Attempting registration for:', registerData.username);
      await mathSolverApi.register(registerData);

      Alert.alert('Success', 'Account created successfully! Please login.', [
        {
          text: 'OK',
          onPress: () => {
            setIsLogin(true);
            setPassword('');
          }
        }
      ]);

    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
  };

  const switchMode = () => {
    clearForm();
    setIsLogin(!isLogin);
  };

  // If full screen mode, render directly without modal wrapper
  if (fullScreen) {
    return (
      <ThemedView style={styles.fullScreenContainer}>
        <View style={styles.fullScreenHeader}>
          <Ionicons name="calculator" size={60} color="#ffffff" style={styles.headerIcon} />
          <ThemedText style={styles.fullScreenTitle}>
            Math Solver
          </ThemedText>
        </View>

        <ScrollView style={styles.fullScreenContent} contentContainerStyle={styles.fullScreenScrollContent}>
          <View style={styles.welcomeSection}>
            <ThemedText style={styles.welcomeTitle}>
              {isLogin ? 'Welcome Back!' : 'Get Started'}
            </ThemedText>
            <ThemedText style={styles.welcomeSubtitle}>
              {isLogin
                ? 'Sign in to continue solving math problems'
                : 'Create your account to begin'
              }
            </ThemedText>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Username</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Email</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={isLogin ? handleLogin : handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={isLogin ? "log-in" : "person-add"}
                      size={20}
                      color="#ffffff"
                    />
                    <ThemedText style={styles.buttonText}>
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.switchSection}>
              <ThemedText style={styles.switchPrompt}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </ThemedText>
              <TouchableOpacity
                style={styles.switchButton}
                onPress={switchMode}
                disabled={isLoading}
              >
                <ThemedText style={styles.switchText}>
                  {isLogin ? "Sign Up" : "Sign In"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.serverInfo}>
            <Ionicons name="server" size={16} color="#666" />
            <ThemedText style={styles.serverText}>
              Connected to: 37.60.234.118:8000
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {isLogin ? 'Login Required' : 'Create Account'}
          </ThemedText>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.subtitle}>
            {isLogin
              ? 'Please login to solve math problems with AI'
              : 'Create an account to get started'
            }
          </ThemedText>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={switchMode}
              disabled={isLoading}
            >
              <ThemedText style={styles.switchText}>
                {isLogin
                  ? "Don't have an account? Create one"
                  : "Already have an account? Login"
                }
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoText}>
              🔒 Connecting to: 37.60.234.118:8000
            </ThemedText>
            <ThemedText style={styles.infoText}>
              ✨ Secure authentication required for AI math solving
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fullScreenHeader: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 10,
    opacity: 0.9,
  },
  fullScreenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  fullScreenContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fullScreenScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  switchPrompt: {
    fontSize: 14,
    color: '#666',
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginTop: 'auto',
  },
  serverText: {
    fontSize: 12,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  formContainer: {
    gap: 16,
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    padding: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});
