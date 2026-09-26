#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ESP32Servo.h>
#include <Adafruit_VL53L0X.h>
#include <TinyGPS++.h>
#include <math.h>

// ============================================================
// 6-WHEEL ESP32 ROVER
//
// Motor arrangement:
//   - OLD L298N: 4 REAR WHEELS
//       OUT1/OUT2 -> rear-left motors (2 motors in parallel)
//       OUT3/OUT4 -> rear-right motors (2 motors in parallel)
//
//   - NEW L298N: 2 FRONT WHEELS
//       OUT1/OUT2 -> front-left motor
//       OUT3/OUT4 -> front-right motor
//
// IMPORTANT:
//   Keep ENA and ENB jumpers installed on both L298N boards.
//   This code uses IN1-IN4 pins only and does not use PWM.
//
// SENSOR:
//   - LEFT ultrasonic performs tree detection.
//   - VL53L0X is used only for tree diameter and height measurement.
//   - Diameter servo = PAN servo.
//   - Height servo = TILT servo.
// ============================================================


// ==================== MOTOR PINS ====================

// OLD L298N = rear 4 wheels
const int REAR_IN1 = 13;   // D13
const int REAR_IN2 = 25;   // D25
const int REAR_IN3 = 26;   // D26
const int REAR_IN4 = 27;   // D27

// NEW L298N = front 2 wheels
const int FRONT_IN1 = 32;  // D32
const int FRONT_IN2 = 33;  // D33
const int FRONT_IN3 = 18;  // D18
const int FRONT_IN4 = 23;  // D23


// ==================== ULTRASONIC PINS ====================

// Front obstacle sensor
const int TRIG_FRONT = 5;   // D5
const int ECHO_FRONT = 34;  // D34 - input only

// LEFT ultrasonic = tree detection
// D4 is used as trigger output.
// D35 is input-only and is used for echo.
const int TRIG_LEFT = 4;    // D4
const int ECHO_LEFT = 35;   // D35 - input only


// ==================== SERVO PINS ====================

// D14 = PAN / DIAMETER servo
// D15 = TILT / HEIGHT servo

const int DIAMETER_SERVO_PIN = 14;  // D14
const int HEIGHT_SERVO_PIN   = 15;  // D15


// ==================== I2C / VL53L0X ====================

const int I2C_SDA = 21;  // D21
const int I2C_SCL = 22;  // D22


// ==================== GPS PINS ====================

// GPS TX -> ESP32 RX2
// GPS RX -> ESP32 TX2

const int GPS_RX = 16;  // RX2
const int GPS_TX = 17;  // TX2


// ==================== WIFI AP ====================

const char* ssid = "ESP32_CAR";
const char* password = "12345678";


// ==================== SERVER ====================

WebServer server(80);


// ==================== SENSORS / MODULES ====================

Servo diameterServo;
Servo heightServo;

Adafruit_VL53L0X lox;
TinyGPSPlus gps;

HardwareSerial GPSSerial(2);


// ==================== SCAN SETTINGS ====================

// Tree detection distance
const float TREE_DETECT_CM = 50.0;

// Front obstacle stopping distance
const float FRONT_STOP_CM = 50.0;

// Height uses the actual TOF center distance, so no fixed
// TOF distance offset is required here.

const unsigned long LEAVE_TREE_TIME_MS = 1000;


// ============================================================
// PAN / DIAMETER SERVO SETTINGS
// ============================================================

const int DIAMETER_SERVO_CENTER = 90;
const int DIAMETER_SERVO_LEFT   = 55;
const int DIAMETER_SERVO_RIGHT  = 125;
const int DIAMETER_SERVO_STEP   = 3; // change by dhruv
const int DIAMETER_SERVO_SETTLE_MS = 160;


// ============================================================
// TILT / HEIGHT SERVO SETTINGS
// ============================================================

const int HEIGHT_SERVO_DEFAULT = 90;
const int HEIGHT_SERVO_START   = 90;
const int HEIGHT_SERVO_END     = 45;
const int HEIGHT_SERVO_STEP    = 3;
const int HEIGHT_SERVO_SETTLE_MS = 220;


// ==================== TOF AVERAGING ====================

const int TOF_SAMPLES_PER_POINT = 6; //changed from 8 to 6
const int TOF_SAMPLE_DELAY_MS = 35;


// ==================== SCAN STATE ====================

enum ScanState {
  SCAN_FORWARD,
  SCAN_MEASURE_DIAMETER,
  SCAN_MEASURE_HEIGHT,
  SCAN_LEAVE_TREE
};

bool scanActive = false;

ScanState scanState = SCAN_FORWARD;

unsigned long leaveTreeUntil = 0;


// ==================== LOG STORAGE ====================

struct TreeRecord {

  float heightCm;
  float diameterCm;

  double latitude;
  double longitude;
};

const int MAX_RECORDS = 200;

TreeRecord records[MAX_RECORDS];

int recordCount = 0;


// ==================== GPS STATE ====================

double lastLat = 0.0;
double lastLng = 0.0;

bool hasGPSFix = false;


// ==================== LATEST MEASUREMENTS ====================

float currentTreeDistanceCm = -1.0;
float currentTreeDiameterCm = -1.0;
float currentTreeHeightCm = -1.0;

// Calculated pan angle at the center of the measured trunk diameter.
int treeDiameterCenterAngle = DIAMETER_SERVO_CENTER;


// ============================================================
// MOTOR CONTROL
// ============================================================

void stopCar() {

  digitalWrite(REAR_IN1, LOW);
  digitalWrite(REAR_IN2, LOW);
  digitalWrite(REAR_IN3, LOW);
  digitalWrite(REAR_IN4, LOW);

  digitalWrite(FRONT_IN1, LOW);
  digitalWrite(FRONT_IN2, LOW);
  digitalWrite(FRONT_IN3, LOW);
  digitalWrite(FRONT_IN4, LOW);
}


void moveForward() {

  // Rear left forward
  digitalWrite(REAR_IN1, LOW);
  digitalWrite(REAR_IN2, HIGH);

  // Rear right forward
  digitalWrite(REAR_IN3, LOW);
  digitalWrite(REAR_IN4, HIGH);

  // Front left forward
  digitalWrite(FRONT_IN1, LOW);
  digitalWrite(FRONT_IN2, HIGH);

  // Front right forward
  digitalWrite(FRONT_IN3, LOW);
  digitalWrite(FRONT_IN4, HIGH);
}


void moveBackward() {

  // Rear left backward
  digitalWrite(REAR_IN1, HIGH);
  digitalWrite(REAR_IN2, LOW);

  // Rear right backward
  digitalWrite(REAR_IN3, HIGH);
  digitalWrite(REAR_IN4, LOW);

  // Front left backward
  digitalWrite(FRONT_IN1, HIGH);
  digitalWrite(FRONT_IN2, LOW);

  // Front right backward
  digitalWrite(FRONT_IN3, HIGH);
  digitalWrite(FRONT_IN4, LOW);
}


void turnLeft() {

  // Left side backward
  digitalWrite(REAR_IN1, HIGH);
  digitalWrite(REAR_IN2, LOW);

  digitalWrite(FRONT_IN1, HIGH);
  digitalWrite(FRONT_IN2, LOW);

  // Right side forward
  digitalWrite(REAR_IN3, LOW);
  digitalWrite(REAR_IN4, HIGH);

  digitalWrite(FRONT_IN3, LOW);
  digitalWrite(FRONT_IN4, HIGH);
}


void turnRight() {

  // Left side forward
  digitalWrite(REAR_IN1, LOW);
  digitalWrite(REAR_IN2, HIGH);

  digitalWrite(FRONT_IN1, LOW);
  digitalWrite(FRONT_IN2, HIGH);

  // Right side backward
  digitalWrite(REAR_IN3, HIGH);
  digitalWrite(REAR_IN4, LOW);

  digitalWrite(FRONT_IN3, HIGH);
  digitalWrite(FRONT_IN4, LOW);
}


// ============================================================
// ULTRASONIC
// ============================================================

float readUltrasonicOnce(
    int trigPin,
    int echoPin
) {

  digitalWrite(trigPin, LOW);

  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);

  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);


  unsigned long duration =
      pulseIn(
          echoPin,
          HIGH,
          30000UL
      );


  if (duration == 0) {
    return -1.0;
  }


  return (
      duration * 0.0343f
  ) / 2.0f;
}


float readUltrasonicAverage(
    int trigPin,
    int echoPin,
    int samples = 5
) {

  float sum = 0.0;

  int valid = 0;


  for (
      int i = 0;
      i < samples;
      i++
  ) {

    float d =
        readUltrasonicOnce(
            trigPin,
            echoPin
        );


    if (d > 0.0) {

      sum += d;

      valid++;
    }


    delay(20);
  }


  if (valid == 0) {
    return -1.0;
  }


  return sum / valid;
}


// ============================================================
// FRONT ULTRASONIC
// ============================================================

float readFrontDistanceCm() {

  return readUltrasonicAverage(
      TRIG_FRONT,
      ECHO_FRONT,
      5
  );
}


// ============================================================
// GPS
// ============================================================

void updateGPS() {

  while (
      GPSSerial.available() > 0
  ) {

    gps.encode(
        GPSSerial.read()
    );
  }


  if (
      gps.location.isUpdated() &&
      gps.location.isValid()
  ) {

    lastLat =
        gps.location.lat();

    lastLng =
        gps.location.lng();

    hasGPSFix = true;
  }
}


// ============================================================
// VL53L0X
// ============================================================

float readTOFOnceCm() {

  VL53L0X_RangingMeasurementData_t measure;


  lox.rangingTest(
      &measure,
      false
  );


  // RangeStatus 4 = out of range
  if (
      measure.RangeStatus != 4
  ) {

    return (
        measure.RangeMilliMeter
    ) / 10.0f;
  }


  return -1.0;
}


// ============================================================
// IMPORTANT:
// This is the correct TOF averaging function.
// All TOF averaging calls below use this exact name:
//     readTOFAverageCm()
// ============================================================

float readTOFAverageCm(
    int samples = 8
) {

  float sum = 0.0;

  int valid = 0;


  for (
      int i = 0;
      i < samples;
      i++
  ) {

    float d =
        readTOFOnceCm();


    if (d > 0.0) {

      sum += d;

      valid++;
    }


    delay(
        TOF_SAMPLE_DELAY_MS
    );


    server.handleClient();

    updateGPS();


    if (!scanActive) {

      return -1.0;
    }
  }


  if (valid == 0) {

    return -1.0;
  }


  return sum / valid;
}


// ============================================================
// TREE DETECTION USING LEFT ULTRASONIC
// ============================================================

float readTreeDetectionDistanceCm() {

  return readUltrasonicAverage(
      TRIG_LEFT,
      ECHO_LEFT,
      5
  );
}


// ============================================================
// DATA STORAGE
// ============================================================

void clearTreeRecords() {

  recordCount = 0;


  memset(
      records,
      0,
      sizeof(records)
  );


  currentTreeDistanceCm = -1.0;

  currentTreeDiameterCm = -1.0;

  currentTreeHeightCm = -1.0;


  Serial.println(
      "All stored tree data cleared."
  );
}


void saveTreeRecord(
    float heightCm,
    float diameterCm,
    double lat,
    double lng
) {

  if (
      recordCount >= MAX_RECORDS
  ) {

    Serial.println(
        "Maximum tree record capacity reached."
    );

    return;
  }


  records[recordCount].heightCm =
      heightCm;


  records[recordCount].diameterCm =
      diameterCm;


  records[recordCount].latitude =
      lat;


  records[recordCount].longitude =
      lng;


  recordCount++;
}


// ============================================================
// TREE DIAMETER ESTIMATION
// ============================================================

float measureTreeDiameterCm(
    float treeDistanceCm
) {

  // Keep tilt level while scanning trunk width.
  heightServo.write(
      HEIGHT_SERVO_DEFAULT
  );


  delay(250);


  // Start pan at center.
  diameterServo.write(
      DIAMETER_SERVO_CENTER
  );


  delay(250);


  // Store the actual TOF distance at the first and last
  // detected trunk edge.
  float firstHitDistance = -1.0f;
  float lastHitDistance  = -1.0f;

  int firstHitAngle = -1;
  int lastHitAngle  = -1;


  // The left ultrasonic is only the tree detector.
  // The TOF scan measures the trunk geometry.
  float detectionThreshold =
      treeDistanceCm + 20.0f;


  // ----------------------------------------------------------
  // PAN SWEEP
  // ----------------------------------------------------------

  for (
      int angle = DIAMETER_SERVO_LEFT;
      angle <= DIAMETER_SERVO_RIGHT;
      angle += DIAMETER_SERVO_STEP
  ) {

    if (!scanActive) {

      return -1.0f;
    }


    diameterServo.write(
        angle
    );


    delay(
        DIAMETER_SERVO_SETTLE_MS
    );


    server.handleClient();

    updateGPS();


    float d =
        readTOFAverageCm(
            TOF_SAMPLES_PER_POINT
        );


    // Accept TOF points close to the distance reported by
    // the left ultrasonic tree detector.
    if (
        d > 0.0f &&
        d <= detectionThreshold
    ) {

      if (
          firstHitAngle == -1
      ) {

        firstHitAngle =
            angle;

        firstHitDistance =
            d;
      }


      lastHitAngle =
          angle;

      lastHitDistance =
          d;
    }
  }


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
      firstHitAngle == -1 ||
      lastHitAngle == -1 ||
      firstHitDistance <= 0.0f ||
      lastHitDistance <= 0.0f ||
      lastHitAngle <= firstHitAngle
  ) {

    Serial.println(
        "Invalid diameter geometry."
    );

    return -1.0f;
  }


  // ----------------------------------------------------------
  // LAW OF COSINES
  //
  // W^2 = D1^2 + D2^2 - 2*D1*D2*cos(theta)
  // ----------------------------------------------------------

  float angleDifferenceDeg =
      fabs(
          (float)(
              lastHitAngle -
              firstHitAngle
          )
      );


  float angleDifferenceRad =
      radians(
          angleDifferenceDeg
      );


  float diameterSquared =
      (
          firstHitDistance *
          firstHitDistance
      ) +
      (
          lastHitDistance *
          lastHitDistance
      ) -
      (
          2.0f *
          firstHitDistance *
          lastHitDistance *
          cos(
              angleDifferenceRad
          )
      );


  if (
      diameterSquared < 0.0f ||
      !isfinite(diameterSquared)
  ) {

    Serial.println(
        "Invalid diameter geometry."
    );

    return -1.0f;
  }


  float diameter =
      sqrt(
          diameterSquared
      );


  // ----------------------------------------------------------
  // SANITY CHECK
  // ----------------------------------------------------------

  if (
      !isfinite(diameter) ||
      diameter <= 0.0f
  ) {

    Serial.println(
        "Invalid diameter result."
    );

    return -1.0f;
  }


  // Center of the measured trunk is halfway between
  // the first and last detected trunk-edge angles.
  treeDiameterCenterAngle =
      (firstHitAngle + lastHitAngle) / 2;


  diameterServo.write(
      treeDiameterCenterAngle
  );

  delay(200);


  Serial.print(
      "Tree center servo angle: "
  );

  Serial.println(
      treeDiameterCenterAngle
  );


  Serial.print(
      "Left edge distance: "
  );

  Serial.print(
      firstHitDistance
  );

  Serial.println(" cm");


  Serial.print(
      "Right edge distance: "
  );

  Serial.print(
      lastHitDistance
  );

  Serial.println(" cm");


  Serial.print(
      "Angular span: "
  );

  Serial.print(
      angleDifferenceDeg
  );

  Serial.println(" degrees");


  Serial.print(
      "Estimated trunk width: "
  );

  Serial.print(
      diameter
  );

  Serial.println(" cm");


  return diameter;
}


// ============================================================
// TREE HEIGHT ESTIMATION
// ============================================================

float measureTreeHeightCm(
    float horizontalDistanceCm
) {

  float maxHeight = -1.0;

  // Height of the VL53L0X above the ground.
  // Change this value if the actual sensor mounting height is different.
  float sensorMountHeightCm = 20.0;


  // Keep PAN / diameter servo at the measured tree center
  // throughout the height measurement.
  diameterServo.write(
      treeDiameterCenterAngle
  );

  delay(200);


  // ==========================================================
  // TILT SWEEP
  // 90 -> 40 degrees
  // Approximately 3 degrees per reading
  // ==========================================================

  for (
      int angle = HEIGHT_SERVO_START;
      angle >= HEIGHT_SERVO_END;
      angle -= HEIGHT_SERVO_STEP
  ) {

    if (!scanActive) {
      return -1.0;
    }


    heightServo.write(
        angle
    );

    delay(
        HEIGHT_SERVO_SETTLE_MS
    );


    float d =
        readTOFAverageCm(
            TOF_SAMPLES_PER_POINT
        );


    if (d > 0.0) {

      // Servo angle is measured from the horizontal.
      // Vertical height component = D * sin(theta).
      float thetaRad =
          radians(
              (float)angle
          );


      float verticalHeight =
          d * sin(thetaRad);


      verticalHeight +=
          sensorMountHeightCm;


      if (
          verticalHeight > maxHeight
      ) {

        maxHeight =
            verticalHeight;
      }
    }


    server.handleClient();

    updateGPS();
  }


  // Return height servo to default position.
  heightServo.write(
      HEIGHT_SERVO_DEFAULT
  );

  delay(200);


  // Only after the complete height scan, return PAN to its
  // original/default position.
  diameterServo.write(
      DIAMETER_SERVO_CENTER
  );

  delay(200);


  if (
      maxHeight <= 0.0 ||
      !isfinite(maxHeight)
  ) {

    return -1.0;
  }


  return maxHeight;
}

// ============================================================
// AUTOMATIC SCANNING
// ============================================================

void processScanMode() {

  if (!scanActive) {

    return;
  }


  // ==========================================================
  // FRONT OBSTACLE DETECTION
  // ==========================================================

  float frontDistance =
      readFrontDistanceCm();


  if (
      frontDistance > 0.0 &&
      frontDistance < FRONT_STOP_CM
  ) {

    stopCar();

    return;
  }


  // ==========================================================
  // SCAN STATE MACHINE
  // ==========================================================

  switch (
      scanState
  ) {


    // ========================================================
    // MOVE FORWARD AND LOOK FOR TREE
    // ========================================================

    case SCAN_FORWARD: {

      float treeDistance =
          readTreeDetectionDistanceCm();


      if (
          treeDistance > 0.0 &&
          treeDistance <= TREE_DETECT_CM
      ) {

        stopCar();


        currentTreeDistanceCm =
            treeDistance;


        Serial.println(
            "Tree detected using LEFT ultrasonic."
        );


        Serial.print(
            "Tree distance: "
        );


        Serial.print(
            currentTreeDistanceCm
        );


        Serial.println(
            " cm"
        );


        scanState =
            SCAN_MEASURE_DIAMETER;


      } else {

        moveForward();
      }


      break;
    }


    // ========================================================
    // MEASURE DIAMETER
    // ========================================================

    case SCAN_MEASURE_DIAMETER: {

      stopCar();


      if (
          currentTreeDistanceCm > 0.0
      ) {

        currentTreeDiameterCm =
            measureTreeDiameterCm(
                currentTreeDistanceCm
            );

      } else {

        currentTreeDiameterCm =
            -1.0;
      }


      Serial.print(
          "Measured trunk diameter: "
      );


      Serial.print(
          currentTreeDiameterCm
      );


      Serial.println(
          " cm"
      );


      scanState =
          SCAN_MEASURE_HEIGHT;


      break;
    }


    // ========================================================
    // MEASURE HEIGHT
    // ========================================================

    case SCAN_MEASURE_HEIGHT: {

      stopCar();


      // The left ultrasonic only detects the tree.
      // Get the actual horizontal distance with the TOF before
      // measuring height.
      heightServo.write(
          HEIGHT_SERVO_DEFAULT
      );

      delay(250);

      float horizontalDistanceToTree =
          readTOFAverageCm(
              TOF_SAMPLES_PER_POINT
          );

      if (
          horizontalDistanceToTree <= 0.0f
      ) {

        horizontalDistanceToTree =
            currentTreeDistanceCm;
      }

      currentTreeHeightCm =
          measureTreeHeightCm(
              horizontalDistanceToTree
          );


      // ======================================================
      // SAVE TREE DATA
      // ======================================================

      saveTreeRecord(
          currentTreeHeightCm,
          currentTreeDiameterCm,
          hasGPSFix ? lastLat : 0.0,
          hasGPSFix ? lastLng : 0.0
      );


      // ======================================================
      // SERIAL OUTPUT
      // ======================================================

      Serial.println(
          "Tree scanned:"
      );


      Serial.print(
          "  Distance: "
      );

      Serial.println(
          currentTreeDistanceCm
      );


      Serial.print(
          "  Diameter: "
      );

      Serial.println(
          currentTreeDiameterCm
      );


      Serial.print(
          "  Height: "
      );

      Serial.println(
          currentTreeHeightCm
      );


      Serial.print(
          "  Lat: "
      );

      Serial.println(
          hasGPSFix ? lastLat : 0.0,
          6
      );


      Serial.print(
          "  Lng: "
      );

      Serial.println(
          hasGPSFix ? lastLng : 0.0,
          6
      );


      // ======================================================
      // LEAVE TREE
      // ======================================================

      leaveTreeUntil =
          millis() +
          LEAVE_TREE_TIME_MS;


      scanState =
          SCAN_LEAVE_TREE;


      break;
    }


    // ========================================================
    // MOVE AWAY FROM TREE
    // ========================================================

    case SCAN_LEAVE_TREE: {

      moveForward();


      if (
          millis() >= leaveTreeUntil
      ) {

        scanState =
            SCAN_FORWARD;
      }


      break;
    }
  }
}


// ============================================================
// WEB INTERFACE
// ============================================================

void handleMode() {

  server.send(
      200,
      "text/plain",
      scanActive ? "AUTO" : "MANUAL"
  );
}


void handleRoot() {

  String html = R"rawliteral(
<!DOCTYPE html>
<html>

<head>

  <title>ESP32 6-Wheel Rover</title>

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <style>

    body {
      text-align: center;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
    }

    h2 {
      margin-top: 10px;
    }

    .panel {
      max-width: 450px;
      margin: auto;
      background: white;
      padding: 20px;
      border-radius: 18px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    }

    .row {
      margin: 10px 0;
    }

    button {
      width: 145px;
      height: 54px;
      font-size: 16px;
      margin: 6px;
      border: none;
      border-radius: 12px;
      background: #222;
      color: #fff;
    }

    button:active {
      transform: scale(0.98);
    }

    button:disabled {
      opacity: 0.5;
      transform: none;
    }

    .scan {
      background: #1565c0;
    }

    .stopscan {
      background: #c62828;
    }

    .download {
      background: #2e7d32;
    }

    .clear {
      background: #ef6c00;
    }

    .manual {
      background: #37474f;
    }

    .small {
      font-size: 13px;
      color: #555;
      line-height: 1.5;
      margin-top: 8px;
    }

    .drive {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
    }

    .midrow {
      display: flex;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }

  </style>


  <script>

    let scanning = false;


    function sendCommand(path) {

      fetch(path).catch(console.error);
    }


    function setManualState(enabled) {

      const ids = [
        "forward",
        "backward",
        "left",
        "right"
      ];


      ids.forEach(id => {

        const b =
          document.getElementById(id);


        if (b) {
          b.disabled = !enabled;
        }

      });
    }


    async function refreshMode() {

      try {

        const res =
          await fetch("/mode");

        const mode =
          (await res.text()).trim();

        const isAuto =
          (mode === "AUTO");

        scanning = isAuto;

        setManualState(!isAuto);

      } catch (e) {

        console.log(e);
      }
    }


    function setupHoldButton(id, command) {

      const btn =
        document.getElementById(id);


      const press = (e) => {

        e.preventDefault();

        if (!scanning) {
          sendCommand(command);
        }
      };


      const release = (e) => {

        e.preventDefault();

        if (!scanning) {
          sendCommand("/S");
        }
      };


      btn.addEventListener(
        "mousedown",
        press
      );


      btn.addEventListener(
        "mouseup",
        release
      );


      btn.addEventListener(
        "mouseleave",
        release
      );


      btn.addEventListener(
        "touchstart",
        press,
        { passive: false }
      );


      btn.addEventListener(
        "touchend",
        release,
        { passive: false }
      );


      btn.addEventListener(
        "touchcancel",
        release,
        { passive: false }
      );
    }


    function startScan() {

      scanning = true;

      setManualState(false);

      sendCommand("/startscan");
    }


    function stopScan() {

      scanning = false;

      setManualState(true);

      sendCommand("/stopscan");
    }


    function clearData() {

      sendCommand("/clearData");
    }


    function downloadData() {

      window.location = "/download";
    }


    window.onload = () => {

      setupHoldButton(
        "forward",
        "/F"
      );


      setupHoldButton(
        "backward",
        "/B"
      );


      setupHoldButton(
        "left",
        "/L"
      );


      setupHoldButton(
        "right",
        "/R"
      );


      setManualState(true);

      refreshMode();


      setInterval(
        refreshMode,
        1500
      );
    };

  </script>

</head>


<body>

  <div class="panel">

    <h2>ESP32 6-Wheel Rover</h2>


    <div class="row">

      <button
        class="scan"
        onclick="startScan()"
      >
        Start Scan
      </button>


      <button
        class="stopscan"
        onclick="stopScan()"
      >
        Stop Scan
      </button>

    </div>


    <div class="row">

      <button
        class="download"
        onclick="downloadData()"
      >
        Download Data
      </button>


      <button
        class="clear"
        onclick="clearData()"
      >
        Clear Data
      </button>

    </div>


    <div class="drive">

      <button
        id="forward"
        class="manual"
      >
        Forward
      </button>


      <div class="midrow">

        <button
          id="left"
          class="manual"
        >
          Left
        </button>


        <button
          id="right"
          class="manual"
        >
          Right
        </button>

      </div>


      <button
        id="backward"
        class="manual"
      >
        Backward
      </button>

    </div>


    <div class="small">

      Manual mode works when scan mode is off.<br>

      Scan mode moves forward, detects a tree using
      the VL53L0X TOF, measures diameter and height,
      stores GPS data, and continues.

    </div>

  </div>

</body>

</html>

  )rawliteral";


  server.send(
      200,
      "text/html",
      html
  );
}


// ============================================================
// WEB HANDLERS
// ============================================================

void handleStartScan() {

  scanActive = true;

  scanState =
      SCAN_FORWARD;

  leaveTreeUntil = 0;

  stopCar();


  diameterServo.write(
      DIAMETER_SERVO_CENTER
  );


  heightServo.write(
      HEIGHT_SERVO_DEFAULT
  );


  server.send(
      200,
      "text/plain",
      "Scan started"
  );
}


void handleStopScan() {

  scanActive = false;

  stopCar();


  diameterServo.write(
      DIAMETER_SERVO_CENTER
  );


  heightServo.write(
      HEIGHT_SERVO_DEFAULT
  );


  server.send(
      200,
      "text/plain",
      "Scan stopped"
  );
}


void handleDownload() {

  String csv;


  csv.reserve(
      64 + (recordCount * 80)
  );


  csv +=
      "Tree Height (cm),"
      "Trunk Diameter (cm),"
      "Latitude,"
      "Longitude\n";


  for (
      int i = 0;
      i < recordCount;
      i++
  ) {

    csv +=
        String(
            records[i].heightCm,
            2
        );


    csv += ",";


    csv +=
        String(
            records[i].diameterCm,
            2
        );


    csv += ",";


    csv +=
        String(
            records[i].latitude,
            6
        );


    csv += ",";


    csv +=
        String(
            records[i].longitude,
            6
        );


    csv += "\n";
  }


  server.sendHeader(
      "Content-Disposition",
      "attachment; filename=tree_data.csv"
  );


  server.send(
      200,
      "text/csv",
      csv
  );
}


void handleClearData() {

  clearTreeRecords();


  server.send(
      200,
      "text/plain",
      "Data cleared"
  );
}


// ============================================================
// MANUAL CONTROL
// ============================================================

void handleForward() {

  if (scanActive) {

    server.send(
        403,
        "text/plain",
        "Manual control disabled during scan"
    );

    return;
  }


  float frontDistance =
      readFrontDistanceCm();


  if (
      frontDistance > 0.0 &&
      frontDistance < FRONT_STOP_CM
  ) {

    stopCar();


    server.send(
        200,
        "text/plain",
        "Obstacle ahead"
    );


    return;
  }


  moveForward();


  server.send(
      200,
      "text/plain",
      "Forward"
  );
}


void handleBackward() {

  if (scanActive) {

    server.send(
        403,
        "text/plain",
        "Manual control disabled during scan"
    );

    return;
  }


  moveBackward();


  server.send(
      200,
      "text/plain",
      "Backward"
  );
}


void handleLeft() {

  if (scanActive) {

    server.send(
        403,
        "text/plain",
        "Manual control disabled during scan"
    );

    return;
  }


  turnLeft();


  server.send(
      200,
      "text/plain",
      "Left"
  );
}


void handleRight() {

  if (scanActive) {

    server.send(
        403,
        "text/plain",
        "Manual control disabled during scan"
    );

    return;
  }


  turnRight();


  server.send(
      200,
      "text/plain",
      "Right"
  );
}


void handleStopCar() {

  stopCar();


  server.send(
      200,
      "text/plain",
      "Stop"
  );
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);


  // ==========================================================
  // MOTOR PINS
  // ==========================================================

  pinMode(REAR_IN1, OUTPUT);
  pinMode(REAR_IN2, OUTPUT);
  pinMode(REAR_IN3, OUTPUT);
  pinMode(REAR_IN4, OUTPUT);

  pinMode(FRONT_IN1, OUTPUT);
  pinMode(FRONT_IN2, OUTPUT);
  pinMode(FRONT_IN3, OUTPUT);
  pinMode(FRONT_IN4, OUTPUT);


  stopCar();


  // ==========================================================
  // FRONT ULTRASONIC
  // ==========================================================

  pinMode(
      TRIG_FRONT,
      OUTPUT
  );


  pinMode(
      ECHO_FRONT,
      INPUT
  );


  // ==========================================================
  // LEFT TREE-DETECTION ULTRASONIC
  // ==========================================================

  pinMode(
      TRIG_LEFT,
      OUTPUT
  );

  pinMode(
      ECHO_LEFT,
      INPUT
  );

  digitalWrite(
      TRIG_LEFT,
      LOW
  );


  // ==========================================================
  // SERVOS
  // ==========================================================

  diameterServo.setPeriodHertz(50);

  heightServo.setPeriodHertz(50);


  diameterServo.attach(
      DIAMETER_SERVO_PIN,
      500,
      2400
  );


  heightServo.attach(
      HEIGHT_SERVO_PIN,
      500,
      2400
  );


  // PAN starts center
  diameterServo.write(
      DIAMETER_SERVO_CENTER
  );


  // TILT starts default
  heightServo.write(
      HEIGHT_SERVO_DEFAULT
  );


  // ==========================================================
  // I2C + VL53L0X
  // ==========================================================

  Wire.begin(
      I2C_SDA,
      I2C_SCL
  );


  if (!lox.begin()) {

    Serial.println(
        "VL53L0X not detected. Check wiring."
    );

  } else {

    Serial.println(
        "VL53L0X ready."
    );


    Serial.println(
        "VL53L0X is being used for tree detection, "
        "diameter and height."
    );
  }


  // ==========================================================
  // GPS
  // ==========================================================

  GPSSerial.begin(
      9600,
      SERIAL_8N1,
      GPS_RX,
      GPS_TX
  );


  // ==========================================================
  // WIFI
  // ==========================================================

  WiFi.softAP(
      ssid,
      password
  );


  Serial.println(
      "WiFi AP Started"
  );


  Serial.print(
      "IP Address: "
  );


  Serial.println(
      WiFi.softAPIP()
  );


  // ==========================================================
  // WEB ROUTES
  // ==========================================================

  server.on(
      "/",
      handleRoot
  );


  server.on(
      "/mode",
      handleMode
  );


  server.on(
      "/F",
      handleForward
  );


  server.on(
      "/B",
      handleBackward
  );


  server.on(
      "/L",
      handleLeft
  );


  server.on(
      "/R",
      handleRight
  );


  server.on(
      "/S",
      handleStopCar
  );


  server.on(
      "/startscan",
      handleStartScan
  );


  server.on(
      "/stopscan",
      handleStopScan
  );


  server.on(
      "/download",
      handleDownload
  );


  server.on(
      "/clearData",
      handleClearData
  );


  server.begin();


  Serial.println(
      "Web server started"
  );
}


// ============================================================
// LOOP
// ============================================================

void loop() {

  server.handleClient();

  updateGPS();


  if (scanActive) {

    processScanMode();
  }
}