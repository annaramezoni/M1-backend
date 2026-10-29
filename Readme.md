## Image Upload Handling with Multer

Multer is middleware for handling `multipart/form-data`, commonly used when uploading files through a frontend application.

In this project, Multer receives the uploaded image and temporarily stores it in memory as a **Buffer** (binary image data). This allows the backend to access the image without saving it to the server's file system.

### How It Works

1. **Receive the image:** Multer processes the incoming HTTP request containing the uploaded image.
2. **Store it in memory:** The image is temporarily stored as a Buffer.
3. **Access the image:** The uploaded file is available through `req.file`.
4. **Process the image:** The Buffer can be passed to the Azure Custom Vision prediction API for image classification.

### Code Example

```javascript
const multer = require("multer");

// Configure Multer to store uploaded files in memory
const upload = multer();

app.post("/", upload.single("image"), async (req, res) => {
  const imageBuffer = req.file.buffer;

  // Pass the imageBuffer to the prediction service
});
```

### Key Concepts

- **Multer:** Middleware that handles file uploads in Express.
- **Memory storage:** Temporarily stores uploaded files in server memory instead of saving them to disk.
- **Buffer:** A Node.js object that represents binary data, such as an image.
- **`upload.single("image")`:** Configures Multer to accept one uploaded file with the field name `image`.
- **`req.file.buffer`:** Provides access to the uploaded image's binary data.

### Important Note

Multer uses memory storage by default when no storage engine is specified. Since uploaded files are stored in memory, it is recommended to configure file size limits to help prevent excessive memory usage.

For example:

```javascript
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum file size: 5 MB
  },
});
```
