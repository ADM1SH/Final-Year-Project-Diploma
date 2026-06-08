import streamlit as st
import pandas as pd
import numpy as np
import joblib
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Set page config
st.set_page_config(
    page_title="MyPreLove - AI Pricing Engine",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Forest Green Theme)
st.markdown("""
    <style>
        .main {
            background-color: #f7fafc;
        }
        h1, h2, h3 {
            color: #064E3B !important;
            font-family: 'Inter', sans-serif;
        }
        .stButton>button {
            background-color: #064E3B;
            color: white;
            border-radius: 8px;
            border: none;
            padding: 10px 24px;
            font-weight: bold;
        }
        .stButton>button:hover {
            background-color: #047857;
            color: white;
        }
        .metric-card {
            background-color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-left: 5px solid #064E3B;
            margin-bottom: 20px;
        }
        .metric-val {
            font-size: 28px;
            font-weight: bold;
            color: #1a202c;
        }
        .metric-label {
            font-size: 14px;
            color: #718096;
            text-transform: uppercase;
        }
    </style>
""", unsafe_allow_html=True)

# Helper function to load the model
@st.cache_resource
def load_model():
    model_path = os.path.join(BASE_DIR, "price_predictor_model.joblib")
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None

# Helper function to load metadata
@st.cache_data
def load_metadata():
    meta_path = os.path.join(BASE_DIR, "model_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            return json.load(f)
    return None

# Helper function to load feature importances
@st.cache_data
def load_importances():
    imp_path = os.path.join(BASE_DIR, "feature_importances.csv")
    if os.path.exists(imp_path):
        return pd.read_csv(imp_path)
    return None

# Load resources
model = load_model()
metadata = load_metadata()
importances = load_importances()

# Header
st.title("🌱 MyPreLove AI Fair-Value Pricing Engine")
st.markdown("---")

col1, col2 = st.columns([2, 3])

with col1:
    st.header("🔍 Fair-Value Calculator")
    st.write("Enter listing details to estimate fair market value and check for over/underpricing.")
    
    # 1. Inputs
    category = st.selectbox("Category", ["Tech", "Fashion", "Books"])
    
    # Dynamic brand options
    brand_options = {
        "Tech": ["Apple", "Samsung", "Sony", "Dell", "Asus"],
        "Fashion": ["Nike", "Adidas", "Gucci", "Chanel"],
        "Books": ["Pearson", "Oxford", "Penguin"]
    }
    brand = st.selectbox("Brand", brand_options[category])
    
    original_price = st.number_input("Original Retail Price (RM)", min_value=1.0, max_value=20000.0, value=2500.0, step=50.0)
    
    condition_score = st.slider(
        "Condition Score (1-10)", 
        min_value=1.0, 
        max_value=10.0, 
        value=8.0, 
        step=0.5,
        help="1: Poor/Broken, 5: Fair/Usable, 8: Good/Excellent, 10: Like New/Sealed"
    )
    
    duration_days = st.slider(
        "Listed Duration (Days)", 
        min_value=1, 
        max_value=90, 
        value=5,
        help="How long the listing has been active on the platform."
    )
    
    # Optional test price to check for overpricing
    proposed_price = st.number_input(
        "Your Proposed Selling Price (RM)", 
        min_value=0.0, 
        max_value=20000.0, 
        value=0.0, 
        step=10.0,
        help="Enter a test price to check if it's fair, underpriced, or overpriced."
    )

with col2:
    st.header("📈 Model Prediction & Analysis")
    
    if model is None:
        st.error("Error: Model file `price_predictor_model.joblib` not found. Please run the training pipeline first.")
    else:
        # Run prediction
        input_data = pd.DataFrame([{
            "category": category,
            "brand": brand,
            "condition_score": condition_score,
            "duration_days": duration_days,
            "original_price": original_price
        }])
        
        predicted_price = model.predict(input_data)[0]
        predicted_price = max(0.0, round(predicted_price, 2))
        
        # Display Predicted Price
        st.markdown(f"""
            <div style="background-color: #ECFDF5; border: 2px solid #059669; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <h3 style="margin: 0; color: #065F46; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Fair Market Value</h3>
                <span style="font-size: 42px; font-weight: bold; color: #064E3B; font-family: 'Courier New', monospace;">RM {predicted_price:,.2f}</span>
            </div>
        """, unsafe_allow_html=True)
        
        # Display Pricing Status if proposed price is set
        if proposed_price > 0:
            diff_ratio = (proposed_price / predicted_price) - 1.0
            
            if diff_ratio > 0.15:
                # Overpriced
                st.markdown(f"""
                    <div style="background-color: #FEF2F2; border: 2px solid #EF4444; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                        <h4 style="margin: 0; color: #991B1B;">⚠️ Overpriced (+{diff_ratio*100:.1f}%)</h4>
                        <p style="margin: 5px 0 0 0; color: #7F1D1D; font-size: 14px;">
                            Your price is significantly higher than the fair market valuation. Listings at this price remain on the platform longer (typically over 30 days) and usually require substantial price drops to sell.
                        </p>
                    </div>
                """, unsafe_allow_html=True)
            elif diff_ratio < -0.15:
                # Underpriced
                st.markdown(f"""
                    <div style="background-color: #EFF6FF; border: 2px solid #3B82F6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                        <h4 style="margin: 0; color: #1E40AF;">💡 Underpriced ({diff_ratio*100:.1f}%)</h4>
                        <p style="margin: 5px 0 0 0; color: #1E3A8A; font-size: 14px;">
                            Your price is below fair market value. While this listing will sell very quickly, you are potentially leaving money on the table.
                        </p>
                    </div>
                """, unsafe_allow_html=True)
            else:
                # Fair
                st.markdown(f"""
                    <div style="background-color: #F0FDF4; border: 2px solid #22C55E; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                        <h4 style="margin: 0; color: #166534;">✅ Fair Market Price ({diff_ratio*100:+.1f}%)</h4>
                        <p style="margin: 5px 0 0 0; color: #14532D; font-size: 14px;">
                            Perfect! Your proposed price is highly aligned with historical sales data for this category, brand, and condition.
                        </p>
                    </div>
                """, unsafe_allow_html=True)

        # Model Performance Cards
        st.subheader("📊 Model Performance Metrics")
        if metadata:
            m_col1, m_col2, m_col3 = st.columns(3)
            with m_col1:
                st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Model Architecture</div>
                        <div class="metric-val" style="font-size: 20px;">{metadata.get('model_type', 'XGBoost')}</div>
                    </div>
                """, unsafe_allow_html=True)
            with m_col2:
                st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Model Accuracy (R²)</div>
                        <div class="metric-val">{metadata.get('r2_score', 0.0)*100:.2f}%</div>
                    </div>
                """, unsafe_allow_html=True)
            with m_col3:
                st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Mean Absolute Error</div>
                        <div class="metric-val">RM {metadata.get('mae', 0.0):.2f}</div>
                    </div>
                """, unsafe_allow_html=True)

        # Feature Importance Chart
        if importances is not None:
            st.subheader("🔑 Feature Importance")
            st.write("How much each input feature contributes to the final price prediction:")
            chart_df = importances.head(8).set_index("feature")
            st.bar_chart(chart_df["importance"], color="#047857")

st.markdown("---")
st.header("📁 Sample Marketplace Data")
st.write("Here is a preview of the dataset used to train the pricing model (listing prices vs. actual sold prices):")

dataset_csv = os.path.join(BASE_DIR, "listings_dataset.csv")
if os.path.exists(dataset_csv):
    preview_df = pd.read_csv(dataset_csv).head(15)
    st.dataframe(preview_df, use_container_width=True)
else:
    st.warning("Dataset preview unavailable.")
