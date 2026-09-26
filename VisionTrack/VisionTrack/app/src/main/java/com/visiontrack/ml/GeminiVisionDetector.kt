package com.visiontrack.ml

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.RectF
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real-time AI Vision object detector powered by Google Gemini Vision API
 * with automatic local tree fallback for offline mode.
 */
@Singleton
class GeminiVisionDetector @Inject constructor() {

    // Configurable Gemini API Key (User can set or use default)
    var apiKey: String = ""

    private val gson = Gson()

    fun detectTrees(bitmap: Bitmap): List<Detection> {
        if (apiKey.isBlank()) {
            return detectLocalTreeFallback(bitmap)
        }

        return kotlinx.coroutines.runBlocking(Dispatchers.IO) {
            try {
            // Compress bitmap to JPEG (max 512px for sub-second low-latency inference)
            val scaled = scaleBitmap(bitmap, 512)
            val stream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 80, stream)
            val imageBytes = stream.toByteArray()
            val base64Image = Base64.getEncoder().encodeToString(imageBytes)

            // Build Gemini Vision JSON payload with 2D Bounding Box schema
            val requestJson = JsonObject().apply {
                val contents = JsonArray().apply {
                    val contentObj = JsonObject().apply {
                        val parts = JsonArray().apply {
                            val textPart = JsonObject().apply {
                                addProperty(
                                    "text",
                                    "Locate all trees, plants, foliage, leaves, and green vegetation in this image. " +
                                            "Return ONLY a valid raw JSON array of bounding boxes with no markdown formatting. " +
                                            "Format: [{\"label\": \"Tree\", \"box_2d\": [ymin, xmin, ymax, xmax]}] where coordinates are normalized integers 0 to 1000."
                                )
                            }
                            val inlineDataPart = JsonObject().apply {
                                val inlineObj = JsonObject().apply {
                                    addProperty("mime_type", "image/jpeg")
                                    addProperty("data", base64Image)
                                }
                                add("inline_data", inlineObj)
                            }
                            add(textPart)
                            add(inlineDataPart)
                        }
                        add("parts", parts)
                    }
                    add(contentObj)
                }
                add("contents", contents)
            }

            val endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
            val url = URL(endpoint)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 3000
                readTimeout = 3000
            }

            connection.outputStream.use { os ->
                os.write(requestJson.toString().toByteArray(Charsets.UTF_8))
            }

            if (connection.responseCode == 200) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val parsed = parseGeminiBoundingBoxes(responseText, bitmap.width, bitmap.height)
                if (parsed.isNotEmpty()) return@runBlocking parsed
            } else {
                Timber.w("Gemini API HTTP Error: ${connection.responseCode}")
            }
        } catch (e: Exception) {
            Timber.e(e, "Gemini Vision API error — using local fallback")
        }

        return@runBlocking detectLocalTreeFallback(bitmap)
        }
    }

    private fun parseGeminiBoundingBoxes(jsonResponse: String, imgW: Int, imgH: Int): List<Detection> {
        val results = mutableListOf<Detection>()
        try {
            val root = gson.fromJson(jsonResponse, JsonObject::class.java)
            val candidates = root.getAsJsonArray("candidates") ?: return emptyList()
            if (candidates.size() == 0) return emptyList()
            val text = candidates[0].getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")[0].getAsJsonObject()
                .get("text").asString

            val cleanJson = text.replace("```json", "").replace("```", "").trim()
            val boxesArray = gson.fromJson(cleanJson, JsonArray::class.java)

            for (i in 0 until boxesArray.size()) {
                val item = boxesArray[i].asJsonObject
                val label = item.get("label")?.asString ?: "Tree"
                val box2d = item.getAsJsonArray("box_2d") ?: continue
                if (box2d.size() >= 4) {
                    val ymin = box2d[0].asFloat / 1000f
                    val xmin = box2d[1].asFloat / 1000f
                    val ymax = box2d[2].asFloat / 1000f
                    val xmax = box2d[3].asFloat / 1000f

                    val rect = RectF(
                        xmin * imgW,
                        ymin * imgH,
                        xmax * imgW,
                        ymax * imgH
                    )
                    results.add(Detection(label = label, confidence = 0.95f, boundingBox = rect, classIndex = 58))
                }
            }
        } catch (e: Exception) {
            Timber.w(e, "Failed to parse Gemini response")
        }
        return results
    }

    /**
     * Local computer vision fallback: scans for green foliage / tree canopy clusters
     * in the camera frame when offline or without API key.
     */
    private fun detectLocalTreeFallback(bitmap: Bitmap): List<Detection> {
        val width = bitmap.width
        val height = bitmap.height
        val sampleW = 64
        val sampleH = 64
        val scaled = Bitmap.createScaledBitmap(bitmap, sampleW, sampleH, false)

        var minX = sampleW
        var minY = sampleH
        var maxX = 0
        var maxY = 0
        var greenPixelCount = 0

        val hsv = FloatArray(3)
        for (y in 0 until sampleH) {
            for (x in 0 until sampleW) {
                val pixel = scaled.getPixel(x, y)
                Color.colorToHSV(pixel, hsv)
                val hue = hsv[0]        // Green hue is between ~60° and 160°
                val sat = hsv[1]        // Saturation > 0.20
                val valBrightness = hsv[2]

                if (hue in 50f..160f && sat > 0.15f && valBrightness > 0.15f) {
                    greenPixelCount++
                    if (x < minX) minX = x
                    if (y < minY) minY = y
                    if (x > maxX) maxX = x
                    if (y > maxY) maxY = y
                }
            }
        }

        val totalPixels = sampleW * sampleH
        val greenRatio = greenPixelCount.toFloat() / totalPixels

        // If >= 8% of frame contains green foliage/tree canopy, create a Tree bounding box
        if (greenRatio >= 0.08f && maxX > minX && maxY > minY) {
            val left = (minX.toFloat() / sampleW) * width
            val top = (minY.toFloat() / sampleH) * height
            val right = (maxX.toFloat() / sampleW) * width
            val bottom = (maxY.toFloat() / sampleH) * height

            val confidence = (0.70f + (greenRatio * 0.5f)).coerceAtMost(0.98f)

            return listOf(
                Detection(
                    label = "Tree",
                    confidence = confidence,
                    boundingBox = RectF(left, top, right, bottom),
                    classIndex = 58
                )
            )
        }

        return emptyList()
    }

    private fun scaleBitmap(source: Bitmap, maxDim: Int): Bitmap {
        val w = source.width
        val h = source.height
        val max = maxOf(w, h)
        if (max <= maxDim) return source
        val scale = maxDim.toFloat() / max
        return Bitmap.createScaledBitmap(source, (w * scale).toInt(), (h * scale).toInt(), true)
    }
}
