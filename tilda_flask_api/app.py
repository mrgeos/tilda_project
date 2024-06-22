from flask import Flask, Response, jsonify, request
import requests
import json
from flask_cors import CORS
import os

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

def get_page_data(page_id):
    url = 'https://api.tildacdn.info/v1/getpagefullexport'
    params = {
        'publickey': API_PUBLIC_KEY,
        'secretkey': API_SECRET_KEY,
        'pageid': page_id
    }
    response = requests.get(url, params=params)
    data = response.json()
    return data

def save_file(url, path):
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
    else:
        print(f"Failed to download {url}")

@app.route('/', methods=['GET'])
def home():
    return """
    <h1>Welcome to Tilda API!</h1>
    <p>Available endpoints:</p>
    <ul>
        <li><a href="/api/sites">/api/sites</a> - Get list of Tilda sites</li>
        <li>/api/sites/&lt;project_id&gt;/pages - Get list of pages for a specific project</li>
        <li>/api/download/page/&lt;page_id&gt; - Download page data as JSON</li>
    </ul>
    """

@app.route('/api/sites', methods=['GET'])
def sites():
    data = get_sites()
    response = Response(json.dumps(data, ensure_ascii=False), content_type='application/json; charset=utf-8')
    return response

@app.route('/api/sites/<int:project_id>/pages', methods=['GET'])
def pages(project_id):
    data = get_pages(project_id)
    response = Response(json.dumps(data, ensure_ascii=False), content_type='application/json; charset=utf-8')
    return response

@app.route('/api/download/page/<int:page_id>', methods=['GET'])
def download_page(page_id):
    data = get_page_data(page_id)
    if not data.get('result'):
        return jsonify({'error': 'Page data not found or incomplete.'}), 404

    result = data['result']
    filtered_result = {
        'html': result.get('html'),
        'images': result.get('images', []),
        'css': result.get('css', []),
        'js': result.get('js', [])
    }

    # Save CSS and JS files
    if not os.path.exists('static/css'):
        os.makedirs('static/css')
    if not os.path.exists('static/js'):
        os.makedirs('static/js')

    for css in filtered_result['css']:
        save_file(css['from'], f"static/css/{css['to']}")

    for js in filtered_result['js']:
        save_file(js['from'], f"static/js/{js['to']}")

    response = Response(json.dumps(filtered_result, ensure_ascii=False), content_type='application/json; charset=utf-8')
    return response

if __name__ == '__main__':
    app.run(debug=True)
