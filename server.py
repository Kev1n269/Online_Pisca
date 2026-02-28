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
players_sid_reverse={}
game_started={}
host={}



def process_play(room, player_id, card): 
    try:
        output = games[room].play_card(card)
        output_type, output_data=output["type"], output["content"]
        if output_type!="trade":
            if players_type[room][player_id]=="player":
                socketio.emit('player-play-card',card['id'], to=players_sid_reverse[room][player_id])
            socketio.emit('play-card', {'card': card['id'], 'next_player': games[room].current_player_number, "score": games[room].global_score}, room=room)
        if output_type=="game over":
            print(f"Fim de jogo! na room {room}\n jogadores {output_data[0]} e {output_data[1]} ganharam!")
            socketio.emit ('end-game', output_data, room=room)
            games[room]=game()
        elif output_type=="round over":
            socketio.emit('end-round',output_data, room=room)
        elif output_type=="hand over": 
            socketio.emit('end-hand', output_data, room=room)
        elif output_type=="trade":
            socketio.emit('trade', output_data, room=room)
            if players_type[room][player_id]=="player":
                socketio.emit('trade-player-card', output_data, to=players_sid_reverse[room][player_id])
        return output_type
    except ValueError as e:
        if players_type[room][player_id]=="player":
            print("erro: ", e)
            socketio.emit('illegal-play', card, to=players_sid_reverse[room][player_id])
        return "illegal-play"

def bot_turn(room, player_id):
    hand=games[room].players[player_id]
    trunfo=games[room].trunfo
    table_deck=games[room].table_deck
    card=bots[players_type[room][player_id]](hand,table_deck,trunfo)
    output_type=process_play(room, player_id, card)
    next_player=games[room].current_player_number
    if players_type[room][next_player]!="player" and output_type not in ("game over", "round over"): 
        socketio.start_background_task(bot_turn,room,next_player)


@socketio.on("join_room")
def handle_join(data):
    room=data['room']
    print(f"inciando entrada na sala {room}...")
    join_room(room)
    if room not in games:
        players_id[room]=[]
        games[room]=None
        players_type[room]=["medium_bot","medium_bot","medium_bot","medium_bot"]
        game_started[room]=False
        players_sid_reverse[room]={}
        host[room]=0
    is_full=True
    for id in range(4): 
        if id not in players_id[room] or players_type[room][id]!="player":
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
    players_sid_reverse[room][player_id]= request.sid
    emit('inital-data', {"id": player_id, "is_host": host[room]==player_id, "game_starded": game_started[room]})
    emit('new-player', player_id, room=room, broadcast=True)
    if game_started[room]:
        emit('get-game-state', games[room].get_general_state())
    print("sucesso!\n ID:",player_id)
    
@socketio.on('start_game')
def start_game(room):
    if room not in games:
        print("sala não encontrada")
        emit("error",{
            'message': 'sala nao existe',
            'code': "ROOM_NOT_FOUND"  
        })
        return
    games[room]=game(host[room])
    game_started[room]=True
    emit('shuffle', room=room)
    emit('get-game-state', games[room].get_general_state())
    current_player=games[room].current_player_number
    if players_type[room][current_player] !="player": 
        socketio.start_background_task(bot_turn, room, current_player)

@socketio.on('play_card')
def play_card(data):
    if data['room'] not in games:
        emit('error',{
             'message': 'sala nao existe',
             'code': "ROOM_NOT_FOUND"   
        })
        return
    if data['player_id']!=games[data["room"]].current_player_number:
        emit('error',{
            'message': 'não é a vez desse jogador',
             'code': "INCORRECT_PLAYER"   
        })
        return
    output_type=process_play(data["room"], data["player_id"], data["card"])     
    next_player=games[data['room']].current_player_number
    if players_type[data['room']][next_player]!="player" and output_type not in("game over","round over"): 
        socketio.start_background_task(bot_turn,data['room'],next_player)

@socketio.on('end_round')
def handle_end_round(room): 
    emit('shuffle', room=room)
    emit('get-game-state', games[room].get_general_state())
    next_player=games[room].current_player_number
    if players_type[room][next_player]!="player": 
        socketio.start_background_task(bot_turn,room,next_player)

@socketio.on('finish_game')
def handle_finish_game(room): 
    game_started[room]=False
    games[room]=None

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid not in players_sid:
        print("Jogador não encontrado")
        return 
    room, id=players_sid[request.sid]["room"],players_sid[request.sid]["id"]
    del players_id[room][id] 
    del players_sid_reverse[room][id]
    leave_room(room)
    del players_sid[request.sid]
    players_type[room][id]="medium_bot"
    print(f"jogador com id {id} na sala {room} desconectado")
    if not players_id[room]: 
        game_started[room]=False
        games[room]=None
    elif host[room]==id:
        for idx in range(4):
            if players_type[room][idx]=='player':
                host[room]=idx
                socketio.emit('to-host', to=players_sid_reverse[room][idx])
                break
        
@app.route("/")
def index():
    return render_template("index.html") 

@app.route("/game")
def game_page():
    return render_template("game.html")


if __name__ ==  '__main__':
    socketio.run(app, debug=True, port=8080)