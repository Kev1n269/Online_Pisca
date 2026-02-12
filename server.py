from flask import Flask, render_template, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room 
from python.bisca_logic import game
from python.bots import easy_bot, medium_bot, hard_bot

app=Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

games={}
games_players={}

@socketio.on("join_room")
def handle_join(data):
    room=data['room']
    join_room(room)
    if room not in games:
        games[room]=game()
        games_players[room]=1
    player_id=games_players[room]-1
    emit('player_state', games[room].get_player_state(player_id))
    

@socketio.on('play_card')
def play_card(data):
    if not games[data["room"]]:
        pass


@app.route("/")
def index():
    return render_template("index.html") 

@app.route("/game")
def game_page():
    return render_template("game.html")


if __name__ ==  '__main__':
    socketio.run(app, debug=True, port=8080)