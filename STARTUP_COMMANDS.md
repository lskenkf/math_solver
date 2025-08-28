# 🚀 Startup Commands for Math Solver App

## Quick Start (2 Terminal Windows)

### Terminal 1 - Backend (FastAPI)

```bash
# Make sure you're in the project root and virtual environment is activated
python start_service.py
```

**Expected Output:**

```
✅ Environment setup looks good!
🚀 Starting Math Solver API service...
📡 Service will be available at: http://localhost:8000
📖 API documentation at: http://localhost:8000/docs
🏥 Health check at: http://localhost:8000/health

Press Ctrl+C to stop the service
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Terminal 2 - Frontend (React Native)

```bash
# In the same project directory (in a new terminal)
npm start
```

**Expected Output:**

```
Starting Metro Bundler...
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press d │ show developer menu
› Press ? │ show all commands
```

## 🎯 After Both Services Are Running

### Test the Backend

Open browser and go to: http://localhost:8000/docs

### Run the Frontend App

In the Metro terminal, press:

- **`i`** for iOS Simulator
- **`a`** for Android Emulator
- **`w`** for Web Browser

## 🛠️ Alternative: Manual Commands

### Backend Only

```bash
# Direct uvicorn command
uvicorn math_solver_service:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Only

```bash
# Alternative React Native commands
npx expo start
# or
npm run ios     # iOS specifically
npm run android # Android specifically
npm run web     # Web specifically
```

## 🔧 Configuration for Physical Devices

If testing on a physical device, update the backend URL:

**File: `config/api.ts`**

```typescript
export const API_CONFIG = {
  // Replace with your computer's IP address
  BASE_URL: "http://YOUR_COMPUTER_IP:8000",
  // For example: 'http://192.168.1.100:8000'
};
```

To find your IP address:

- **Windows**: `ipconfig`
- **macOS/Linux**: `ifconfig` or `ip addr`

## 🐛 Troubleshooting

### Backend Issues

```bash
# If OpenAI dependency issues
pip install --upgrade openai httpx

# If port 8000 is busy
uvicorn math_solver_service:app --host 0.0.0.0 --port 8001 --reload
# (Remember to update frontend config to port 8001)
```

### Frontend Issues

```bash
# If dependencies missing
npm install

# Clear Metro cache
npx expo start --clear

# Reset everything
npx expo start --clear --reset-cache
```

## 📱 Testing the Complete Flow

1. ✅ Backend running at http://localhost:8000
2. ✅ Frontend app launched on device/simulator
3. ✅ Test: Take/select a photo of a math problem
4. ✅ Test: Tap "Solve Math Problem"
5. ✅ Verify: Solution appears with steps

## 🎉 You're Ready!

Both services should now be running and ready to solve math problems! 🧮✨
