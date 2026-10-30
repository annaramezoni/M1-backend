import "dotenv/config";
import express from "express";
import multer from "multer";
import cors from "cors";
import PredictionApi from "@azure/cognitiveservices-customvision-prediction"; //SDK - it gives tools to communicate with Azure Custom Vision..
import msRest from "@azure/ms-rest-js"; // provides another set of tools that helps you prepare and authenticate those requests.

const predictionKey = process.env.VISION_PREDICTION_KEY;
const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;
const projectId = process.env.VISION_PROJECT_ID;
const publishIterationName = "Iteration2";

// ==== Authenticate the client ==== //

const credentials = new msRest.ApiKeyCredentials({
  // Add the Azure prediction key to the request header so Azure can authenticate our request.
  inHeader: { "Prediction-key": predictionKey },
});

//the SDK provides PredictionAPIClient, which helps you communicate with the Azure prediction service.
const predictor = new PredictionApi.PredictionAPIClient( // Combines the credentials and the prediction endpoint to create a client that can make a prediction request.
  credentials, //tells the client how to authenticate
  predictionEndpoint, //tells the client which Azure API address to contact
);

// ==== Express ==== //

const app = express();

// ==== CORS - to accept both local and deployed address ==== //
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mango-tree-04a4ebe00.1.azurestaticapps.net",
    ],
  }),
);

// ==== MULTER ==== //
// Configure Multer to receive uploaded files and store them temporarily in memory as a Buffer (binary image data).
const upload = multer({
  storage: multer.memoryStorage(), //Stores the uploaded image temporarily in the server's memory (RAM).
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB, IF someone uploadED a 50 MB image, THE backend would need to temporarily hold that image in RAM.
  fileFilter: (req, file, cb) => {
    //fileFilter allows you to decide whether Multer should accept or reject an uploaded file.
    const allowed = ["image/jpeg", "image/png", "image/bmp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      //file.mimetype: the MIME type of the uploaded file. Ex.: "image/png"
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

// ==== ENDPOINT ==== //
app.get("/", (req, res) => {
  return res.status(200).json({ text: "Welcome to the TurnersCars API" });
});

app.post("/upload", upload.single("image"), async (req, res) => {
  // Checks whether the user uploaded an image
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    // Sends the image to Azure Custom Vision
    const result = await predictor.classifyImage(
      //This method sends the image to Azure Custom Vision for classification - using the method from the prediction client created earlier
      projectId,
      publishIterationName,
      req.file.buffer, //	Contains the actual image data uploaded by the user.
    );

    // Finds the prediction with the highest probability
    const bestPrediction = result.predictions.reduce((best, current) =>
      current.probability > best.probability ? current : best,
    );

    // Returns the best prediction to React
    res.json({
      "Vehicle Type": bestPrediction.tagName,
      Probability: bestPrediction.probability,
    });
  } catch (err) {
    console.error(err);
    // Inform the frontend that classification failed
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
    //instanceof is a JavaScript operator used to check whether an object was created from a particular class or constructor.
    return res.status(413).json({ error: "Image must be 4 MB or smaller" });
  }
  console.error(err);
  res.status(500).json({ error: "Upload failed" });
});

export default app;
