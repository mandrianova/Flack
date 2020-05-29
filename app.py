import os
from datetime import datetime

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, send

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

users = []
channels = []

messages = {}
names = {'users': users, 'channels': channels}


def get_chat_name(chat_type, chat_n, user_name):
    if chat_type == 'to_user':
        names_chat = [user_name, chat_n]
        names_chat.sort()
        chat_name = '{}_{}'.format(names_chat[0], names_chat[1])
    else:
        chat_name = chat_n
    return chat_name


@app.route("/")
def index():
    return render_template("index.html", users=sorted(users), channels=sorted(channels))


@app.route("/chat/<string:chat_type>/<string:chat_name>")
def chat(chat_type, chat_name):
    if (chat_type == "to_user" and chat_name in users) or (chat_type == "channel" and chat_name in channels):
        return render_template("index.html", users=sorted(users), channels=sorted(channels), chat_name=chat_name)
    else:
        return render_template("index.html", users=sorted(users), channels=sorted(channels), error='chat not found')


@app.route('/has/<string:type_name>', methods=['POST'])
def has_name(type_name):
    if request.form.get('name') in names[type_name]:
        return jsonify({"success": True, 'name': True})
    else:
        return jsonify({"success": True, 'name': False})


@socketio.on("join")
def on_join(data):
    names[data['type_name']].append(data['name'])
    if len(names[data['type_name']]) > 100:
        del names[data['type_name']][0]
    emit("joined", {'users': sorted(users), 'channels': sorted(channels)}, broadcast=True)


@socketio.on("send")
def send_message(data):
    if data['user_name'] and data['chat_type'] and data['chat']:
        chat_name = get_chat_name(data['chat_type'], data['chat'], data['user_name'])
        if not messages.get(chat_name):
            messages[chat_name] = []
        messages[chat_name].append({'date': data['date'], 'user': data['user_name'], 'message': data['message']})
        if len(messages[chat_name]) > 100:
            del messages[chat_name][0]
        emit("chat", {'chat': chat_name}, broadcast=True)
    else:
        emit("error", {'error': "Please, log in and select chat."})


@socketio.on("delete_message")
def delete_message(data):
    if data['user_name'] and data['chat_type'] and data['chat']:
        chat_name = get_chat_name(data['chat_type'], data['chat'], data['user_name'])
        message_id = int(data['id'])
        if messages.get(chat_name) and messages[chat_name][message_id]:
            del messages[chat_name][message_id]
            emit('chat', {"chat": chat_name}, broadcast=True)
        else:
            emit("error", {'error': "Message not found."})
    else:
        emit("error", {'error': "Please, log in and select chat."})


@app.route('/api/chat/<string:chat_name>', methods=['GET'])
def get_messages(chat_name):
    if not request.args.get('chat_type') or not request.args.get('user_name'):
        return jsonify({"success": False, 'error': "Invalid data"})
    if request.args.get('chat_type') == 'to_user':
        names_chat = [chat_name, request.args.get('user_name')]
        names_chat.sort()
        chat_name = '{}_{}'.format(names_chat[0], names_chat[1])
    if not messages.get(chat_name):
        messages[chat_name] = []
    return jsonify({"success": True, 'messages': messages[chat_name]})
