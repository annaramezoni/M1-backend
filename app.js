import "dotenv/config";
import express from "express";
import multer from "multer";
import cors from "cors";
import PredictionApi from "@azure/cognitiveservices-customvision-prediction";
import msRest from "@azure/ms-rest-js";

const predictionKey = process.env.VISION_PREDICTION_KEY;
const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;
const projectId = process.env.VISION_PROJECT_ID;
const publishIterationName = "Iteration2";

// ==== Authenticate the client ==== //
//Instantiate client objects with your endpoint and key. Create an ApiKeyCredentials object with your key, and use it with your endpoint to create a TrainingAPIClient and PredictionAPIClient object.

const credentials = new msRest.ApiKeyCredentials({
  // Add the Azure prediction key to the request header so Azure can authenticate our request.
  inHeader: { "Prediction-key": predictionKey },
});

const predictor = new PredictionApi.PredictionAPIClient( // Create a client to communicate with Azure Custom Vision. It uses our credentials and the Azure prediction endpoint.
  credentials,
  predictionEndpoint,
);

const app = express();
app.use(cors());

// Configure Multer to receive uploaded files and store them temporarily in memory as a Buffer (binary image data).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/bmp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

app.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const result = await predictor.classifyImage(
      projectId,
      publishIterationName,
      req.file.buffer,
    );

    const bestPrediction = result.predictions.reduce((best, current) =>
      current.probability > best.probability ? current : best,
    );

    res.json({
      "Vehicle Type": bestPrediction.tagName,
      Probability: bestPrediction.probability,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Classification failed" });
  }
});

app.use((err, req, res, next) => {
  if (err.message === "INVALID_FILE_TYPE") {
    return res
      .status(415)
      .json({ error: "Only JPEG, PNG, BMP or GIF images are allowed" });
  }
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image must be 4 MB or smaller" });
  }
  console.error(err);
  res.status(500).json({ error: "Upload failed" });
});

export default app;
