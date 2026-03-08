from bisca_logic import game
from bots import easy_bot, medium_bot, hard_bot
print("Iniciando jogo...")
bisca=game()

def print_hand(player):
    for card in bisca.players[player]:
        print(f"{card["number"]}{card["naipe"]}", end=", ")
    print()

def transform(naipe):
    if naipe=='c':
        return '♥'
    if naipe=='p':
        return '♣'
    if naipe=='o':
        return '♦'
    if naipe=='e':
        return '♠'
    return naipe

for i in range(1,5):
    print(f"Mão do jogador {i}", end=": ")
    print_hand(i-1)

    players_type=["medium-bot","hard-bot","medium-bot","hard-bot"]

def have(number, naipe, hand):
    for i in range(len(hand)):
          if hand[i]['number']==number and hand[i]['naipe']==naipe:
               return True, i
    return False, None

def is_valid(card, hand, played_7, deck_size, trunfo, hand_size=None):
    if hand_size is None:
        hand_size=len(hand)
    if card["naipe"]==trunfo:
            if card["number"]=='7' and deck_size==3 and (hand_size==3 or (not have('A', trunfo, hand)[0] and hand_size==2)):  
                return False
            if card["number"]=='A' and not played_7 and hand_size!=1: 
                return False
    print(card["naipe"]==trunfo)
    print(card["number"]=='7')
    print(deck_size==3)
    print((hand_size==3 or (have('A', trunfo, hand)[0] and hand_size==2)))
    return True

team_medium=0
team_easy=0
tests=1e4
total=tests
while tests>0:
    tests-=1 
    bisca=game()
    if tests%1000==0:
        print(f"game number {total-tests}")
    while True:
        this_type=players_type[bisca.current_player_number]
        card={'number': 0, 'naipe': 0}
        if this_type=="easy-bot":
            try:
                card=easy_bot(bisca.players[bisca.current_player_number], bisca.table_deck, bisca.trunfo, bisca.played_7, len(bisca.deck), bisca.played_cards)
            except ValueError as e:
                print(f"erro: {e}")
                quit()
                continue 
            number,naipe=card["number"], card["naipe"]
        elif this_type=="medium-bot":
            try:
                card=medium_bot(bisca.players[bisca.current_player_number], bisca.table_deck, bisca.trunfo, bisca.played_7, len(bisca.deck), bisca.played_cards)
            except ValueError as e:
                print(f"erro: {e}")
                quit()
            if card is None:
                continue 
            number,naipe=card["number"], card["naipe"]
        elif this_type=="hard-bot":
            card=hard_bot(bisca.players[bisca.current_player_number], bisca.table_deck, bisca.trunfo, bisca.played_7, len(bisca.deck), bisca.played_cards, bisca.team_score, bisca.global_score,  bisca.current_player_number%2, bisca.trunfo_card)
            bisca.players[bisca.current_player_number]
            number,naipe=card["number"], card["naipe"]
        elif this_type=="player":
            try: 
                card_number=int(input("Escolha sua carta: "))-1
                player=bisca.players[bisca.current_player_number][card_number]
                number,naipe=player["number"],transform(player["naipe"])
            except KeyboardInterrupt:
                quit()
            except:
                print("erro: número inválido")
                continue 

        try:
            output=bisca.play_card(card)
            if output:
                output_type, players=output['type'], output['content']
                if output_type=="game over":
                    if players['winners'][0]%2==0:
                        team_medium+=1
                    else:
                        team_easy+=1
                    break
        except ValueError as e:
            print("erro:", e)
            print(bisca.trunfo)
            print(bisca.current_player_number)
            print(len(bisca.table_deck))
            for c in bisca.players[bisca.current_player_number]:
                print(c)
            #card, hand, played_7, deck_size, trunfo, hand_size=None
            print(is_valid(card,bisca.players[bisca.current_player_number],bisca.played_7, len(bisca.table_deck), bisca.trunfo))
            quit()

print("time dos bots difíceis:",team_medium)
print("time dos bots médios:",team_easy)