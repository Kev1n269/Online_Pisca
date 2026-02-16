from flask import Flask, render_template, redirect, url_for, request
from flask_socketio import SocketIO, emit, join_room, leave_room 
from python.bisca_logic import game
from python.bots import easy_bot, medium_bot, hard_bot

app=Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

bots={"easy_bot": easy_bot, "medium_bot": medium_bot,"hard_bot": hard_bot}
games={}
players_id={}
players_type={}
players_sid={}

@socketio.on("join_room")
def handle_join(data):
    room=data['room']
    print(f"inciando entrada na sala {room}...")
    join_room(room)
    if room not in games:
        games[room]=game()
        players_id[room]=[]
        players_type[room]=["medium_bot","medium_bot","medium_bot","medium_bot"]
    is_full=True
    for id in range(4): 
        if id not in players_id[room]:
            players_id[room].append(id)
            player_id=id
            is_full=False
            break
    if is_full:
        emit("full-room", room)
        print('full room', room)
        return
    players_type[room][id]="player"
    for id in players_id[room]:
        if id != player_id:
            emit('new-player', id)
    players_sid[request.sid]={
        "room": room,
        "id": player_id
    }
    emit('player-id', player_id)
    emit('new-player', player_id, room=room, broadcast=True)
    emit('get-game-state', games[room].get_general_state())
    print("sucesso!\n ID:",player_id)
    

@socketio.on('play_card')
def play_card(data):
    if data['room'] not in games:
        emit('error',{
            'message': 'sala nao existe',
             'code': "ROOM_NOT_FOUND"   
        })
        return
    room = data['room']
    if data['player_id']!=games[room].current_player_number:
        emit('error',{
            'message': 'nâo e a vez desse jogador',
             'code': "INCORRECT_PLAYER"   
        })
        return
    if data['player_type']!="human":
        data['card']=bots[data['player_type']]()
    try:
        output = games[room].play_card(data['card'])
        output_type, output_data=output["type"], output["content"]
        if output_type=="game over":
            print(f"Fim de jogo! na room {room}\n jogadores {output_data[0]} e {output_data[1]} ganharam!")
            emit ('end-game', output_data, room=room)
            games[room]=game()
        elif output_type=="round over":
            emit('end-round',output_data, room=room)
        elif output_type=="hand over": 
            emit('end-hand', output_data, room=room)
        elif output_type=="trade":
            emit('trade', output_data, room=room)
        emit('play-card', room=room, broadcast=True)
    except ValueError as e:
        print("erro: ", e)
        emit('illegal-play', e)


@socketio.on('disconnect')
def handle_disconnect():
    if request.sid not in players_sid:
        print("Jogador não encontrado")
        return 
    room, id=players_sid[request.sid]["room"],players_sid[request.sid]["id"] 
    del players_id[room][id]
    del players_sid[request.sid]
    players_type[room][id]="medium_bot"
    print(f"jogador com id {id} na sala {room} desconectado")
        
@app.route("/")
def index():
    return render_template("index.html") 

@app.route("/game")
def game_page():
    return render_template("game.html")


if __name__ ==  '__main__':
    socketio.run(app, debug=True, port=8080)