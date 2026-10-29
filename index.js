import "dotenv/config";
import express from "express";
import multer from "multer";
import PredictionApi from "@azure/cognitiveservices-customvision-prediction";
import msRest from "@azure/ms-rest-js";

const predictionKey = process.env.VISION_PREDICTION_KEY;
const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;
const projectId = process.env.VISION_PROJECT_ID; // from the Custom Vision portal
const publishIterationName = "Iteration1";

const credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Prediction-key": predictionKey },
});
const predictor = new PredictionApi.PredictionAPIClient(
  credentials,
  predictionEndpoint,
);

const app = express();
const upload = multer(); // keeps the upload in memory as a Buffer

app.post("/", upload.single("image"), async (req, res) => {
  try {
    const results = await predictor.classifyImage(
      projectId,
      publishIterationName,
      req.file.buffer,
    );

    res.json(
      results.predictions.map((p) => ({
        tag: p.tagName,
        probability: p.probability,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Classification failed" });
  }
});

export default app;
