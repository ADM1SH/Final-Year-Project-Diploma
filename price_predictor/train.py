import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

# Import XGBoost if available, otherwise fall back gracefully
try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except (ImportError, Exception):
    HAS_XGB = False

def train_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "listings_dataset.csv")
    model_output_path = os.path.join(base_dir, "price_predictor_model.joblib")
    
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}. Run generate_dataset.py first.")
        return
        
    # 1. Load data
    df = pd.read_csv(dataset_path)
    print(f"Loaded {df.shape[0]} rows of data.")
    
    # 2. Split features and target
    # We predict the 'sold_price' (fair value) based on item attributes
    X = df[["category", "brand", "condition_score", "duration_days", "original_price"]]
    y = df["sold_price"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 3. Define preprocessing
    categorical_features = ["category", "brand"]
    numeric_features = ["condition_score", "duration_days", "original_price"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )
    
    # 4. Instantiate model
    if HAS_XGB:
        print("Using XGBoost Regressor...")
        model = XGBRegressor(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42)
    else:
        print("XGBoost not found. Using Random Forest Regressor fallback...")
        model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
        
    # 5. Create pipeline
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", model)
        ]
    )
    
    # 6. Train model
    print("Training model pipeline...")
    pipeline.fit(X_train, y_train)
    
    # 7. Evaluate model
    y_pred = pipeline.predict(X_test)
    
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print("\n=== Model Evaluation ===")
    print(f"R² Score (Accuracy): {r2:.4f}")
    print(f"Mean Absolute Error (MAE): RM {mae:.2f}")
    print(f"Root Mean Squared Error (RMSE): RM {rmse:.2f}")
    
    # 8. Save model
    print(f"\nSaving model pipeline to: {model_output_path}")
    joblib.dump(pipeline, model_output_path)
    
    # Write metadata info to display in Streamlit
    metadata = {
        "model_type": "XGBoost Regressor" if HAS_XGB else "Random Forest Regressor",
        "r2_score": r2,
        "mae": mae,
        "rmse": rmse,
        "features": list(X.columns)
    }
    
    metadata_path = os.path.join(base_dir, "model_metadata.json")
    import json
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)
    print(f"Metadata exported to {metadata_path}")
    
    # 9. Extract and save Feature Importance for dashboard
    try:
        # Get feature names after one-hot encoding
        ohe = pipeline.named_steps["preprocessor"].named_transformers_["cat"]
        cat_feature_names = list(ohe.get_feature_names_out(categorical_features))
        all_features = numeric_features + cat_feature_names
        
        # Get importances
        regressor = pipeline.named_steps["regressor"]
        importances = regressor.feature_importances_
        
        feature_imp_df = pd.DataFrame({
            "feature": all_features,
            "importance": importances
        }).sort_values(by="importance", ascending=False)
        
        feature_imp_df.to_csv(os.path.join(base_dir, "feature_importances.csv"), index=False)
        print("Feature importances exported successfully.")
    except Exception as e:
        print(f"Warning: Could not extract feature importances: {e}")

if __name__ == "__main__":
    train_model()
