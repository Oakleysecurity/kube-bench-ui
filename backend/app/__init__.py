from flask import Flask
from flask_cors import CORS
from app.routes.cluster import cluster_bp
from app.routes.scan import scan_bp

def create_app():
    app = Flask(__name__)
    CORS(app, 
         resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Accept"],
         methods=["GET", "POST", "OPTIONS"])

    # 注册蓝图
    app.register_blueprint(cluster_bp, url_prefix='/api/v1')
    app.register_blueprint(scan_bp, url_prefix='/api/v1')

    return app 