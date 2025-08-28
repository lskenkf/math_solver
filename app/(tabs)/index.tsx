import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import MathSolutionDisplay from '@/components/MathSolutionDisplay';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MathSolutionResponse, mathSolverApi } from '@/services/mathSolverApi';

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<MathSolutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Solving your math problem...');

  // Request permissions on component mount
  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need camera roll permissions to select math problems to solve.'
        );
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need camera permissions to take pictures of math problems.'
        );
      }
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSolution(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSolution(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const solveMath = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or take a photo first.');
      return;
    }

    console.log('🔄 Starting math solving process...');
    console.log('📸 Selected image URI:', selectedImage);

    setIsLoading(true);
    setError(null);
    setSolution(null);
    setLoadingMessage('Connecting to AI backend...');

    // Progress messages
    const progressMessages = [
      'Connecting to AI backend...',
      'Uploading your math problem...',
      'AI is analyzing the image...',
      'Processing mathematical equations...',
      'Generating step-by-step solution...',
      'Almost done...'
    ];

    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % progressMessages.length;
      setLoadingMessage(progressMessages[messageIndex]);
    }, 3000);

    // Timeout warning after 30 seconds  
    const timeoutWarning = setTimeout(() => {
      setLoadingMessage('Complex math problem detected. This may take up to 90 seconds...');
    }, 30000);

    try {
      console.log('📤 Sending image to backend...');
      const result = await mathSolverApi.solveMathFromImage(selectedImage);
      console.log('✅ Received solution from backend:', result);
      setSolution(result);
    } catch (error) {
      console.error('❌ Error solving math:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to solve math problem';
      setError(errorMessage);
      
      // Show specific timeout message
      if (errorMessage.includes('timed out')) {
        Alert.alert(
          'Request Timed Out', 
          'The AI backend took more than 90 seconds to respond. This might happen with very complex math problems or network issues. Please try again.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Retry', onPress: () => solveMath(), style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to solve math problem: ${errorMessage}`);
      }
    } finally {
      clearInterval(progressInterval);
      clearTimeout(timeoutWarning);
      setIsLoading(false);
      setLoadingMessage('Solving your math problem...');
      console.log('🏁 Math solving process completed');
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setSolution(null);
    setError(null);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <View style={styles.headerImageContainer}>
          <Ionicons name="calculator" size={120} color="#ffffff" style={styles.calculatorIcon} />
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Math Solver 🧮</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.descriptionContainer}>
        <ThemedText type="subtitle">AI-Powered Math Problem Solver</ThemedText>
        <ThemedText>
          Take a photo or select an image of a math problem, and our AI will solve it step by step!
        </ThemedText>

      </ThemedView>

      {/* Image Selection Section */}
      <ThemedView style={styles.imageSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          📸 Select Math Problem
        </ThemedText>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#ffffff" />
            <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="images" size={24} color="#ffffff" />
            <ThemedText style={styles.buttonText}>Choose Image</ThemedText>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            <TouchableOpacity style={styles.solveButton} onPress={solveMath} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="flash" size={24} color="#ffffff" />
                  <ThemedText style={styles.buttonText}>Solve Math Problem</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>

      {/* Loading State */}
      {isLoading && (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Solving your math problem...</ThemedText>
        </ThemedView>
      )}

      {/* Error State */}
      {error && (
        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#dc3545" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={solveMath}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* Solution Display */}
      {solution && (
        <ThemedView style={styles.solutionSection}>
          <View style={styles.solutionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🎯 Solution
            </ThemedText>
            <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
              <Ionicons name="refresh" size={20} color="#007AFF" />
              <ThemedText style={styles.resetButtonText}>New Problem</ThemedText>
            </TouchableOpacity>
          </View>
          <MathSolutionDisplay solution={solution} />
        </ThemedView>
      )}

      {/* Instructions */}
      {!selectedImage && !solution && (
        <ThemedView style={styles.instructionsContainer}>
          <ThemedText type="subtitle">How to Use:</ThemedText>
          <ThemedText style={styles.instruction}>
            1. 📷 Take a photo or select an image of a math problem
          </ThemedText>
          <ThemedText style={styles.instruction}>
            2. ⚡ Tap "Solve Math Problem" to get AI-powered solution
          </ThemedText>
          <ThemedText style={styles.instruction}>
            3. 📖 View step-by-step solution and verification
          </ThemedText>
        </ThemedView>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 178,
    width: '100%',
  },
  calculatorIcon: {
    opacity: 0.7,
  },
  descriptionContainer: {
    gap: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
  },
  imageSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  selectedImageContainer: {
    alignItems: 'center',
    gap: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  solveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#28a745',
    borderRadius: 12,
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
    padding: 24,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8d7da',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#dc3545',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  solutionSection: {
    marginBottom: 24,
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  resetButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  instructionsContainer: {
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    marginBottom: 24,
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
  },
});
