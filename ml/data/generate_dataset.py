"""
CycloneGuard AI - Synthetic Baseline Dataset Generator (Phase 3)

NOTE: Explicitly labeled as DEMO BASELINE TRAINING DATA.
Generates synthetic data calibrated with hydrodynamic and meteorological
cyclone impact principles for the Bay of Bengal / Odisha coastal corridor.

Features:
- wind_speed: km/h
- rainfall: mm/24h
- storm_surge: m
- elevation: m
- distance_from_coast: km
- distance_from_cyclone_track: km
- historical_flood_exposure: 0.0 to 1.0

Outputs:
- risk_score: continuous 0–100
- risk_category: LOW, MEDIUM, HIGH, CRITICAL
"""

import os
import numpy as np
import pandas as pd

def generate_cyclone_risk_dataset(n_samples: int = 5000, random_state: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    # 1. Geographic & Environmental Features
    # Distance from coast: concentrated near coastal strip with tail inland
    distance_from_coast = rng.exponential(scale=25.0, size=n_samples) + 0.2
    distance_from_coast = np.clip(distance_from_coast, 0.2, 220.0)

    # Elevation: correlated with distance from coast + local terrain variance
    elevation = (
        1.5 + 0.55 * distance_from_coast + rng.lognormal(mean=1.5, sigma=0.8, size=n_samples)
    )
    # Coastal lowlands (first 10km) get lower elevations (0-6m)
    coastal_mask = distance_from_coast < 10
    elevation[coastal_mask] = np.clip(rng.uniform(0.5, 6.0, size=np.sum(coastal_mask)), 0.0, 15.0)
    elevation = np.clip(elevation, 0.0, 300.0)

    # Historical flood exposure (0.0 to 1.0)
    historical_flood_exposure = np.clip(
        0.8 * np.exp(-elevation / 25.0) + rng.normal(0, 0.15, size=n_samples),
        0.0,
        1.0,
    )

    # Distance from cyclone track (km)
    distance_from_cyclone_track = rng.exponential(scale=50.0, size=n_samples) + 1.0
    distance_from_cyclone_track = np.clip(distance_from_cyclone_track, 1.0, 300.0)

    # Core cyclone intensity parameter (Category 1 to Category 5 simulated system)
    cyclone_intensity = rng.choice([1, 2, 3, 4, 5], p=[0.15, 0.25, 0.30, 0.20, 0.10], size=n_samples)

    # Wind speed (km/h) based on cyclone intensity and radial decay with distance from track
    max_core_wind = {
        1: rng.uniform(90, 125, size=n_samples),
        2: rng.uniform(125, 160, size=n_samples),
        3: rng.uniform(160, 200, size=n_samples),
        4: rng.uniform(200, 240, size=n_samples),
        5: rng.uniform(240, 280, size=n_samples),
    }
    base_wind = np.zeros(n_samples)
    for cat in range(1, 6):
        cat_mask = cyclone_intensity == cat
        base_wind[cat_mask] = max_core_wind[cat][cat_mask]

    # Radial decay of wind with distance from track (modified Rankine vortex)
    decay_factor = np.exp(-distance_from_cyclone_track / 90.0)
    wind_speed = base_wind * (0.35 + 0.65 * decay_factor) + rng.normal(0, 5, size=n_samples)
    wind_speed = np.clip(wind_speed, 35.0, 290.0)

    # Rainfall (mm/24h)
    base_rain = 80.0 + 35.0 * cyclone_intensity
    rain_decay = np.exp(-distance_from_cyclone_track / 120.0)
    rainfall = (
        base_rain * (0.3 + 0.7 * rain_decay)
        + 50.0 * historical_flood_exposure
        + rng.gamma(shape=2.5, scale=20.0, size=n_samples)
    )
    rainfall = np.clip(rainfall, 10.0, 650.0)

    # Storm surge (m): high near coast, near landfall, attenuated by elevation
    base_surge = np.maximum(0.0, (cyclone_intensity - 1) * 1.3) + rng.uniform(0.2, 1.0, size=n_samples)
    coastal_surge_decay = np.exp(-distance_from_coast / 12.0)
    track_surge_decay = np.exp(-distance_from_cyclone_track / 60.0)
    storm_surge = base_surge * coastal_surge_decay * track_surge_decay + rng.normal(0, 0.1, size=n_samples)
    storm_surge = np.clip(storm_surge, 0.0, 7.5)

    # 2. Physics-Based Composite Ground Truth Risk Score (0 to 100)
    # Wind risk component (0-35 points)
    wind_comp = 35.0 * np.clip((wind_speed - 50.0) / 190.0, 0.0, 1.0)

    # Surge inundation component (0-35 points)
    surge_vulnerability = np.maximum(0.0, storm_surge - (elevation * 0.4))
    surge_comp = 35.0 * np.clip(surge_vulnerability / 3.5, 0.0, 1.0) * np.exp(-distance_from_coast / 20.0)

    # Pluvial rain & flood exposure component (0-30 points)
    flood_comp = 30.0 * (
        0.55 * np.clip((rainfall - 50.0) / 350.0, 0.0, 1.0)
        + 0.45 * historical_flood_exposure
    ) * np.clip(1.0 - (elevation / 120.0), 0.1, 1.0)

    raw_risk_score = wind_comp + surge_comp + flood_comp + rng.normal(0, 2.0, size=n_samples)
    risk_score = np.round(np.clip(raw_risk_score, 0.0, 100.0), 1)

    # Risk Category based on standard risk thresholds
    # LOW: 0-29, MEDIUM: 30-54, HIGH: 55-79, CRITICAL: 80-100
    risk_category = []
    for score in risk_score:
        if score >= 80.0:
            risk_category.append("CRITICAL")
        elif score >= 55.0:
            risk_category.append("HIGH")
        elif score >= 30.0:
            risk_category.append("MEDIUM")
        else:
            risk_category.append("LOW")

    df = pd.DataFrame({
        "wind_speed": np.round(wind_speed, 1),
        "rainfall": np.round(rainfall, 1),
        "storm_surge": np.round(storm_surge, 2),
        "elevation": np.round(elevation, 1),
        "distance_from_coast": np.round(distance_from_coast, 1),
        "distance_from_cyclone_track": np.round(distance_from_cyclone_track, 1),
        "historical_flood_exposure": np.round(historical_flood_exposure, 3),
        "risk_score": risk_score,
        "risk_category": risk_category,
    })

    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, "dataset.csv")
    print(f"Generating synthetic cyclone baseline dataset for demo training...")
    df = generate_cyclone_risk_dataset(n_samples=6000, random_state=42)
    df.to_csv(out_file, index=False)
    print(f"Saved {len(df)} records to {out_file}")
    print("\nDataset Class Distribution:")
    print(df["risk_category"].value_counts(normalize=True).round(3))
    print("\nDataset Feature Summary:")
    print(df.describe().round(2).to_string())
