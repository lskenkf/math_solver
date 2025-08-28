# Math Solver API Service

A FastAPI-based web service that solves mathematical equations from images using OpenAI's GPT-4o-mini vision model.

## 🚀 Features

- **Image-to-Math Solving**: Upload images containing mathematical equations and get step-by-step solutions
- **AI-Powered**: Uses OpenAI's GPT-4o-mini model for accurate equation recognition and solving
- **REST API**: Simple HTTP endpoints for easy integration with frontend applications
- **Structured Responses**: Returns well-formatted JSON with solution steps, verification, and results
- **Error Handling**: Comprehensive error handling and validation
- **CORS Enabled**: Ready for frontend integration
- **Health Monitoring**: Built-in health check endpoint

## 📋 Requirements

- Python 3.8+
- OpenAI API Key
- Dependencies listed in `requirements.txt`

## 🛠️ Installation

1. **Clone or navigate to the project directory**

2. **Create a virtual environment** (recommended):

   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## 🚀 Quick Start

### Option 1: Using the startup script (Recommended)

```bash
python start_service.py
```

### Option 2: Direct execution

```bash
python math_solver_service.py
```

### Option 3: Using uvicorn directly

```bash
uvicorn math_solver_service:app --host 0.0.0.0 --port 8000 --reload
```

The service will be available at:

- **API Base**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📡 API Endpoints

### Health Check

```http
GET /health
```

Returns service status information.

**Response:**

```json
{
  "status": "healthy",
  "service": "Math Solver API"
}
```

### Solve Equation

```http
POST /solve-equation
```

Upload an image containing mathematical equations to get solutions.

**Request:**

- `image`: Image file (JPEG, PNG, etc.)
- Maximum file size: 10MB

**Response:**

```json
{
  "title": "Linear Equation Solution",
  "equations": ["2x + 5 = 13"],
  "steps": [
    {
      "description": "Subtract 5 from both sides",
      "calculation": "2x + 5 - 5 = 13 - 5",
      "result": "2x = 8"
    },
    {
      "description": "Divide both sides by 2",
      "calculation": "2x ÷ 2 = 8 ÷ 2",
      "result": "x = 4"
    }
  ],
  "solution": {
    "x": 4,
    "y": null
  },
  "verification": "Substituting x = 4: 2(4) + 5 = 8 + 5 = 13 ✓"
}
```

## 🧪 Testing

Run the test script to verify the service is working:

```bash
python test_service.py
```

This will:

1. Check if the service is running
2. Test the health endpoint
3. Test equation solving with example images (if available)

## 🔧 Frontend Integration

### JavaScript/React Example

```javascript
const solveMath = async (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  try {
    const response = await fetch("http://localhost:8000/solve-equation", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Solution:", result);
      return result;
    } else {
      console.error("Error:", response.statusText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};
```

### React Native Example

```javascript
const solveMathFromCamera = async (imageUri) => {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "math_equation.jpg",
  });

  try {
    const response = await fetch("http://localhost:8000/solve-equation", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error solving math:", error);
  }
};
```

## 🔍 Supported Image Types

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## ⚠️ Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid file, empty file, etc.)
- `413`: File too large (>10MB)
- `500`: Internal server error

## 🔒 Security Considerations

- The service accepts images from any origin (CORS enabled)
- File size is limited to 10MB
- Only image file types are accepted
- API key is loaded from environment variables

## 📝 Logging

The service logs important events:

- Service startup
- Image processing requests
- OpenAI API responses
- Errors and exceptions

## 🛠️ Development

### Project Structure

```
.
├── math_solver_service.py  # Main FastAPI application
├── requirements.txt        # Python dependencies
├── start_service.py       # Startup script
├── test_service.py        # Test script
├── .env                   # Environment variables (create this)
└── README_MATH_SOLVER.md  # This documentation
```

### Adding New Features

1. Add new endpoints in `math_solver_service.py`
2. Update the Pydantic models for new response formats
3. Update this README with new endpoint documentation
4. Add tests in `test_service.py`

## 🤝 Contributing

1. Follow the existing code style
2. Add appropriate error handling
3. Update documentation
4. Test your changes

## 📄 License

This project is provided as-is for educational and development purposes.
