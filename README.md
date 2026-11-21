# Multi-Temporal Land Cover Classification & Change Detection in Rwanda (2000–2025)

## Overview

This project maps land use and land cover (LULC) across the **Rwanda VCRP Level 3 Catchment** study area and tracks how the landscape has changed over a 25-year window using **Google Earth Engine (GEE)**. Rather than relying on a single snapshot, separate analyses were conducted for **2000, 2010, 2020, and 2025** to support multi-epoch change detection and see where land cover shifted over time.

Building this across four epochs showed where automation helps and where human eyes are still essential. Most of the script is **reusable across years simply by adjusting the date range** (along with matching image assets/collections and parameters), *except* for the **training points**, which were collected separately on **Google Earth Pro** for each target period so ground reference samples match the real landscape of that timeframe.

### Land Cover Classes

| Class ID | Class Name | Map Color | Notes in Script |
| :--- | :--- | :--- | :--- |
| **1** | **Wetlands** | `#4682B4` (Steel Blue) | Merges `water_1`, `wetland_1`, and `water` features set to class `1` |
| **2** | **Forest** | `#006400` (Dark Green) | Merges VCRP `forest` asset with `tree` samples |
| **3** | **Cropland** | `#FFD700` (Gold) | Merges VCRP `cropland` asset with `crop` samples |
| **4** | **Settlements** | `#FF0000` (Red) | Merges VCRP `built_up` asset with `built` samples |
| **5** | **Grassland** | `#d58cd6` (Light Purple/Magenta) | Merges VCRP `grassland` asset with `grass` samples |
| **6** | **Other** | `#808080` (Gray) | Merges VCRP `bareland` asset with `others` (and `wetland_1` prior to class-1 merge) |

---

## Datasets Used

* **Region of Interest (ROI):** Dissolved geometry from `projects/ee-oloofrank/assets/Rwanda_VCRP/VCRP_Level3_Catchment` (`Rwanda ROI`).
* **Satellite Imagery:**
  * **2000 Baseline:** Pre-processed image asset `projects/sixth-shield-437405-f4/assets/L7_2000` (`image`), clipped to the ROI using bands `b1` through `b6` (with time window `1999-01-01` to `2002-12-31` defined in the script).
  * **2010, 2020 & 2025 Epochs:** **[Specify the exact GEE assets or `ee.ImageCollection` sources—such as Landsat Collection 2 or Sentinel-2—and date ranges used for 2010, 2020, and 2025.]**
* **Reference & Training Data:**
  * Shared/baseline VCRP feature collections under `projects/ee-oloofrank/assets/Rwanda_VCRP/` (`water`, `forest`, `cropland`, `built_up`, `grassland`, `wetland`, `bareland`).
  * Period-specific training points (`water`, `tree`, `crop`, `built`, `grass`, `others`) digitized/gathered separately on **Google Earth Pro** and imported into GEE.

---

## Methodology

1. **Multi-Year Change Detection Design (2000, 2010, 2020, 2025):** Individual classification runs are carried out for **2000, 2010, 2020, and 2025** so land cover transitions can be compared across intervals (e.g., 2000–2010, 2010–2020, 2020–2025, and net 2000–2025 change).
2. **Reusable Pipeline & Date Adjustments:** The core GEE workflow—ROI clipping, band/index stacking, sampling, train/test splitting, Random Forest training, accuracy reporting, and smoothing—is structured to be reused across epochs by updating the **date range** (and corresponding image/asset inputs).
3. **Google Earth Pro Training Samples:** Training points were prepared separately on **Google Earth Pro** per epoch rather than reusing one static set of points across 25 years, helping keep class labels aligned with historical ground conditions.
4. **Spectral Feature Engineering:** Alongside the selected image bands (`b1`–`b6`), the script computes four normalized/spectral indices:
   * **NDMI** (Normalized Difference Moisture Index): `(b4 - b5) / (b4 + b5)`
   * **MNDWI** (Modified Normalized Difference Water Index): `(b2 - b5) / (b2 + b5)`
   * **NDBI** (Normalized Difference Built-up Index): `(b5 - b4) / (b5 + b4)`
   * **BSI** (Bare Soil Index): `((b5 + b3) - (b4 + b1)) / ((b5 + b3) + (b4 + b1))`
5. **Random Forest Classification & Accuracy Assessment:** Samples are split **70% for training** and **30% for testing** (`randomColumn()`), and an **`ee.Classifier.smileRandomForest(500)`** model (500 trees) is trained on the combined bands and indices. Model performance is evaluated on the test set using a confusion matrix, overall accuracy, Kappa coefficient, user's (consumer's) accuracy, and producer's accuracy.
6. **Post-Classification Smoothing:** A **3×3 square kernel** (`ee.Kernel.square({radius: 1})`) with a focal mode filter (`focal_mode`) is applied to reduce isolated pixel noise ("salt-and-pepper" speckle) before final map export.

---

## Workflow

1. **Collect Training Points in Google Earth Pro:** Interpret historical imagery for the target year (2000, 2010, 2020, or 2025) in **Google Earth Pro**, digitize sample points for each land cover class, and bring them into the GEE script.
2. **Set Date Range, ROI & Imagery:** Update `start_date` and `end_date` for the target epoch, load the corresponding image/asset for that period, and dissolve `VCRP_Level3_Catchment` to define `roi`.
3. **Merge Labels & Compute Indices:** Assign class IDs (`1`–`6`), merge VCRP and Google Earth Pro collections into `gdp_data`, clip the imagery to `roi`, inspect band min/max stats, and append `NDMI`, `MNDWI`, `NDBI`, and `BSI`.
4. **Train & Evaluate Classifier:** Sample `indices` at `training_data`, apply a `70/30` train/test split, train `smileRandomForest(500)`, and print accuracy metrics (`confusionMatrix`, overall accuracy, Kappa, user/producer accuracies).
5. **Smooth & Export for Change Detection:** Apply the 3×3 `focal_mode` filter to produce the cleaned map, export results to Google Drive (`ROY_MAX_rwanda`), and compare classified maps across **2000, 2010, 2020, and 2025** to analyze change.

---

## Results

> *Fill in your exact numbers from the GEE Console and exported 2000, 2010, 2020, and 2025 outputs below.*

* **Accuracy Metrics (2000 & Other Epochs):**
  * **Overall Accuracy:** **[e.g., XX.X%]**
  * **Kappa Coefficient:** **[e.g., 0.XX]**
  * **Class-Level Notes (User / Producer Accuracy):** **[Note which classes—such as Forest, Cropland, Wetlands, or Settlements—classified cleanly and where any confusion occurred.]**
* **Multi-Year Change Detection (2000, 2010, 2020, 2025):**
  * **2000–2010:** **[Summarize key changes]**
  * **2010–2020:** **[Summarize key changes]**
  * **2020–2025:** **[Summarize key changes]**
  * **Overall 2000–2025 Trend:** **[Summarize net expansion/contraction across the 6 classes]**
* **Visual & Smoothing Observations:** Comparing the raw `Land Cover Classification` layer against the `Cleaned Land Cover Classification` layer (`focal_mode`, 3×3 kernel) shows reduced isolated pixel noise and cleaner contiguous land cover patches.

---

## Notes

* **Date Range & Year Swaps:** Update `start_date`, `end_date`, the year's image/asset (`image`), and export file names/prefixes (e.g., `2000` $\rightarrow$ `2010`, `2020`, `2025`) while keeping the shared processing structure intact.
* **Google Earth Pro Training Points:** Replace or update the per-year training point collections (`water`, `tree`, `crop`, `built`, `grass`, `others`) for each epoch so samples reflect that year's ground conditions.
* **Export & Scale Settings:** Double-check that `Export.image.toDrive(exportParams)` is called when exporting `cleaned` (`exportParams` is defined at the bottom of the script), and verify that your `scale` parameter (currently `10` in sampling/first export and `30` in `exportParams` / `reduceRegion`) matches the spatial resolution of the imagery used for each year.
* **Class Merge Order:** Note that in the current snippet, `wetland_1` is initially given class `6` and later merged into `wetland` (class `1`)—verify that all final class assignments match your intended legend before running a new year.
