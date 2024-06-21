from flask import Flask, Response, jsonify, request
import requests
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

API_PUBLIC_KEY = 'wxtiwdek2iftl7r54gu6'
API_SECRET_KEY = 'kqxlrzh8swhoub7qpmbr'

def get_sites():
    url = 'https://api.tildacdn.info/v1/getprojectslist'
    params = {
        'publickey': API_PUBLIC_KEY,
        'secretkey': API_SECRET_KEY
    }
    response = requests.get(url, params=params)
    data = response.json()
    return data

def get_pages(project_id):
    url = 'https://api.tildacdn.info/v1/getpageslist'
    params = {
        'publickey': API_PUBLIC_KEY,
        'secretkey': API_SECRET_KEY,
        'projectid': project_id
    }
    response = requests.get(url, params=params)
    data = response.json()
    return data

@app.route('/', methods=['GET'])
def home():
    return """
    <h1>Welcome to Tilda API!</h1>
    <p>Available endpoints:</p>
    <ul>
        <li><a href="/api/sites">/api/sites</a> - Get list of Tilda sites</li>
        <li>/api/sites/&lt;project_id&gt;/pages - Get list of pages for a specific project</li>
    </ul>
    """

@app.route('/api/sites', methods=['GET'])
def sites():
    data = get_sites()
    # Формируем правильный ответ с корректной кодировкой UTF-8
    response = Response(json.dumps(data, ensure_ascii=False), content_type='application/json; charset=utf-8')
    return response

@app.route('/api/sites/<int:project_id>/pages', methods=['GET'])
def pages(project_id):
    data = get_pages(project_id)
    # Формируем правильный ответ с корректной кодировкой UTF-8
    response = Response(json.dumps(data, ensure_ascii=False), content_type='application/json; charset=utf-8')
    return response

@app.route('/api/tilda/<path:path>', methods=['GET'])
def proxy_tilda_request(path):
    url = f"https://tilda.ws/{path}"
    response = requests.get(url)
    return Response(response.content, status=response.status_code, content_type=response.headers['Content-Type'])

if __name__ == '__main__':
    app.run(debug=True)
