from flask import jsonify, Response
from datetime import datetime
import json

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def success_response(data=None, message="Success"):
    response_data = {
        "code": 200,
        "message": message,
        "data": data
    }
    return Response(
        json.dumps(response_data, cls=DateTimeEncoder),
        mimetype='application/json'
    )

def error_response(message="Error", code=400):
    return jsonify({
        "code": code,
        "message": message,
        "data": None
    }), code 