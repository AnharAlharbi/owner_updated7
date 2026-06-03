import os

class Config:
    """Configuration settings for the application"""
    
    # File paths
    DATA_FOLDER = os.environ.get('INVOICE_DATA_FOLDER', 'data')
    MODEL_PATH = 'models/'
    
    # Model parameters
    DEFAULT_CLUSTERS = 5
    PREDICTION_WINDOW_MONTHS = 3
    
    # Business rules
    SPENDING_WARNING_THRESHOLD = 40
    SPENDING_TREND_THRESHOLD = 30
    HIGH_TRANSACTION_THRESHOLD = 50
    LOW_AVG_TRANSACTION_THRESHOLD = 20
    
    # API settings
    DEBUG = os.environ.get('DEBUG', False)
    HOST = '0.0.0.0'
    PORT = 5001  # <--- غير هذا
    
    # Profit calculation
    ESTIMATED_COST_PERCENTAGE = 0.65