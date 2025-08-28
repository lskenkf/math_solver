# Math Solver React Native Frontend

A React Native app that integrates with the Math Solver FastAPI backend to solve mathematical equations from images using AI.

## 🚀 Features

- **📷 Camera Integration**: Take photos of math problems directly from the app
- **🖼️ Image Selection**: Choose images from your device's gallery
- **🤖 AI-Powered Solving**: Send images to FastAPI backend for AI processing
- **📋 Step-by-Step Solutions**: View detailed solution steps and verification
- **⚡ Real-time Processing**: Live loading states and error handling
- **🎨 Modern UI**: Beautiful, responsive design with themed components

## 📱 Screenshots & UI Components

### Main Features:
- **Home Screen**: Camera/gallery selection with instructions
- **Image Preview**: Selected image display with solve button
- **Loading State**: Progress indicator while processing
- **Solution Display**: Formatted step-by-step solution with verification
- **Error Handling**: User-friendly error messages with retry options

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install the new camera and image picker dependencies
npm install expo-camera expo-image-picker

# Or if using yarn
yarn add expo-camera expo-image-picker
```

### 2. Configure Backend URL

Edit `config/api.ts` to point to your backend:

```typescript
export const API_CONFIG = {
  // Change this to your backend URL
  BASE_URL: 'http://your-backend-url:8000',  // Update this!
  TIMEOUT: 30000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
};
```

For local development:
- **iOS Simulator**: `http://localhost:8000`
- **Android Emulator**: `http://10.0.2.2:8000`
- **Physical Device**: `http://your-computer-ip:8000`

### 3. Start the Backend

Make sure your FastAPI backend is running:

```bash
# In your backend directory
python start_service.py
```

The backend should be accessible at `http://localhost:8000`

### 4. Start the React Native App

```bash
# Start the Expo development server
npm start

# Or run on specific platform
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

## 📱 How to Use

1. **Open the App**: Launch the Math Solver app
2. **Take/Select Image**: 
   - Tap "Take Photo" to use camera
   - Tap "Choose Image" to select from gallery
3. **Solve Problem**: Tap "Solve Math Problem" button
4. **View Solution**: Review the step-by-step solution
5. **New Problem**: Tap "New Problem" to start over

## 🔧 Configuration Options

### API Configuration (`config/api.ts`)

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',    // Backend URL
  TIMEOUT: 30000,                      // Request timeout (30s)
  MAX_FILE_SIZE: 10 * 1024 * 1024,     // Max image size (10MB)
};
```

### Environment-Specific Configs

```typescript
// Development
BASE_URL: 'http://localhost:8000'

// Production  
BASE_URL: 'https://your-production-api.com'
```

## 📂 Project Structure

```
├── app/(tabs)/
│   └── index.tsx              # Main math solver screen
├── components/
│   └── MathSolutionDisplay.tsx # Solution display component
├── services/
│   └── mathSolverApi.ts       # API service for backend communication
├── config/
│   └── api.ts                 # API configuration
└── README_FRONTEND.md         # This file
```

## 🎨 UI Components

### Main Screen (`app/(tabs)/index.tsx`)
- Camera/gallery selection buttons
- Image preview with solve button
- Loading indicators
- Error handling with retry
- Solution display integration

### Solution Display (`components/MathSolutionDisplay.tsx`)
- Formatted equation display
- Step-by-step solution breakdown
- Final answer highlighting
- Verification section

### API Service (`services/mathSolverApi.ts`)
- Backend communication
- Image upload handling
- Response parsing
- Error management

## 🔧 Customization

### Styling
- All styles use React Native StyleSheet
- Colors and spacing can be customized in component styles
- Supports light/dark themes via ThemedText/ThemedView components

### API Integration
- Easily configurable backend URL
- Timeout and file size limits adjustable
- Error handling and retry logic built-in

## 📱 Platform Support

- **iOS**: Full camera and gallery support
- **Android**: Full camera and gallery support  
- **Web**: Gallery selection support (no camera)

## 🔍 Troubleshooting

### Common Issues:

1. **"Cannot connect to backend"**
   - Check if backend is running on specified port
   - Verify BASE_URL in `config/api.ts`
   - For physical devices, use computer's IP address

2. **Camera permissions denied**
   - App will request permissions automatically
   - Check device settings if permissions were denied

3. **Image upload fails**
   - Check image file size (max 10MB)
   - Ensure image format is supported (JPEG, PNG, etc.)

4. **Solution not displaying**
   - Check backend logs for API errors
   - Verify OpenAI API key is configured in backend

### Network Configuration:

- **Local Development**: `http://localhost:8000`
- **Android Emulator**: `http://10.0.2.2:8000` 
- **Physical Device**: `http://YOUR_COMPUTER_IP:8000`

## 🚀 Deployment

### For Production:
1. Update `BASE_URL` in `config/api.ts` to production backend
2. Build the app using Expo build services
3. Deploy backend to cloud service (AWS, Google Cloud, etc.)
4. Update API configuration accordingly

## 🤝 Integration with Backend

This frontend is designed to work with the Math Solver FastAPI backend. Make sure:

1. ✅ Backend is running and accessible
2. ✅ CORS is enabled for your frontend domain
3. ✅ OpenAI API key is configured in backend
4. ✅ All required backend dependencies are installed

## 📝 Development Notes

- Uses Expo for easy development and deployment
- TypeScript for type safety
- Modular architecture for easy maintenance
- Comprehensive error handling and user feedback
- Responsive design works on various screen sizes

Enjoy solving math problems with AI! 🧮✨
