# Land Cover Classification & Change Detection in the VCRP Region (2000–2025)

## Overview

This project examines land cover change across the **VCRP (Rwanda VCRP Level 3 Catchment)** region across four epochs—**2000, 2010, 2020, and 2025**—using satellite imagery, spectral indices, and **Google Earth Engine (GEE)**. Rather than looking at a single point in time, each epoch was modeled so we could see how wetlands, forests, croplands, settlements, grasslands, and other land covers shifted over 25 years.

In practice, the workflow balances automation with period-specific care: most of the GEE processing structure can be reused across years by adjusting the **date range** and sensor/asset inputs, *except* for the **training points**, which were gathered separately on **Google Earth Pro** for each target timeframe so ground samples reflect the actual landscape of that period.

---

## Datasets Used

* **Study Area Boundary:** Dissolved geometry from the VCRP catchment layer (`projects/ee-oloofrank/assets/Rwanda_VCRP/VCRP_Level3_Catchment`).
* **Optical Satellite Imagery:**
  * **2000 & 2010 (Landsat 7, 30 m resolution):** Including the `L7_2000` asset (`projects/sixth-shield-437405-f4/assets/L7_2000`) and Landsat 7 data at 30 m spatial resolution.
  * **2020 & 2025 (Sentinel-2, 10 m resolution):** High-resolution optical imagery at 10 m spatial resolution.
* **Synthetic Aperture Radar (SAR) Data:** **Sentinel-1** SAR data used to support vegetation characterization alongside optical inputs.
* **Training & Reference Data:**
  * VCRP reference feature collections (`water`, `forest`, `cropland`, `built_up`, `grassland`, `wetland`, `bareland` under `projects/ee-oloofrank/assets/Rwanda_VCRP/`).
  * Epoch-specific training samples digitized separately on **Google Earth Pro** and merged into the GEE training dataset for each year.

---

## Methodology

1. **Multi-Epoch Change Detection (2000, 2010, 2020, 2025):** Separate land cover classifications were run for **2000, 2010, 2020, and 2025** to evaluate spatial and temporal dynamics across the 25-year period.
2. **Reusable Script with Date & Sample Customization:** Core preprocessing, index computation, classification, and smoothing steps were designed to be reused across epochs by updating the **date range** (and matching imagery/parameters), while training points were collected separately on **Google Earth Pro** for each year.
3. **Spectral & SAR Feature Engineering:**
   * **Shared Indices (Landsat 7 & Sentinel-2):**
     * **NDMI** (Normalized Difference Moisture Index): Landsat 7 Bands 4 & 5; Sentinel-2 Bands 8 & 11.
     * **NDBI** (Normalized Difference Built-up Index): Landsat 7 Bands 5 & 4; Sentinel-2 Bands 11 & 8.
     * **NDWI** (Normalized Difference Water Index): Landsat 7 Bands 2 & 4; Sentinel-2 Bands 3 & 8.
     * **MNDWI** (Modified NDWI): Landsat 7 Bands 2 & 5; Sentinel-2 Bands 3 & 11.
     * **BSI** (Bare Soil Index): Landsat 7 Bands 5, 3, 4, and 1; Sentinel-2 Bands 11, 4, 8, and 2.
   * **Additional Vegetation & SAR Features:** Sentinel-2 vegetation indices including **EVI** (Enhanced Vegetation Index) and **MSAVI** (Modified Soil Adjusted Vegetation Index), plus Sentinel-1 SAR-derived **RVI** (Radar Vegetation Index) and **IRECI** (Inverted Red-Edge Chlorophyll Index).
4. **Classification & Post-Processing:** A **Random Forest** classifier (`ee.Classifier.smileRandomForest(500)` in the GEE script, using a 70/30 train/test split) was trained on merged class samples, followed by post-classification cleanup (3×3 `focal_mode` smoothing in GEE) and accuracy validation.

---

## Workflow

1. **Digitize Training Points in Google Earth Pro:** Inspect historical imagery for the target year (2000, 2010, 2020, or 2025) in **Google Earth Pro**, collect sample points across the six classes (`Wetlands`, `Forest`, `Cropland`, `Settlements`, `Grassland`, `Other`), and import them into GEE.
2. **Configure Time Window & Imagery:** Set the target date range and load the appropriate epoch imagery (Landsat 7 at 30 m for 2000 and 2010; Sentinel-2 at 10 m—plus Sentinel-1 / vegetation indices where used—for 2020 and 2025), clipped to the dissolved VCRP catchment ROI.
3. **Generate Indices & Merge Training Samples:** Compute `NDMI`, `NDBI`, `NDWI`, `MNDWI`, `BSI`, and supplementary vegetation/SAR features, and merge digitized samples with reference data.
4. **Train, Validate & Clean Classification:** Split samples for training and testing, train the Random Forest classifier, evaluate accuracy metrics, apply focal mode smoothing to reduce pixel noise, and export the classified map.
5. **Compare Across Epochs:** Tabulate class areas (km²) and compare maps across **2000, 2010, 2020, and 2025** to interpret land cover transitions.

---

## Results

### Model Overall Accuracy by Year

| Year | Overall Accuracy (%) |
| :--- | :--- |
| **2000** | 71.2% |
| **2010** | 86.7% |
| **2020** | 85.1% |
| **2025** | 79.5% |

### Land Cover Area Coverage (km²) Across Epochs

| Year | Wetlands | Forest | Cropland | Settlements | Grassland | Others |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2000** | 105.15174 | 329.426788 | 2527.44114 | 22.34651123 | 156.972528 | 47.8000430 |
| **2010** | 184.41096 | 389.375328 | 1985.13969 | 92.99774631 | 319.412516 | 223.488232 |
| **2020** | 97.677578 | 705.098124 | 1929.76312 | 106.5130059 | 267.884761 | 87.8878916 |
| **2025** | 97.761492 | 539.285616 | 2245.31949 | 79.8705 | 222.359472 | 10.542906 |

### Key Takeaways & Editing Notes

* **Landscape Dynamics (2000–2025):** Cropland remains the dominant land cover across all four years (ranging from `1,929.76 km²` in 2020 to `2,527.44 km²` in 2000), while Forest expanded from `329.43 km²` in 2000 to `705.10 km²` in 2020 before sitting at `539.29 km²` in 2025, and Settlements rose from `22.35 km²` in 2000 to `106.51 km²` in 2020 (`79.87 km²` in 2025). *(Add your own interpretation of why these shifts occurred.)*
* **Accuracy Context:** Overall accuracy peaked in **2010 (86.7%)** and **2020 (85.1%)**, with lower accuracy in **2000 (71.2%)** and **2025 (79.5%)**—a useful reminder to double-check historical reference samples, cloud/sensor differences, and class boundaries when refining future runs.
