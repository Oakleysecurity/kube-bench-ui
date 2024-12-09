from flask import Flask
from flask_cors import CORS
from app.routes.cluster import cluster_bp
from app.routes.scan import scan_bp

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# 注册蓝图
app.register_blueprint(cluster_bp, url_prefix='/api/v1')
app.register_blueprint(scan_bp, url_prefix='/api/v1')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002) 